/**
 * Dane profilu (własnego i cudzego) — jedno źródło prawdy dla `/me` i `/users/:id/profile`.
 * Oba widoki pokazują to samo (oceny, komentarze, lista, liczniki), różnią się tylko tym,
 * że własny profil zna swój e-mail. Wcześniej były to dwa skopiowane bloki — stąd wspólny moduł.
 */
import { prisma } from "../db.js";
import { likedReviewIds } from "./reviewLikes.js";

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
    select: { id: true, displayName: true, avatarUrl: true, email: withEmail },
  });

  const [rows, watchlist, followersCount, followingCount] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, // do usuwania recenzji (DELETE /reviews/:id) i do polubień
        rating: true,
        text: true,
        favorite: true,
        media: { select: mediaSelect },
        _count: { select: { likes: true } },
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { media: { select: mediaSelect } },
    }),
    prisma.follow.count({ where: { followedId: userId } }).catch(() => 0),
    prisma.follow.count({ where: { followerId: userId } }).catch(() => 0),
  ]);

  const liked = await likedReviewIds(
    viewerId,
    rows.map((r) => r.id),
  );
  const reviews = rows.map(({ _count, ...r }) => ({
    ...r,
    likes: _count.likes,
    likedByMe: liked.has(r.id),
  }));

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  return {
    user,
    count: reviews.length,
    avg,
    followersCount,
    followingCount,
    reviews,
    watchlist,
  };
}
