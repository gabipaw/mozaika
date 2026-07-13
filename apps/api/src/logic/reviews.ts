/**
 * Przepływ „Dodaj recenzję".
 * Reguły: ocena 1–10, user i tytuł muszą istnieć, jeden user = jedna ocena tytułu.
 * Walidacja (czysta funkcja) jest oddzielona od zapisu do bazy.
 */
import { prisma } from "../db.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";

export const MIN_RATING = 0.5;
export const MAX_RATING = 10;

export interface ReviewInput {
  userId: number;
  mediaId: number;
  rating: number;
  text?: string;
}

export interface ValidReviewInput {
  userId: number;
  mediaId: number;
  rating: number;
  text: string | null;
}

/** Czysta walidacja wejścia — nie dotyka bazy. Rzuca ValidationError przy złych danych. */
export function validateReviewInput(input: ReviewInput): ValidReviewInput {
  const { userId, mediaId, rating } = input;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ValidationError("userId musi być dodatnią liczbą całkowitą.");
  }
  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    throw new ValidationError("mediaId musi być dodatnią liczbą całkowitą.");
  }
  if (
    typeof rating !== "number" ||
    !Number.isFinite(rating) ||
    rating < MIN_RATING ||
    rating > MAX_RATING ||
    (rating * 2) % 1 !== 0 // dozwolone tylko wielokrotności 0.5 (półgwiazdki)
  ) {
    throw new ValidationError(
      `Ocena musi być wielokrotnością 0,5 w zakresie ${MIN_RATING}–${MAX_RATING} (podano: ${rating}).`,
    );
  }

  const trimmed = input.text?.trim();
  return { userId, mediaId, rating, text: trimmed ? trimmed : null };
}

/**
 * Zapisuje recenzję do bazy po przejściu walidacji i reguł.
 * Nic nie trafia do bazy, jeśli walidacja/istnienie nie przejdą.
 */
export async function addReview(input: ReviewInput) {
  const valid = validateReviewInput(input);

  const [user, media] = await Promise.all([
    prisma.user.findUnique({ where: { id: valid.userId } }),
    prisma.media.findUnique({ where: { id: valid.mediaId } }),
  ]);
  if (!user) throw new NotFoundError(`Użytkownik #${valid.userId} nie istnieje.`);
  if (!media) throw new NotFoundError(`Tytuł #${valid.mediaId} nie istnieje.`);

  // Reguła „jeden user = jedna ocena tytułu": aktualizuj istniejącą albo utwórz nową.
  return prisma.review.upsert({
    where: { userId_mediaId: { userId: valid.userId, mediaId: valid.mediaId } },
    update: { rating: valid.rating, text: valid.text },
    create: {
      userId: valid.userId,
      mediaId: valid.mediaId,
      rating: valid.rating,
      text: valid.text,
    },
  });
}

/**
 * Usuwa WŁASNĄ recenzję (ocenę + komentarz + przypięcie do TOP 4).
 * Cudzej nie ruszy — właściciela sprawdzamy przed usunięciem, nie ufamy id z URL.
 */
export async function deleteReview(userId: number, reviewId: number) {
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new ValidationError("reviewId musi być dodatnią liczbą całkowitą.");
  }

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new NotFoundError(`Recenzja #${reviewId} nie istnieje.`);
  if (review.userId !== userId) {
    throw new ForbiddenError("Możesz usuwać tylko własne recenzje.");
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return { deleted: true, mediaId: review.mediaId };
}
