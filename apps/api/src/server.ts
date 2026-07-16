/**
 * Mozaika API — serwer HTTP (Hono).
 * Wystawia operacje domenowe pod `/api/*` oraz serwuje frontend PWA z `public/`.
 * Uwierzytelnianie: JWT (Bearer). Błędy domenowe mapowane na kody HTTP (400/401/404).
 */
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Context, MiddlewareHandler } from "hono";
import { sign, verify } from "hono/jwt";

import { prisma } from "./db.js";
import {
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  ValidationError,
} from "./errors.js";
import { login, register } from "./logic/auth.js";
import { rateLimit, rateLimitReset } from "./logic/rateLimit.js";
import { addBookFromOpenLibrary, searchBooks } from "./logic/books.js";
import { getDescription, getTrailer } from "./logic/details.js";
import { addGameFromRawg, searchGames } from "./logic/games.js";
import { addFromAniList, searchAniList } from "./logic/anilist.js";
import { addMusicFromItunes, searchMusic } from "./logic/music.js";
import {
  pushEnabled,
  pushPublicKey,
  removePushSubscription,
  savePushSubscription,
  sendPushToUser,
} from "./logic/push.js";
import { checkPremieres, ensureReleaseDate, upcomingForUser } from "./logic/premieres.js";
import { addReview, deleteReview } from "./logic/reviews.js";
import { react, reactionScore, reactionSummary } from "./logic/reactions.js";
import { profilePayload } from "./logic/profile.js";
import {
  conversation,
  conversations,
  deleteMessage,
  editMessage,
  reactToMessage,
  sendMessage,
} from "./logic/messages.js";
import {
  listNotifications,
  markAllRead,
  notifyFollow,
  unreadCount,
} from "./logic/notifications.js";
import { recommendations } from "./logic/recommendations.js";
import { tasteMatch } from "./logic/tasteMatch.js";
import { togetherPicks } from "./logic/together.js";
import { tastePortrait } from "./logic/tasteProfile.js";
import { invalidateDiscoveryCache, tasteDiscovery } from "./logic/discovery.js";
import { addMediaFromTmdb, searchTmdb } from "./logic/tmdb.js";

// Sekret do podpisu tokenów. Fallback istnieje TYLKO dla wygody lokalnej — na
// produkcji jest zakazany: gdyby serwer podpisywal tokeny stringiem znanym z kodu,
// kazdy moglby podrobic token dowolnego uzytkownika. Dlatego przy NODE_ENV=production
// brak JWT_SECRET wywala start (fail-closed) zamiast po cichu uzyc fallbacku.
const JWT_SECRET = (() => {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET nie jest ustawiony — ustaw go w env produkcji (panel Render). " +
        "Bez tego tokeny bylyby podpisane sekretem znanym z kodu.",
    );
  }
  return "mozaika-dev-secret-ustaw-JWT_SECRET";
})();
const TOKEN_TTL = 60 * 60 * 24 * 30; // 30 dni

type Vars = { Variables: { userId: number } };

const app = new Hono();
const api = new Hono<Vars>();

/** Parsuje parametr ścieżki na dodatnią liczbę całkowitą lub rzuca ValidationError. */
function intParam(value: string, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError(`Parametr ${name} musi być dodatnią liczbą całkowitą.`);
  }
  return n;
}

function makeToken(userId: number): Promise<string> {
  const payload = { userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL };
  return sign(payload, JWT_SECRET, "HS256");
}

/** Odczytuje userId z nagłówka Bearer. null = brak tokenu albo token niepoprawny. */
async function userIdFromHeader(c: Context<Vars>): Promise<number | null> {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    return Number(payload.userId);
  } catch {
    return null;
  }
}

/** Wymaga poprawnego tokenu JWT; zapisuje userId w kontekście. */
const requireAuth: MiddlewareHandler<Vars> = async (c, next) => {
  const userId = await userIdFromHeader(c);
  if (userId === null) return c.json({ error: "Wymagane logowanie." }, 401);
  c.set("userId", userId);
  await next();
};

