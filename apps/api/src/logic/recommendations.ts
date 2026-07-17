/**
 * Rekomendacje przez dopasowanie gustu.
 * Idea: znajdź użytkowników o podobnym guście (wysoki wynik `tasteMatch`) i poleć
 * tytuły, które oni ocenili wysoko, a których cel jeszcze NIE ocenił.
 * Ocena rekomendacji = średnia ich ocen ważona % dopasowania (podobniejsi ważą więcej).
 */
import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";
import { computeTasteMatch, type RatingOf } from "./tasteMatch.js";

/** Od jakiego % podobieństwa uznajemy kogoś za „podobny gust". */
export const MIN_MATCH_SCORE = 60;
/** Od jakiej oceny uznajemy, że ktoś dany tytuł „poleca". */
export const MIN_LIKE_RATING = 7;
export const DEFAULT_LIMIT = 5;

export interface Recommender {
  userId: number;
  matchScore: number;
  rating: number;
}

export interface Recommendation {
  mediaId: number;
  score: number; // przewidywana ocena 1–10
  recommenders: Recommender[];
}

export interface OtherUser {
  userId: number;
  reviews: RatingOf[];
}

/** Czysta logika rekomendacji — na tablicach, bez bazy (testowalna). */
export function computeRecommendations(
  targetReviews: RatingOf[],
  others: OtherUser[],
  limit: number = DEFAULT_LIMIT,
): Recommendation[] {
  const ratedByTarget = new Set(targetReviews.map((r) => r.mediaId));

  const acc = new Map<
    number,
    { weightedSum: number; weightSum: number; recommenders: Recommender[] }
  >();

  for (const other of others) {
    const match = computeTasteMatch(targetReviews, other.reviews);
    if (match.status !== "OK" || match.score < MIN_MATCH_SCORE) continue;

    for (const r of other.reviews) {
      if (ratedByTarget.has(r.mediaId) || r.rating < MIN_LIKE_RATING) continue;

      const entry = acc.get(r.mediaId) ?? {
        weightedSum: 0,
        weightSum: 0,
        recommenders: [],
      };
      entry.weightedSum += match.score * r.rating;
      entry.weightSum += match.score;
      entry.recommenders.push({
        userId: other.userId,
        matchScore: match.score,
        rating: r.rating,
      });
      acc.set(r.mediaId, entry);
    }
  }

  const recs: Recommendation[] = [...acc.entries()].map(([mediaId, e]) => ({
    mediaId,
    score: Math.round((e.weightedSum / e.weightSum) * 10) / 10,
    recommenders: e.recommenders,
  }));

  recs.sort((a, b) => b.score - a.score || b.recommenders.length - a.recommenders.length);
  return recs.slice(0, limit);
}

export interface RecommendationWithMedia extends Recommendation {
  title: string;
  type: string;
  externalId: string | null;
  year: number | null;
  posterUrl: string | null;
}

/** Rekomendacje dla użytkownika — dane z bazy, wzbogacone o tytuły. */
export async function recommendations(
  userId: number,
  limit: number = DEFAULT_LIMIT,
): Promise<RecommendationWithMedia[]> {
  // Tylko sprawdzamy istnienie — bez `select` szedłby CAŁY wiersz użytkownika,
  // razem z hashem hasła i avatarem (base64). Do „czy jest?" wystarczy id.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new NotFoundError(`Użytkownik #${userId} nie istnieje.`);

  const [targetReviews, otherUsers] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      select: { mediaId: true, rating: true },
    }),
    prisma.user.findMany({
      where: { id: { not: userId } },
      select: { id: true, reviews: { select: { mediaId: true, rating: true } } },
    }),
  ]);

  const recs = computeRecommendations(
    targetReviews,
    otherUsers.map((u) => ({ userId: u.id, reviews: u.reviews })),
    limit,
  );
  if (recs.length === 0) return [];

  const media = await prisma.media.findMany({
    where: { id: { in: recs.map((r) => r.mediaId) } },
    select: {
      id: true,
      title: true,
      type: true,
      externalId: true,
      year: true,
      posterUrl: true,
    },
  });
  const mediaById = new Map(media.map((m) => [m.id, m]));

  return recs.map((r) => {
    const m = mediaById.get(r.mediaId);
    return {
      ...r,
      title: m?.title ?? "?",
      type: m?.type ?? "?",
      externalId: m?.externalId ?? null,
      year: m?.year ?? null,
      posterUrl: m?.posterUrl ?? null,
    };
  });
}
