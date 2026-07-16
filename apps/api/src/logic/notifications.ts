/**
 * Centrum powiadomień. Typy:
 *  - "follow"          — ktoś Cię zaobserwował
 *  - "like"            — ktoś polubił Twoją recenzję
 *  - "watchlist_rated" — obserwowany ocenił tytuł z Twojej listy „do obejrzenia"
 *  - "premiere"        — tytuł z Twojej listy „do obejrzenia" właśnie wyszedł
 *  - "comment"         — ktoś skomentował Twoją recenzję
 *  - "reply"           — ktoś odpowiedział na Twój komentarz
 * Powiadomienia tworzą hooki przy follow/reakcji/ocenie/komentarzu (nie ufamy
 * frontowi); premiery dorzuca nocny przebieg crona (patrz `premieres.ts`).
 */
import { prisma } from "../db.js";

/**
 * Tworzy powiadomienie (pomija, gdy odbiorca = sprawca — nie powiadamiamy siebie).
 * `actorId === null` oznacza powiadomienie systemowe, bez sprawcy (premiera).
 */
async function create(
  userId: number,
  actorId: number | null,
  type: string,
  extra: { mediaId?: number; reviewId?: number } = {},
) {
  if (userId === actorId) return;
  // Odbiorca mógł wyciszyć ten typ w ustawieniach — wtedy nie tworzymy wpisu.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mutedNotifs: true },
  });
  if (user?.mutedNotifs.includes(type)) return;
  await prisma.notification
    .create({ data: { userId, actorId, type, ...extra } })
    .catch((e) => console.error("notif create nie wyszlo:", e));
}

/** Follow → powiadomienie dla obserwowanego. */
export function notifyFollow(followedId: number, followerId: number) {
  return create(followedId, followerId, "follow");
}

/** Polubienie recenzji → powiadomienie dla autora recenzji (bez duplikatów). */
export async function notifyLike(
  reviewOwnerId: number,
  actorId: number,
  reviewId: number,
  mediaId: number,
) {
  if (reviewOwnerId === actorId) return;
  const already = await prisma.notification.findFirst({
    where: { userId: reviewOwnerId, actorId, type: "like", reviewId },
  });
  if (already) return;
  return create(reviewOwnerId, actorId, "like", { reviewId, mediaId });
}

/** Nowa ocena tytułu → powiadom obserwujących oceniającego, którzy mają go na liście. */
export async function notifyWatchlistWatchers(raterId: number, mediaId: number) {
  const followers = await prisma.follow.findMany({
    where: { followedId: raterId },
    select: { followerId: true },
  });
  const ids = followers.map((f) => f.followerId);
  if (!ids.length) return;
  const watchers = await prisma.watchlistItem.findMany({
    where: { mediaId, userId: { in: ids } },
    select: { userId: true },
  });
  await Promise.all(
    watchers.map((w) => create(w.userId, raterId, "watchlist_rated", { mediaId })),
  );
}

/**
 * Premiera tytułu z listy „do obejrzenia" → powiadomienie dla właściciela listy.
 * Bez sprawcy: to system zauważył premierę, nie żaden użytkownik.
 */
export function notifyPremiere(userId: number, mediaId: number) {
  return create(userId, null, "premiere", { mediaId });
}

/** Komentarz pod recenzją → powiadomienie dla autora recenzji. */
export function notifyComment(
  reviewOwnerId: number,
  actorId: number,
  reviewId: number,
  mediaId: number,
) {
  return create(reviewOwnerId, actorId, "comment", { reviewId, mediaId });
}

/** Odpowiedź na komentarz → powiadomienie dla autora komentarza nadrzędnego. */
export function notifyReply(
  parentAuthorId: number,
  actorId: number,
  reviewId: number,
  mediaId: number,
) {
  return create(parentAuthorId, actorId, "reply", { reviewId, mediaId });
}

/** Lista powiadomień odbiorcy (najnowsze pierwsze) z danymi sprawcy i tytułu. */
export function listNotifications(meId: number) {
  return prisma.notification.findMany({
    where: { userId: meId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      createdAt: true,
      readAt: true,
      reviewId: true,
      actor: { select: { id: true, displayName: true, avatarUrl: true } },
      media: { select: { id: true, title: true, type: true, posterUrl: true } },
    },
  });
}

export async function unreadCount(meId: number) {
  return prisma.notification.count({ where: { userId: meId, readAt: null } });
}

export async function markAllRead(meId: number) {
  await prisma.notification.updateMany({
    where: { userId: meId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true };
}