// Health + wersja. `commit` odpowiada na pytanie „czy mój push już wszedł?" bez
// zaglądania do panelu Render — inaczej jedynym sposobem jest porównywanie
// zawartości plików z produkcji z lokalnymi. Render wystawia RENDER_GIT_COMMIT
// sam; lokalnie zmiennej nie ma, więc leci "dev".
api.get("/health", (c) =>
  c.json({ status: "ok", commit: process.env.RENDER_GIT_COMMIT ?? "dev" }),
);

// --- Uwierzytelnianie ---

/** Adres klienta zza proxy Rendera/Cloudflare (do kluczy limitera). */
function clientIp(c: Context<Vars>): string {
  const fwd = c.req.header("x-forwarded-for") ?? "";
  return fwd.split(",")[0]?.trim() || "unknown";
}

/**
 * Dławi próby logowania/rejestracji z jednego adresu — bez tego hasło da się
 * zgadywać na siłę. 10 prób na 5 minut: człowiekowi z literówką nie przeszkadza,
 * a atak słownikowy zatrzymuje. Po udanym logowaniu licznik kasujemy.
 */
const AUTH_MAX = 10;
const AUTH_WINDOW_MS = 5 * 60 * 1000;
function guardAuth(c: Context<Vars>): string {
  const key = `auth:${clientIp(c)}`;
  const { allowed, retryAfter } = rateLimit(key, AUTH_MAX, AUTH_WINDOW_MS);
  if (!allowed) {
    throw new TooManyRequestsError(`Za dużo prób. Spróbuj ponownie za ${retryAfter} s.`);
  }
  return key;
}

api.post("/auth/register", async (c) => {
  guardAuth(c);
  const user = await register(await c.req.json());
  return c.json({ token: await makeToken(user.id), user }, 201);
});

api.post("/auth/login", async (c) => {
  const key = guardAuth(c);
  const user = await login(await c.req.json());
  rateLimitReset(key); // udane logowanie nie ma karać kolejnych prób
  return c.json({ token: await makeToken(user.id), user });
});

// Profil zalogowanego użytkownika + jego oceny i statystyki.
api.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  return c.json(await profilePayload(userId, userId, true));
});

api.get("/me/recommendations", requireAuth, async (c) => {
  return c.json(await recommendations(c.get("userId")));
});

// Odkrywanie pod gust — ORYGINALNE, świeże tytuły z zewnątrz (nie z katalogu).
// ?type=film|anime|manga|game — zawęża do jednego rodzaju (zakładka na froncie).
api.get("/me/discover", requireAuth, async (c) => {
  const type = c.req.query("type");
  return c.json(await tasteDiscovery(c.get("userId"), undefined, type));
});

// Portret gustu — top gatunki/typy/dekady + „surowość" vs średnia serwisu.
api.get("/me/taste-portrait", requireAuth, async (c) => {
  return c.json(await tastePortrait(c.get("userId")));
});

// Ustaw zdjęcie profilowe (data:image, skompresowane po stronie klienta).
api.post("/me/avatar", requireAuth, async (c) => {
  const body = await c.req.json();
  const avatarUrl = String(body.avatarUrl ?? "");
  if (!avatarUrl.startsWith("data:image/") || avatarUrl.length > 600000) {
    throw new ValidationError("Nieprawidłowy obraz (dozwolone data:image, do ~400 KB).");
  }
  await prisma.user.update({ where: { id: c.get("userId") }, data: { avatarUrl } });
  return c.json({ avatarUrl });
});

