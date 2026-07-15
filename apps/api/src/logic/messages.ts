/**
 * Czat 1:1. Zasada: pisać można TYLKO ze znajomymi = userami, którzy obserwują
 * się WZAJEMNIE. Sprawdzenie wzajemności jest przy każdej operacji (nie ufamy
 * frontowi). Wiadomość może nieść: tekst, zdjęcie (imageUrl) i/lub udostępniony
 * tytuł (mediaId). Do tego reakcje emoji i edycja. Push wysyła warstwa trasy.
 */
import { prisma } from "../db.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";

const NOT_FRIENDS = "Możesz pisać tylko ze znajomymi — musicie się obserwować wzajemnie.";
const EMOJIS = ["❤️", "😂", "👍", "👎", "😮", "😢"];

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
  imageUrl: true,
  createdAt: true,
  readAt: true,
  deletedAt: true,
  editedAt: true,
  senderId: true,
  receiverId: true,
  mediaId: true,
  media: {
    select: { id: true, title: true, type: true, year: true, posterUrl: true },
  },
  reactions: { select: { emoji: true, userId: true } },
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

/**
 * Wyślij wiadomość: tekst i/lub zdjęcie i/lub udostępniony tytuł.
 * Waliduje treść i wzajemność. Zwraca utworzoną wiadomość.
 */
export async function sendMessage(
  meId: number,
  toId: number,
  opts: { text?: string; imageUrl?: string | null; mediaId?: number | null },
) {
  const text = (opts.text ?? "").trim();
  const imageUrl = opts.imageUrl ?? null;
  const mediaId = opts.mediaId ?? null;

  if (text.length > 2000) {
    throw new ValidationError("Wiadomość za długa (max 2000 znaków).");
  }
  if (imageUrl) {
    if (!imageUrl.startsWith("data:image/") || imageUrl.length > 2_000_000) {
      throw new ValidationError("Nieprawidłowe zdjęcie (data:image, do ~1.5 MB).");
    }
  }
  if (mediaId !== null) {
    const exists = await prisma.media.count({ where: { id: mediaId } });
    if (!exists) throw new ValidationError("Nie ma takiego tytułu.");
  }
  if (!text && !imageUrl && mediaId === null) {
    throw new ValidationError("Pusta wiadomość.");
  }
  if (!(await areFriends(meId, toId))) throw new ForbiddenError(NOT_FRIENDS);

  return prisma.message.create({
    data: { senderId: meId, receiverId: toId, text, imageUrl, mediaId },
    select: msgSelect,
  });
}

/** Miękkie usunięcie wiadomości — tylko własnej. Czyścimy treść/zdjęcie/tytuł. */
export async function deleteMessage(meId: number, msgId: number) {
  const msg = await prisma.message.findUnique({
    where: { id: msgId },
    select: { senderId: true },
  });
  if (!msg) throw new NotFoundError("Nie ma takiej wiadomości.");
  if (msg.senderId !== meId) {
    throw new ForbiddenError("Możesz usuwać tylko swoje wiadomości.");
  }
  return prisma.message.update({
    where: { id: msgId },
    data: { deletedAt: new Date(), text: "", imageUrl: null, mediaId: null },
    select: msgSelect,
  });
}

/** Edycja treści własnej (nieusuniętej) wiadomości → ustawia editedAt. */
export async function editMessage(meId: number, msgId: number, textRaw: string) {
  const text = textRaw.trim();
  if (!text) throw new ValidationError("Pusta wiadomość.");
  if (text.length > 2000) {
    throw new ValidationError("Wiadomość za długa (max 2000 znaków).");
  }
  const msg = await prisma.message.findUnique({
    where: { id: msgId },
    select: { senderId: true, deletedAt: true },
  });
  if (!msg) throw new NotFoundError("Nie ma takiej wiadomości.");
  if (msg.senderId !== meId) {
    throw new ForbiddenError("Możesz edytować tylko swoje wiadomości.");
  }
  if (msg.deletedAt)
    throw new ValidationError("Nie można edytować usuniętej wiadomości.");
  return prisma.message.update({
    where: { id: msgId },
    data: { text, editedAt: new Date() },
    select: msgSelect,
  });
}

/** Reakcja emoji (jedna na usera): ten sam emoji ponownie = zdejmij; inny = zamień. */
export async function reactToMessage(meId: number, msgId: number, emoji: string) {
  if (!EMOJIS.includes(emoji)) throw new ValidationError("Niedozwolona reakcja.");
  const msg = await prisma.message.findUnique({
    where: { id: msgId },
    select: { senderId: true, receiverId: true },
  });
  if (!msg) throw new NotFoundError("Nie ma takiej wiadomości.");
  if (meId !== msg.senderId && meId !== msg.receiverId) {
    throw new ForbiddenError("To nie Twoja rozmowa.");
  }
  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId: { messageId: msgId, userId: meId } },
  });
  if (existing && existing.emoji === emoji) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.upsert({
      where: { messageId_userId: { messageId: msgId, userId: meId } },
      update: { emoji },
      create: { messageId: msgId, userId: meId, emoji },
    });
  }
  return prisma.message.findUnique({ where: { id: msgId }, select: msgSelect });
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
      lastDeleted: boolean;
      lastImage: boolean;
      lastMediaTitle: string | null;
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
        lastDeleted: m.deletedAt !== null,
        lastImage: m.imageUrl !== null,
        lastMediaTitle: m.media?.title ?? null,
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
