/**
 * Polubienia recenzji („trafna recenzja").
 * Reguły: polubić można tylko CUDZĄ recenzję i tylko raz (ponowne kliknięcie = brak zmiany).
 * Sprawdzenie reguły (czysta funkcja) jest oddzielone od zapisu do bazy.
 */
import { prisma } from "../db.js";
import { NotFoundError, ValidationError } from "../errors.js";

/** Stan polubień recenzji widziany oczami konkretnego użytkownika. */
export interface LikeState {
  likes: number;
  likedByMe: boolean;
}

/**
 * Czysta reguła: własnej recenzji polubić nie można.
 * Polubienie ma być sygnałem od innych — inaczej autor sam podbijałby sobie licznik.
 */
export function checkCanLike(reviewAuthorId: number, userId: number): void {
  if (reviewAuthorId === userId) {
    throw new ValidationError("Nie możesz polubić własnej recenzji.");
  }
}

/** Ile osób polubiło daną recenzję. */
export function countLikes(reviewId: number): Promise<number> {
  return prisma.reviewLike.count({ where: { reviewId } });
}

/** Polubienie cudzej recenzji. Powtórne kliknięcie nie tworzy duplikatu (upsert). */
export async function likeReview(userId: number, reviewId: number): Promise<LikeState> {
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new ValidationError("reviewId musi być dodatnią liczbą całkowitą.");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { userId: true },
  });
  if (!review) throw new NotFoundError(`Recenzja #${reviewId} nie istnieje.`);
  checkCanLike(review.userId, userId);

  await prisma.reviewLike.upsert({
    where: { userId_reviewId: { userId, reviewId } },
    update: {},
    create: { userId, reviewId },
  });
  return { likes: await countLikes(reviewId), likedByMe: true };
}

/** Cofnięcie polubienia. Brak polubienia nie jest błędem — wynik i tak ma być „nie lubię". */
export async function unlikeReview(userId: number, reviewId: number): Promise<LikeState> {
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new ValidationError("reviewId musi być dodatnią liczbą całkowitą.");
  }

  await prisma.reviewLike.deleteMany({ where: { userId, reviewId } });
  return { likes: await countLikes(reviewId), likedByMe: false };
}

/**
 * Które z podanych recenzji polubił dany użytkownik.
 * Jedno zapytanie na całą listę — nie N+1 na każdą recenzję z osobna.
 */
export async function likedReviewIds(
  userId: number | null,
  reviewIds: number[],
): Promise<Set<number>> {
  if (userId === null || reviewIds.length === 0) return new Set();

  const rows = await prisma.reviewLike.findMany({
    where: { userId, reviewId: { in: reviewIds } },
    select: { reviewId: true },
  });
  return new Set(rows.map((r) => r.reviewId));
}