// Przypnij/odepnij tytuł do TOP 4 (wymaga wcześniejszej oceny; max 4 ulubione).
api.post("/me/favorite", requireAuth, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();
  const mediaId = Number(body.mediaId);
  const favorite = Boolean(body.favorite);
  const review = await prisma.review.findUnique({
    where: { userId_mediaId: { userId, mediaId } },
  });
  if (!review) {
    throw new NotFoundError("Najpierw oceń ten tytuł, żeby dodać go do TOP 4.");
  }
  if (favorite && !review.favorite) {
    const count = await prisma.review.count({ where: { userId, favorite: true } });
    if (count >= 4) {
      throw new ValidationError("Masz już 4 ulubione — najpierw odepnij inny tytuł.");
    }
  }
  await prisma.review.update({
    where: { userId_mediaId: { userId, mediaId } },
    data: { favorite },
  });
  return c.json({ favorite });
});

// Dodaj tytuł do listy „do obejrzenia/zagrania".
api.post("/me/watchlist", requireAuth, async (c) => {
  const userId = c.get("userId");
  const mediaId = Number((await c.req.json()).mediaId);
  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    throw new ValidationError("Nieprawidłowy mediaId.");
  }
  await prisma.watchlistItem.upsert({
    where: { userId_mediaId: { userId, mediaId } },
    update: {},
    create: { userId, mediaId },
  });
  // Datę premiery dociągamy od razu, żeby niewydany tytuł wskoczył do sekcji
  // „Nadchodzące" natychmiast, a nie dopiero po nocnym cronie. Gdy API nie
  // odpowie, trudno — dodanie do listy i tak ma się udać, a cron spróbuje znowu.
  await ensureReleaseDate(mediaId).catch(() => {});
  return c.json({ ok: true });
});

// Tytuły z listy, które jeszcze nie wyszły („Nadchodzące" na ekranie głównym).
api.get("/me/upcoming", requireAuth, async (c) =>
  c.json(await upcomingForUser(c.get("userId"))),
);

// Usuń tytuł z listy.
api.delete("/me/watchlist/:id", requireAuth, async (c) => {
  const userId = c.get("userId");
  const mediaId = intParam(c.req.param("id"), "id");
  await prisma.watchlistItem.deleteMany({ where: { userId, mediaId } });
  return c.json({ ok: true });
});

// Lista pozostałych użytkowników (do dopasowania gustu / dodania znajomych).
api.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, displayName: true, avatarUrl: true },
    orderBy: { id: "asc" },
  });
  return c.json(users);
});

// --- Znajomi (follow) ---

