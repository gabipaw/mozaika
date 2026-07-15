/**
 * Reakcje na cudze recenzje: serce (1) albo kciuk w dół (-1).
 * Reguły: reagować można tylko na CUDZĄ recenzję, jedna reakcja na recenzję
 * (serce albo kciuk — nie oba), a ponowne kliknięcie tej samej reakcji ją zdejmuje.
 * Reguły to czyste funkcje — zapis do bazy jest osobno.
 */
import { prisma } from "../db.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { notifyLike } from "./notifications.js";

export const LIKE = 1;
export const DISLIKE = -1;
export const NONE = 0;

/** Stan reakcji pod jedną recenzją, widziany oczami konkretnego użytkownika. */
export interface ReactionState {
  likes: number;
  dislikes: number;
  myReaction: number; // 1 = serce, -1 = kciuk w dół, 0 = brak
}

const EMPTY: ReactionState = { likes: 0, dislikes: 0, myReaction: NONE };

/**
 * Czysta reguła: na własną recenzję zareagować nie można.
 * Reakcja ma być sygnałem od innych — inaczej autor sam podbijałby sobie licznik.
 */
export function checkCanReact(reviewAuthorId: number, userId: number): void {
  if (reviewAuthorId === userId) {
    throw new ValidationError("Nie możesz zareagować na własną recenzję.");
  }
}

/** Czysta walidacja: dozwolone tylko 1 (serce), -1 (kciuk w dół) i 0 (zdejmij reakcję). */
export function parseReactionValue(value: unknown): number {
  if (value === LIKE || value === DISLIKE || value === NONE) return value;
  throw new ValidationError(
    "Reakcja musi być równa 1 (serce), -1 (kciuk) albo 0 (brak).",
  );
}

/**
 * Czysta reguła przełącznika: klik w tę samą reakcję, którą już masz, zdejmuje ją.
 * Klik w drugą — przestawia (serce ↔ kciuk), bo reakcja jest jedna na recenzję.
 */
export function nextReaction(current: number, clicked: number): number {
  return current === clicked ? NONE : clicked;
}

/** Ustawia reakcję zalogowanego użytkownika na cudzą recenzję i zwraca nowy stan. */
export async function react(
  userId: number,
  reviewId: number,
  value: number,
): Promise<ReactionState> {
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new ValidationError("reviewId musi być dodatnią liczbą całkowitą.");
  }
  const wanted = parseReactionValue(value);

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, mediaId: true },
  });
  if (!review) throw new NotFoundError(`Recenzja #${reviewId} nie istnieje.`);
  checkCanReact(review.userId, userId);

  if (wanted === NONE) {
    // deleteMany, nie delete — brak reakcji nie jest błędem, wynik i tak ma być „brak".
    await prisma.reviewReaction.deleteMany({ where: { userId, reviewId } });
  } else {
    await prisma.reviewReaction.upsert({
      where: { userId_reviewId: { userId, reviewId } },
      update: { value: wanted },
      create: { userId, reviewId, value: wanted },
    });
    // Powiadomienie tylko przy polubieniu (serce = wartość dodatnia), nie przy „–”.
    if (wanted > 0) notifyLike(review.userId, userId, reviewId, review.mediaId);
  }

  const summary = await reactionSummary([reviewId], userId);
  return summary.get(reviewId) ?? EMPTY;
}

/**
 * Liczniki reakcji dla listy recenzji + własna reakcja patrzącego.
 * Dwa zapytania na całą listę (grupowanie + moje reakcje), nie N+1 na każdą recenzję.
 */
export async function reactionSummary(
  reviewIds: number[],
  viewerId: number | null,
): Promise<Map<number, ReactionState>> {
  const out = new Map<number, ReactionState>();
  if (reviewIds.length === 0) return out;

  const [groups, mine] = await Promise.all([
    prisma.reviewReaction.groupBy({
      by: ["reviewId", "value"],
      where: { reviewId: { in: reviewIds } },
      _count: { _all: true },
    }),
    viewerId === null
      ? Promise.resolve([])
      : prisma.reviewReaction.findMany({
          where: { userId: viewerId, reviewId: { in: reviewIds } },
          select: { reviewId: true, value: true },
        }),
  ]);

  for (const id of reviewIds) out.set(id, { ...EMPTY });
  for (const g of groups) {
    const state = out.get(g.reviewId);
    if (!state) continue;
    if (g.value === DISLIKE) state.dislikes = g._count._all;
    else state.likes = g._count._all;
  }
  for (const m of mine) {
    const state = out.get(m.reviewId);
    if (state) state.myReaction = m.value;
  }
  return out;
}

/**
 * Wynik recenzji do sortowania: serca minus kciuki.
 * Trafna recenzja idzie w górę, zjechana w dół — remisy rozstrzyga świeżość (w miejscu użycia).
 */
export function reactionScore(state: ReactionState): number {
  return state.likes - state.dislikes;
}
