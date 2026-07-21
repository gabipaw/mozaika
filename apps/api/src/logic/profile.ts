/**
 * Dane profilu (własnego i cudzego) — jedno źródło prawdy dla `/me` i `/users/:id/profile`.
 * Oba widoki pokazują to samo (oceny, komentarze, lista, liczniki), różnią się tylko tym,
 * że własny profil zna swój e-mail. Wcześniej były to dwa skopiowane bloki — stąd wspólny moduł.
 */
import { prisma } from "../db.js";
import { reactionSummary } from "./reactions.js";
import { areFriends } from "./messages.js";

/** Ekskluzywny tytuł twórcy — ustawić może tylko konto „dev". */
export const DEV_TITLE = "👑 Developer";

// Konto twórcy Mozaiki (na stałe) + ewentualne dodatkowe z env DEV_EMAILS.
const BUILTIN_DEV_EMAILS = ["gabipaw0@gmail.com"];

/** Czy dany e-mail należy do twórcy (wbudowany + env DEV_EMAILS, przecinkami). */
export function isDevEmail(email: string | null | undefined): boolean {
  const set = new Set(
    [...BUILTIN_DEV_EMAILS, ...(process.env.DEV_EMAILS ?? "").split(",")]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
  return !!email && set.has(email.toLowerCase());
}

const mediaSelect = {
  id: true,
  title: true,
  type: true,
  externalId: true,
  year: true,
  posterUrl: true,
  genres: true,
} as const;

/**
 * @param userId  czyj profil pokazujemy
 * @param viewerId kto patrzy (null = gość) — potrzebne, żeby wiedzieć, które recenzje polubił
 * @param withEmail e-mail zwracamy tylko na własnym profilu (na cudzym to wyciek danych)
 */
export async function profilePayload(
  userId: number,
  viewerId: number | null,
  withEmail = false,
) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      title: true,
      // e-mail potrzebny też do wykrycia konta twórcy na WŁASNYM profilu (isDev).
      email: true,
    },
  });
  // isDev tylko dla oglądania własnego profilu (picker tytułu) — decyduje o „👑 Developer".
  const isDev = viewerId === userId && isDevEmail(user.email);
  // E-mail zwracamy tylko na własnym profilu — na cudzym to wyciek.
  const userOut = withEmail ? user : { ...user, email: undefined };

  const [rows, watchlist, lists, followersCount, followingCount] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, // do usuwania recenzji (DELETE /reviews/:id) i do reakcji
        rating: true,
        text: true,
        favorite: true,
        status: true, // katalog: zakładki W trakcie / Ukończone
        createdAt: true, // katalog: sortowanie „ostatnio" + statystyki „w tym roku"
        media: { select: mediaSelect },
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { media: { select: mediaSelect } },
    }),
    // Własne listy: na własnym profilu wszystkie, na cudzym tylko publiczne.
    prisma.list.findMany({
      where: { userId, ...(viewerId === userId ? {} : { isPublic: true }) },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        isPublic: true,
        items: {
          orderBy: { createdAt: "desc" },
          select: { media: { select: mediaSelect } },
        },
      },
    }),
    prisma.follow.count({ where: { followedId: userId } }).catch(() => 0),
    prisma.follow.count({ where: { followerId: userId } }).catch(() => 0),
  ]);

  const summary = await reactionSummary(
    rows.map((r) => r.id),
    viewerId,
  );
  const reviews = rows.map((r) => ({
    ...r,
    ...(summary.get(r.id) ?? { likes: 0, dislikes: 0, myReaction: 0 }),
  }));

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  // Czy oglądający i właściciel profilu to znajomi (wzajemna obserwacja) —
  // front pokazuje wtedy przycisk „Napisz". Tylko dla zalogowanego, nie na sobie.
  const mutualFriend =
    viewerId && viewerId !== userId ? await areFriends(viewerId, userId) : false;

  return {
    user: userOut,
    isDev,
    count: reviews.length,
    avg,
    followersCount,
    followingCount,
    mutualFriend,
    reviews,
    watchlist,
    lists,
  };
}