// Kogo obserwuję (lista userów).
api.get("/me/following", requireAuth, async (c) => {
  const rows = await prisma.follow.findMany({
    where: { followerId: c.get("userId") },
    orderBy: { createdAt: "desc" },
    select: {
      followed: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return c.json(rows.map((r) => r.followed));
});

// Kto mnie obserwuje (do powiadomień) — najnowsi pierwsi, z datą obserwacji.
api.get("/me/followers", requireAuth, async (c) => {
  const rows = await prisma.follow.findMany({
    where: { followedId: c.get("userId") },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      follower: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return c.json(rows.map((r) => ({ ...r.follower, since: r.createdAt })));
});

// Zacznij obserwować użytkownika.
api.post("/me/follow", requireAuth, async (c) => {
  const followerId = c.get("userId");
  const followedId = Number((await c.req.json()).userId);
  if (!Number.isInteger(followedId) || followedId <= 0) {
    throw new ValidationError("Nieprawidłowy userId.");
  }
  if (followedId === followerId) {
    throw new ValidationError("Nie możesz obserwować samego siebie.");
  }
  const istnial = await prisma.follow.findUnique({
    where: { followerId_followedId: { followerId, followedId } },
  });
  await prisma.follow.upsert({
    where: { followerId_followedId: { followerId, followedId } },
    update: {},
    create: { followerId, followedId },
  });

  // Push + powiadomienie tylko przy NOWYM obserwowaniu (ponowny klik nie budzi).
  if (!istnial) {
    notifyFollow(followedId, followerId);
    const kto = await prisma.user.findUnique({
      where: { id: followerId },
      select: { displayName: true },
    });
    sendPushToUser(followedId, {
      title: "Nowy obserwujący",
      body: `${kto?.displayName ?? "Ktoś"} zaczął Cię obserwować.`,
      url: "/",
    }).catch((e) => console.error("push (follow) nie wyszedl:", e));
  }
  return c.json({ ok: true });
});

// --- Centrum powiadomień ---
api.get("/me/notifications", requireAuth, async (c) =>
  c.json(await listNotifications(c.get("userId"))),
);
api.get("/me/notifications/unread", requireAuth, async (c) =>
  c.json({ count: await unreadCount(c.get("userId")) }),
);
api.post("/me/notifications/read", requireAuth, async (c) =>
  c.json(await markAllRead(c.get("userId"))),
);

// „Co obejrzeć razem" — typy dla Ciebie i oglądanego użytkownika.
api.get("/users/:id/together", requireAuth, async (c) => {
  const otherId = intParam(c.req.param("id"), "id");
  return c.json(await togetherPicks(c.get("userId"), otherId));
});

// --- Web Push: powiadomienia na telefon ---

// Klucz publiczny VAPID (przeglądarka potrzebuje go do subskrypcji).
// enabled=false → front chowa przełącznik zamiast pokazywać zepsutą opcję.
api.get("/push/key", (c) =>
  c.json({ enabled: pushEnabled, publicKey: pushEnabled ? pushPublicKey() : null }),
);

// Zapisz subskrypcję tego urządzenia.
api.post("/push/subscribe", requireAuth, async (c) => {
  const sub = await c.req.json();
  await savePushSubscription(c.get("userId"), sub);
  return c.json({ ok: true }, 201);
});

// Wypisz urządzenie (user wyłączył powiadomienia).
api.post("/push/unsubscribe", requireAuth, async (c) => {
  const { endpoint } = await c.req.json();
  await removePushSubscription(String(endpoint ?? ""));
  return c.json({ ok: true });
});

// Wyślij testowe powiadomienie do siebie („Sprawdź" w Ustawieniach).
api.post("/push/test", requireAuth, async (c) => {
  await sendPushToUser(c.get("userId"), {
    title: "Mozaika",
    body: "Działa — tak będą wyglądać powiadomienia.",
    url: "/",
  });
  return c.json({ ok: true });
});

// Cron premier — woła to raz dziennie GitHub Actions (Render w planie free nie ma
// crona). Nie jest to trasa użytkownika, więc zamiast JWT chroni ją wspólny sekret;
// bez CRON_SECRET w env trasa jest po prostu wyłączona.
api.post("/cron/premieres", async (c) => {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return c.json({ error: "Cron wyłączony (brak CRON_SECRET)." }, 503);
  if (c.req.header("x-cron-secret") !== secret) {
    return c.json({ error: "Brak dostępu." }, 401);
  }
  return c.json(await checkPremieres());
});

// Przestań obserwować.
api.delete("/me/follow/:id", requireAuth, async (c) => {
  const followerId = c.get("userId");
  const followedId = intParam(c.req.param("id"), "id");
  await prisma.follow.deleteMany({ where: { followerId, followedId } });
  return c.json({ ok: true });
});

// --- Czat (tylko między wzajemnymi znajomymi) ---

// Lista rozmów: rozmówca + ostatnia wiadomość + liczba nieprzeczytanych.
api.get("/me/conversations", requireAuth, async (c) =>
  c.json(await conversations(c.get("userId"))),
);

// Historia rozmowy z danym userem (oznacza jego wiadomości jako przeczytane).
api.get("/me/messages/:id", requireAuth, async (c) => {
  const otherId = intParam(c.req.param("id"), "id");
  return c.json(await conversation(c.get("userId"), otherId));
});

// Wyślij wiadomość do znajomego (tekst / zdjęcie / tytuł) → push do odbiorcy.
api.post("/me/messages", requireAuth, async (c) => {
  const meId = c.get("userId");
  const body = await c.req.json();
  const toId = Number(body.toUserId);
  if (!Number.isInteger(toId) || toId <= 0) {
    throw new ValidationError("Nieprawidłowy odbiorca.");
  }
  const mediaId =
    body.mediaId === undefined || body.mediaId === null ? null : Number(body.mediaId);
  const msg = await sendMessage(meId, toId, {
    text: body.text === undefined ? "" : String(body.text),
    imageUrl: body.imageUrl ? String(body.imageUrl) : null,
    mediaId,
  });
  const me = await prisma.user.findUnique({
    where: { id: meId },
    select: { displayName: true },
  });
  // Treść powiadomienia zależy od typu wiadomości.
  const preview = msg.imageUrl
    ? "📷 Zdjęcie"
    : msg.media
      ? `📎 ${msg.media.title}`
      : msg.text.length > 120
        ? `${msg.text.slice(0, 117)}…`
        : msg.text;
  sendPushToUser(toId, {
    title: me?.displayName ?? "Nowa wiadomość",
    body: preview,
    url: "/",
  }).catch((e) => console.error("push (message) nie wyszedl:", e));
  return c.json(msg, 201);
});

// Usuń (miękko) własną wiadomość — zostaje „tombstone" (Usunięto wiadomość).
api.delete("/me/message/:id", requireAuth, async (c) => {
  const msgId = intParam(c.req.param("id"), "id");
  return c.json(await deleteMessage(c.get("userId"), msgId));
});

// Edytuj treść własnej wiadomości.
api.patch("/me/message/:id", requireAuth, async (c) => {
  const msgId = intParam(c.req.param("id"), "id");
  const body = await c.req.json();
  return c.json(await editMessage(c.get("userId"), msgId, String(body.text ?? "")));
});

// Reakcja emoji na wiadomość (toggle).
api.post("/me/message/:id/reaction", requireAuth, async (c) => {
  const msgId = intParam(c.req.param("id"), "id");
  const body = await c.req.json();
  return c.json(await reactToMessage(c.get("userId"), msgId, String(body.emoji ?? "")));
});

// --- Wskaźnik pisania (ulotny, w pamięci serwera; TTL kilka sekund) ---
const typingMap = new Map<string, number>(); // `${fromId}:${toId}` -> ms
const TYPING_TTL = 6000;

// Ping „piszę do X" — front woła co ~2 s, gdy user pisze w polu.
api.post("/me/typing", requireAuth, async (c) => {
  const me = c.get("userId");
  const to = Number((await c.req.json()).toUserId);
  if (Number.isInteger(to) && to > 0) typingMap.set(`${me}:${to}`, Date.now());
  return c.json({ ok: true });
});

// Czy user :id pisze do mnie (w ostatnich TYPING_TTL ms)?
api.get("/me/typing/:id", requireAuth, (c) => {
  const me = c.get("userId");
  const other = intParam(c.req.param("id"), "id");
  const ts = typingMap.get(`${other}:${me}`) ?? 0;
  return c.json({ typing: Date.now() - ts < TYPING_TTL });
});

// Feed aktywności obserwowanych — ostatnie oceny (kto, co, ile, kiedy).
api.get("/me/activity", requireAuth, async (c) => {
  const userId = c.get("userId");
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followedId: true },
  });
  const ids = follows.map((f) => f.followedId);
  if (ids.length === 0) return c.json([]);
  const activity = await prisma.review.findMany({
    where: { userId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      rating: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, avatarUrl: true } },
      media: {
        select: {
          id: true,
          title: true,
          type: true,
          posterUrl: true,
          externalId: true,
          genres: true,
        },
      },
    },
  });
  return c.json(activity);
});

