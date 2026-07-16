/**
 * Blokowanie użytkowników. Blokada jest jednokierunkowa w zapisie (kto kogo
 * zablokował), ale jej SKUTKI liczymy obustronnie: jeśli którakolwiek strona
 * zablokowała drugą, nie mogą do siebie pisać ani komentować swoich recenzji.
 * Dzięki temu ofiara nie musi wiedzieć, kto kogo pierwszy zablokował.
 */
import { prisma } from "../db.js";

/** Czy między tymi dwiema osobami istnieje blokada (w którąkolwiek stronę). */
export async function isBlocked(a: number, b: number): Promise<boolean> {
  if (a === b) return false;
  const n = await prisma.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return n > 0;
}

/**
 * Blokuje `blockedId`. Zrywa też wzajemną obserwację w obie strony — inaczej
 * zablokowany dalej liczyłby się jako „znajomy" i mógłby pisać na czacie.
 * Idempotentne: ponowna blokada tej samej osoby nic nie psuje.
 */
export async function blockUser(blockerId: number, blockedId: number) {
  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: blockerId, followedId: blockedId },
        { followerId: blockedId, followedId: blockerId },
      ],
    },
  });
}

/** Zdejmuje blokadę. Obserwacji NIE przywracamy — trzeba zaobserwować od nowa. */
export async function unblockUser(blockerId: number, blockedId: number) {
  await prisma.block.deleteMany({ where: { blockerId, blockedId } });
}

/** Lista osób, które ja zablokowałem (do ekranu „Zablokowani"). */
export async function listBlocked(blockerId: number) {
  const rows = await prisma.block.findMany({
    where: { blockerId },
    orderBy: { createdAt: "desc" },
    select: {
      blocked: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return rows.map((r) => r.blocked);
}
