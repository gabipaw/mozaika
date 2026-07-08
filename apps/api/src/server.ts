/**
 * Mozaika API — serwer HTTP (Hono).
 * Wystawia operacje domenowe pod `/api/*` oraz serwuje frontend PWA z `public/`.
 * Uwierzytelnianie: JWT (Bearer). Błędy domenowe mapowane na kody HTTP (400/401/404).
 */
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { sign, verify } from "hono/jwt";

import { prisma } from "./db.js";
import { NotFoundError, ValidationError } from "./errors.js";
import { login, register } from "./logic/auth.js";
import { addBookFromOpenLibrary, searchBooks } from "./logic/books.js";
import { getDescription } from "./logic/details.js";
import { addFromAniList, searchAniList } from "./logic/anilist.js";
import { addMusicFromItunes, searchMusic } from "./logic/music.js";
import { addReview } from "./logic/reviews.js";
import { recommendations } from "./logic/recommendations.js";
import { tasteMatch } from "./logic/tasteMatch.js";
import { addMediaFromTmdb, searchTmdb } from "./logic/tmdb.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "mozaika-dev-secret-ustaw-JWT_SECRET";
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

/** Wymaga poprawnego tokenu JWT; zapisuje userId w kontekście. */
const requireAuth: MiddlewareHandler<Vars> = async (c, next) => {
  const header = c.req.header("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = await verify(token, JWT_SECRET, "HS256");
    c.set("userId", Number(payload.userId));
  } catch {
    return c.json({ error: "Wymagane logowanie." }, 401);
  }
  await next();
};

api.get("/health", (c) => c.json({ status: "ok" }));

// --- Uwierzytelnianie ---
api.post("/auth/register", async (c) => {
  const user = await register(await c.req.json());
  return c.json({ token: await makeToken(user.id), user }, 201);
});

api.post("/auth/login", async (c) => {
  const user = await login(await c.req.json());
  return c.json({ token: await makeToken(user.id), user });
});

// Profil zalogowanego użytkownika + jego oceny i statystyki.
api.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, avatarUrl: true },
  });
  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      rating: true,
      text: true,
      media: {
        select: {
          id: true,
          title: true,
          type: true,
          externalId: true,
          year: true,
          posterUrl: true,
        },
      },
    },
  });
  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;
  return c.json({ user, count: reviews.length, avg, reviews });
});

api.get("/me/recommendations", requireAuth, async (c) => {
  return c.json(await recommendations(c.get("userId")));
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

// Lista pozostałych użytkowników (do dopasowania gustu).
api.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: { id: true, displayName: true },
    orderBy: { id: "asc" },
  });
  return c.json(users);
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
  return addMediaFromTmdb(externalId);
}

api.post("/media", async (c) => {
  const body = await c.req.json();
  const media = await addByType(String(body.type ?? ""), String(body.externalId ?? ""));
  return c.json(media, 201);
});

// Opis tytułu (do widoku szczegółów). ?type=&externalId=
api.get("/details", async (c) => {
  const type = c.req.query("type") ?? "film";
  const externalId = c.req.query("externalId") ?? "";
  return c.json({ description: await getDescription(type, externalId) });
});

// Komentarze/oceny danego tytułu (do widoku szczegółów).
api.get("/media/:id/reviews", async (c) => {
  const id = intParam(c.req.param("id"), "id");
  const reviews = await prisma.review.findMany({
    where: { mediaId: id },
    orderBy: { createdAt: "desc" },
    select: {
      rating: true,
      text: true,
      createdAt: true,
      user: { select: { displayName: true } },
    },
  });
  return c.json(reviews);
});

// Dodaj/aktualizuj recenzję (jako zalogowany użytkownik). Body: { mediaId, rating, text? }.
api.post("/reviews", requireAuth, async (c) => {
  const body = await c.req.json();
  const review = await addReview({ ...body, userId: c.get("userId") });
  return c.json(review, 201);
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

// Błędy domenowe → kody HTTP.
api.onError((err, c) => {
  if (err instanceof ValidationError) return c.json({ error: err.message }, 400);
  if (err instanceof NotFoundError) return c.json({ error: err.message }, 404);
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