// Katalog wszystkich tytułów.
api.get("/media", async (c) => {
  const media = await prisma.media.findMany({ orderBy: { id: "asc" } });
  return c.json(media);
});

// Wyszukiwarka tytułów w zewnętrznym źródle (wyniki nie są jeszcze w bazie).
// type=book → książki (Open Library), type=manga → manga (MyAnimeList); domyślnie filmy (TMDB).
async function searchByType(type: string, q: string) {
  if (type === "book") return searchBooks(q);
  if (type === "manga") return searchAniList("MANGA", q);
  if (type === "anime") return searchAniList("ANIME", q);
  if (type === "music") return searchMusic(q);
  if (type === "game") return searchGames(q);
  return searchTmdb(q);
}

api.get("/search", async (c) => {
  const q = c.req.query("q") ?? "";
  return c.json(await searchByType(c.req.query("type") ?? "film", q));
});

// Dodaj tytuł do katalogu. Body: { externalId, type? }. book → Open Library, manga → MAL.
async function addByType(type: string, externalId: string) {
  if (type === "book") return addBookFromOpenLibrary(externalId);
  if (type === "manga") return addFromAniList("MANGA", externalId);
  if (type === "anime") return addFromAniList("ANIME", externalId);
  if (type === "music") return addMusicFromItunes(externalId);
  if (type === "game") return addGameFromRawg(externalId);
  return addMediaFromTmdb(externalId);
}

