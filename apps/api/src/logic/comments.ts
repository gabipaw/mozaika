/**
 * Komentarze pod recenzjami, z jednym poziomem odpowiedzi (odpowiedź na komentarz).
 *
 * Widoczność respektuje blokady: nie pokazujemy komentarzy osób w relacji blokady
 * z oglądającym (w żadną stronę), i nie pozwalamy im komentować pod sobą nawzajem.
 */
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";
import { prisma } from "../db.js";
import { isBlocked } from "./blocks.js";
import { notifyComment, notifyReply } from "./notifications.js";

const MAX_LEN = 1000;

const authorSelect = { select: { id: true, displayName: true, avatarUrl: true } };

interface CommentAuthor {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}
export interface CommentNode {
  id: number;
  text: string | null; // null = usunięty (tombstone)
  deleted: boolean;
  createdAt: Date;
  author: CommentAuthor;
  replies: CommentNode[];
}

/** Id osób w relacji blokady z `meId` (w którąkolwiek stronę) — do ukrywania treści. */
async function blockedIds(meId: number): Promise<number[]> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: meId }, { blockedId: meId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<number>();
  for (const r of rows) ids.add(r.blockerId === meId ? r.blockedId : r.blockerId);
  return [...ids];
}

/**
 * Komentarze recenzji jako drzewo: wpisy najwyższego poziomu z zagnieżdżonymi
 * odpowiedziami. Komentarze zablokowanych osób pomijamy. Usunięty komentarz
 * (deletedAt) zostaje jako „tombstone" TYLKO gdy ma jeszcze widoczne odpowiedzi —
 * inaczej po co pokazywać pustą, skasowaną treść.
 */
export async function listComments(reviewId: number, meId: number | null) {
  const hidden = meId ? await blockedIds(meId) : [];
  const rows = await prisma.reviewComment.findMany({
    where: {
      reviewId,
      ...(hidden.length ? { userId: { notIn: hidden } } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      text: true,
      createdAt: true,
      deletedAt: true,
      parentId: true,
      user: authorSelect,
    },
  });

  const shape = (r: (typeof rows)[number]): CommentNode => ({
    id: r.id,
    text: r.deletedAt ? null : r.text,
    deleted: !!r.deletedAt,
    createdAt: r.createdAt,
    author: r.user,
    replies: [],
  });

  const byId = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  for (const r of rows) byId.set(r.id, shape(r));
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : null;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  // Usunięty korzeń bez odpowiedzi nie ma po co wisieć.
  return roots.filter((n) => !n.deleted || n.replies.length > 0);
}

/**
 * Dodaje komentarz (albo odpowiedź, gdy podano parentId). Zwraca gotowy kształt
 * jak w listComments. Pilnuje blokad wobec autora recenzji i autora komentarza,
 * na który odpowiadamy — zablokowany nie wchodzi tylnymi drzwiami przez komentarz.
 */
export async function addComment(
  meId: number,
  reviewId: number,
  text: string,
  parentId: number | null,
) {
  const clean = text.trim();
  if (!clean) throw new ValidationError("Pusty komentarz.");
  if (clean.length > MAX_LEN) {
    throw new ValidationError(`Komentarz za długi (max ${MAX_LEN} znaków).`);
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, mediaId: true },
  });
  if (!review) throw new NotFoundError("Nie ma takiej recenzji.");
  if (await isBlocked(meId, review.userId)) {
    throw new ForbiddenError("Nie możesz komentować tej recenzji.");
  }

  let parentAuthorId: number | null = null;
  if (parentId !== null) {
    const parent = await prisma.reviewComment.findUnique({
      where: { id: parentId },
      select: { reviewId: true, userId: true, parentId: true },
    });
    if (!parent || parent.reviewId !== reviewId) {
      throw new ValidationError("Nie ma takiego komentarza nadrzędnego.");
    }
    // Trzymamy jeden poziom: odpowiedź na odpowiedź ląduje pod tym samym korzeniem.
    parentId = parent.parentId ?? parentId;
    parentAuthorId = parent.userId;
    if (await isBlocked(meId, parentAuthorId)) {
      throw new ForbiddenError("Nie możesz odpowiedzieć temu użytkownikowi.");
    }
  }

  const created = await prisma.reviewComment.create({
    data: { reviewId, userId: meId, text: clean, parentId },
    select: {
      id: true,
      text: true,
      createdAt: true,
      user: authorSelect,
    },
  });

  // Powiadomienia: odpowiedź budzi autora komentarza nadrzędnego, zwykły komentarz
  // — autora recenzji. create() w notify samo pomija „powiadom siebie".
  if (parentAuthorId !== null) {
    await notifyReply(parentAuthorId, meId, review.id, review.mediaId);
  } else {
    await notifyComment(review.userId, meId, review.id, review.mediaId);
  }

  return {
    id: created.id,
    text: created.text,
    deleted: false,
    createdAt: created.createdAt,
    author: created.user,
    replies: [],
  };
}

/** Miękkie usunięcie własnego komentarza (treść znika, węzeł zostaje dla odpowiedzi). */
export async function deleteComment(meId: number, commentId: number) {
  const c = await prisma.reviewComment.findUnique({
    where: { id: commentId },
    select: { userId: true, deletedAt: true },
  });
  if (!c) throw new NotFoundError("Nie ma takiego komentarza.");
  if (c.userId !== meId) {
    throw new ForbiddenError("Możesz usuwać tylko swoje komentarze.");
  }
  if (!c.deletedAt) {
    await prisma.reviewComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }
  return { ok: true };
}
