/**
 * Czat 1:1. Zasada: pisać można TYLKO ze znajomymi = userami, którzy obserwują
 * się WZAJEMNIE. Sprawdzenie wzajemności jest przy każdej operacji (nie ufamy
 * frontowi). Push o nowej wiadomości wysyła warstwa trasy (server.ts).
 */
import { prisma } from "../db.js";
import { ForbiddenError, ValidationError } from "../errors.js";

const NOT_FRIENDS = "Możesz pisać tylko ze znajomymi — musicie się obserwować wzajemnie.";

/** Czy A i B to znajomi = obserwują się wzajemnie (dwa wpisy Follow w obie strony). */
export async function areFriends(a: number, b: number): Promise<boolean> {
  if (a === b) return false;
  const both = await prisma.follow.count({
    where: {
      OR: [
        { followerId: a, followedId: b },
        { followerId: b, followedId: a },
      ],
    },
  });
  return both === 2;
}

const msgSelect = {
  id: true,
  text: true,
  createdAt: true,
  readAt: true,
  senderId: true,
  receiverId: true,
} as const;

/** Historia rozmowy (rosnąco) + oznaczenie wiadomości OD drugiej strony jako przeczytane. */
export async function conversation(meId: number, otherId: number) {
  if (!(await areFriends(meId, otherId))) throw new ForbiddenError(NOT_FRIENDS);
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: meId, receiverId: otherId },
        { senderId: otherId, receiverId: meId },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: msgSelect,
  });
  await prisma.message.updateMany({
    where: { senderId: otherId, receiverId: meId, readAt: null },
    data: { readAt: new Date() },
  });
  return messages;
}

/** Wyślij wiadomość (zwraca utworzoną). Waliduje treść i wzajemność. */
export async function sendMessage(meId: number, toId: number, textRaw: string) {
  const text = textRaw.trim();
  if (!text) throw new ValidationError("Pusta wiadomość.");
  if (text.length > 2000)
    throw new ValidationError("Wiadomość za długa (max 2000 znaków).");
  if (!(await areFriends(meId, toId))) throw new ForbiddenError(NOT_FRIENDS);
  return prisma.message.create({
    data: { senderId: meId, receiverId: toId, text },
    select: msgSelect,
  });
}

/** Lista rozmów: dla każdego rozmówcy ostatnia wiadomość + liczba nieprzeczytanych. */
export async function conversations(meId: number) {
  const rows = await prisma.message.findMany({
    where: { OR: [{ senderId: meId }, { receiverId: meId }] },
    orderBy: { createdAt: "desc" },
    select: {
      ...msgSelect,
      sender: { select: { id: true, displayName: true, avatarUrl: true } },
      receiver: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  const map = new Map<
    number,
    {
      user: { id: number; displayName: string; avatarUrl: string | null };
      lastText: string;
      lastAt: Date;
      fromMe: boolean;
      unread: number;
    }
  >();
  for (const m of rows) {
    const other = m.senderId === meId ? m.receiver : m.sender;
    let entry = map.get(other.id);
    if (!entry) {
      // rows są malejąco → pierwszy trafiony = najnowsza wiadomość rozmowy.
      entry = {
        user: other,
        lastText: m.text,
        lastAt: m.createdAt,
        fromMe: m.senderId === meId,
        unread: 0,
      };
      map.set(other.id, entry);
    }
    if (m.receiverId === meId && m.readAt === null) entry.unread++;
  }
  return [...map.values()];
}