api.post("/media", requireAuth, async (c) => {
  const body = await c.req.json();
  const media = await addByType(String(body.type ?? ""), String(body.externalId ?? ""));
  return c.json(media, 201);
});

// Opis tytułu (do widoku szczegółów). ?type=&externalId=
api.get("/details", async (c) => {
  const type = c.req.query("type") ?? "film";
  const externalId = c.req.query("externalId") ?? "";
  // Opis i zwiastun idą równolegle — zwiastun jest dodatkiem, więc jego brak
  // (albo padnięte API) nie może zabrać widzowi opisu.
  const [description, trailer] = await Promise.all([
    getDescription(type, externalId),
    getTrailer(type, externalId).catch(() => null),
  ]);
  // trailerKind mówi frontowi, czym to odtworzyć: "youtube" (iframe) czy "video" (mp4 z RAWG).
  return c.json({
    description,
    trailerUrl: trailer?.url ?? null,
    trailerKind: trailer?.kind ?? null,
  });
});

// Komentarze/oceny danego tytułu (do widoku szczegółów).
// Trafione recenzje idą na górę (serca minus kciuki), remis rozstrzyga świeżość.
// Trasa jest publiczna, ale gdy przyjdzie token, doklejamy „jak JA zareagowałem".
api.get("/media/:id/reviews", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  const rows = await prisma.review.findMany({
    where: { mediaId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      // user.id — front rozpoznawał „swoją" recenzję po displayName, a nazwy NIE są
      // unikalne (unikalny jest tylko e-mail): dwie osoby o tym samym nicku
      // podstawiały sobie nawzajem ocenę i komentarz do edycji.
      user: { select: { id: true, displayName: true } },
    },
  });

  const summary = await reactionSummary(
    rows.map((r) => r.id),
    await userIdFromHeader(c),
  );
  // Sortujemy po wyniku w kodzie, bo liczniki liczy groupBy — baza nie zna „serca minus kciuki".
  // Lista recenzji jednego tytułu jest krótka, więc to nic nie kosztuje.
  const reviews = rows
    .map((r) => ({
      ...r,
      ...(summary.get(r.id) ?? { likes: 0, dislikes: 0, myReaction: 0 }),
    }))
    .sort((a, b) => reactionScore(b) - reactionScore(a));

  return c.json(reviews);
});

// Reakcja na cudzą recenzję. Body: { value: 1 (serce) | -1 (kciuk w dół) | 0 (zdejmij) }.
// Zwraca nowy stan: { likes, dislikes, myReaction }.
api.post("/reviews/:id/reaction", requireAuth, async (c) => {
  const id = intParam(c.req.param("id"), "id");
  const { value } = await c.req.json();
  return c.json(await react(c.get("userId"), id, value));
});

