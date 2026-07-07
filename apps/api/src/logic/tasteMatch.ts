/**
 * „Dopasowanie gustu" — funkcja sygnaturowa Mozaiki.
 * Porównuje dwóch użytkowników po wspólnie ocenionych tytułach i zwraca % zgodności.
 * Reguła biznesowa: potrzeba min. MIN_SHARED wspólnych ocen, inaczej „za mało danych".
 * Czysta logika (computeTasteMatch) jest oddzielona od pobierania z bazy (tasteMatch).
 */
import { prisma } from "../db.js";
import { NotFoundError, ValidationError } from "../errors.js";

/** Minimalna liczba wspólnie ocenionych tytułów, by wynik był wiarygodny. */
export const MIN_SHARED = 3;

/** Największa możliwa różnica ocen na skali 1–10. */
const MAX_DIFF = 9;

export interface RatingOf {
  mediaId: number;
  rating: number;
}

export interface SharedDetail {
  mediaId: number;
  ratingA: number;
  ratingB: number;
  diff: number;
}

export type TasteMatchResult =
  | { status: "OK"; score: number; shared: number; details: SharedDetail[] }
  | { status: "INSUFFICIENT_DATA"; shared: number; minShared: number };

/**
 * Czysta logika dopasowania — działa na tablicach ocen, bez bazy (łatwo testowalna).
 * score = 100 * (1 - średnia_różnica / 9). Identyczne oceny = 100%, skrajnie różne = 0%.
 */
export function computeTasteMatch(
  reviewsA: RatingOf[],
  reviewsB: RatingOf[],
  minShared: number = MIN_SHARED,
): TasteMatchResult {
  const ratingByMediaB = new Map(reviewsB.map((r) => [r.mediaId, r.rating]));

  const details: SharedDetail[] = [];
  for (const a of reviewsA) {
    const ratingB = ratingByMediaB.get(a.mediaId);
    if (ratingB !== undefined) {
      details.push({
        mediaId: a.mediaId,
        ratingA: a.rating,
        ratingB,
        diff: Math.abs(a.rating - ratingB),
      });
    }
  }

  if (details.length < minShared) {
    return { status: "INSUFFICIENT_DATA", shared: details.length, minShared };
  }

  const avgDiff = details.reduce((sum, d) => sum + d.diff, 0) / details.length;
  const score = Math.round(100 * (1 - avgDiff / MAX_DIFF));
  return { status: "OK", score, shared: details.length, details };
}

/** Dopasowanie gustu między dwoma użytkownikami — dane z bazy. */
export async function tasteMatch(
  userAId: number,
  userBId: number,
): Promise<TasteMatchResult> {
  if (userAId === userBId) {
    throw new ValidationError("Nie liczymy dopasowania użytkownika z samym sobą.");
  }

  const [a, b] = await Promise.all([
    prisma.user.findUnique({ where: { id: userAId } }),
    prisma.user.findUnique({ where: { id: userBId } }),
  ]);
  if (!a) throw new NotFoundError(`Użytkownik #${userAId} nie istnieje.`);
  if (!b) throw new NotFoundError(`Użytkownik #${userBId} nie istnieje.`);

  const [reviewsA, reviewsB] = await Promise.all([
    prisma.review.findMany({
      where: { userId: userAId },
      select: { mediaId: true, rating: true },
    }),
    prisma.review.findMany({
      where: { userId: userBId },
      select: { mediaId: true, rating: true },
    }),
  ]);

  return computeTasteMatch(reviewsA, reviewsB);
}