// Dodaj/aktualizuj recenzję (jako zalogowany użytkownik). Body: { mediaId, rating, text? }.
api.post("/reviews", requireAuth, async (c) => {
  const body = await c.req.json();
  const userId = c.get("userId");
  const review = await addReview({ ...body, userId });
  invalidateDiscoveryCache(userId); // nowa ocena zmienia gust → odśwież pulę discovery
  return c.json(review, 201);
});

// Usuń WŁASNĄ recenzję (ocena + komentarz + przypięcie do TOP 4).
api.delete("/reviews/:id", requireAuth, async (c) => {
  const id = intParam(c.req.param("id"), "id");
  const userId = c.get("userId");
  const result = await deleteReview(userId, id);
  invalidateDiscoveryCache(userId); // mniej ocen → inny gust → odśwież pulę discovery
  return c.json(result);
});

// Dopasowanie gustu między dwoma użytkownikami.
api.get("/users/:a/taste-match/:b", async (c) => {
  const a = intParam(c.req.param("a"), "a");
  const b = intParam(c.req.param("b"), "b");
  return c.json(await tasteMatch(a, b));
});

// Rekomendacje dla wskazanego użytkownika.
api.get("/users/:id/recommendations", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  return c.json(await recommendations(id));
});

// Publiczny profil innego użytkownika: oceny, komentarze i lista — to samo, co widzi
// właściciel (minus e-mail). Gdy przyjdzie token, doklejamy „czy JA polubiłem tę recenzję".
api.get("/users/:id/profile", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  return c.json(await profilePayload(id, await userIdFromHeader(c)));
});

// Kto obserwuje danego usera (lista) — publiczne, do klikalnych liczników na profilu.
api.get("/users/:id/followers", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  const rows = await prisma.follow.findMany({
    where: { followedId: id },
    orderBy: { createdAt: "desc" },
    select: {
      follower: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return c.json(rows.map((r) => r.follower));
});

// Kogo dany user obserwuje (lista) — publiczne.
api.get("/users/:id/following", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  const rows = await prisma.follow.findMany({
    where: { followerId: id },
    orderBy: { createdAt: "desc" },
    select: {
      followed: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return c.json(rows.map((r) => r.followed));
});

// Porównanie gustu z zalogowanym userem: % dopasowania + wspólnie ocenione tytuły.
api.get("/users/:id/compare", requireAuth, async (c) => {
  const meId = c.get("userId");
  const other = intParam(c.req.param("id"), "id");
  if (meId === other) throw new ValidationError("To Twój profil.");
  const result = await tasteMatch(meId, other);
  if (result.status !== "OK") {
    return c.json({ status: result.status, shared: result.shared });
  }
  const media = await prisma.media.findMany({
    where: { id: { in: result.details.map((d) => d.mediaId) } },
    select: {
      id: true,
      title: true,
      type: true,
      posterUrl: true,
      externalId: true,
      genres: true,
    },
  });
  const byId = new Map(media.map((m) => [m.id, m]));
  const shared = result.details
    .map((d) => ({
      media: byId.get(d.mediaId),
      myRating: d.ratingA,
      theirRating: d.ratingB,
      diff: d.diff,
    }))
    .filter((s) => s.media)
    .sort((a, b) => a.diff - b.diff); // najpierw tam, gdzie się zgadzacie
  return c.json({
    status: "OK",
    score: result.score,
    sharedCount: result.shared,
    shared,
  });
});

// Błędy domenowe → kody HTTP.
api.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
  if (err instanceof ForbiddenError) return c.json({ error: err.message }, 403);
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
  if (err instanceof TooManyRequestsError) return c.json({ error: err.message }, 429);
  console.error(err);
  return c.json({ error: "Wewnętrzny błąd serwera." }, 500);
});

app.route("/api", api);

// Frontend PWA (statyczne pliki z public/): index.html, manifest, service worker, ikony.
app.use("/*", serveStatic({ root: "./public" }));

export { app };

// Serwer startuje tylko gdy plik uruchomiono bezpośrednio (nie przy imporcie w testach).
const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`🎨 Mozaika działa na http://localhost:${info.port}`);
  });
}
