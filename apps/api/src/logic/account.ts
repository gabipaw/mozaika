/**
 * Operacje na własnym koncie: zmiana nazwy, hasła, preferencji powiadomień,
 * usunięcie konta. Wszystko wymaga zalogowania (wołane spod requireAuth).
 */
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword } from "./auth.js";
import { censor } from "./profanity.js";

/** Typy powiadomień, które można wyciszyć (spójne z notifications.ts). */
export const NOTIF_TYPES = [
  "follow",
  "like",
  "comment",
  "reply",
  "watchlist_rated",
  "premiere",
  // „message" nie ma wpisu w centrum powiadomień (czat ma własny licznik przy
  // ikonie) — jest tu wyłącznie po to, żeby dało się wyciszyć pushe z rozmów.
  "message",
] as const;

/** Zmienia nazwę wyświetlaną (te same reguły co przy rejestracji). */
export async function updateDisplayName(userId: number, raw: unknown) {
  const displayName = String(raw ?? "").trim();
  if (displayName.length < 2) {
    throw new ValidationError("Nazwa musi mieć min. 2 znaki.");
  }
  if (displayName.length > 40) {
    throw new ValidationError("Nazwa może mieć max. 40 znaków.");
  }
  // Nazwa widnieje wszędzie — na czacie, pod komentarzami, na listach — więc
  // wulgaryzm w niej razi bardziej niż w opisie. Cenzurujemy po sprawdzeniu długości:
  // gwiazdki mają tyle znaków co słowo, więc limit i tak by się zgadzał.
  const clean = censor(displayName);
  await prisma.user.update({ where: { id: userId }, data: { displayName: clean } });
  return { displayName: clean };
}

/** Ile znaków może mieć „o mnie". Krótko — to podpis pod nazwą, nie życiorys. */
export const MAX_BIO = 100;

/**
 * Zmienia opis „o mnie". Pusty tekst = kasuje bio (NULL), a nie zapisuje pustego
 * stringa — inaczej profil miałby pusty akapit zamiast żadnego.
 */
export async function updateBio(userId: number, raw: unknown) {
  // Zwykłe spacje z końców + puste linie: bio ma jedną linijkę na profilu, a wklejony
  // tekst z entera rozpychałby układ.
  const bio = censor(
    String(raw ?? "")
      .replace(/\s*\n\s*/g, " ")
      .trim(),
  );
  if (bio.length > MAX_BIO) {
    throw new ValidationError(`Opis może mieć max. ${MAX_BIO} znaków.`);
  }
  await prisma.user.update({ where: { id: userId }, data: { bio: bio || null } });
  return { bio: bio || null };
}

/**
 * Zmienia hasło po sprawdzeniu obecnego. Konta bez hasła (stare demo) nie mają
 * czego weryfikować — odsyłamy z jasnym komunikatem zamiast cichego błędu.
 */
export async function changePassword(
  userId: number,
  currentRaw: unknown,
  nextRaw: unknown,
) {
  const current = String(currentRaw ?? "");
  const next = String(nextRaw ?? "");
  if (next.length < 6) {
    throw new ValidationError("Nowe hasło musi mieć min. 6 znaków.");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new NotFoundError("Nie ma takiego konta.");
  if (!user.passwordHash) {
    throw new ValidationError("To konto nie ma hasła do zmiany.");
  }
  if (!verifyPassword(current, user.passwordHash)) {
    throw new ForbiddenError("Obecne hasło jest błędne.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(next) },
  });
  return { ok: true };
}

/** Preferencje powiadomień: lista wyciszonych typów (walidowana do znanych). */
export async function getNotifPrefs(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mutedNotifs: true },
  });
  return { muted: user?.mutedNotifs ?? [] };
}

export async function setNotifPrefs(userId: number, raw: unknown) {
  const arr = Array.isArray(raw) ? raw.map(String) : [];
  // Odrzucamy nieznane typy — do bazy trafiają tylko te, które faktycznie istnieją.
  const muted = [...new Set(arr)].filter((t) =>
    (NOTIF_TYPES as readonly string[]).includes(t),
  );
  await prisma.user.update({ where: { id: userId }, data: { mutedNotifs: muted } });
  return { muted };
}

/**
 * Trwałe usunięcie konta — po potwierdzeniu hasłem. Kaskady w schemacie (onDelete:
 * Cascade) same czyszczą recenzje, wiadomości, obserwacje, komentarze, blokady itd.
 */
export async function deleteAccount(userId: number, passwordRaw: unknown) {
  const password = String(passwordRaw ?? "");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) throw new NotFoundError("Nie ma takiego konta.");
  // Konto z hasłem wymaga jego podania; konto bez hasła (demo) usuwamy bez tego.
  if (user.passwordHash && !verifyPassword(password, user.passwordHash)) {
    throw new ForbiddenError("Hasło jest błędne.");
  }
  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
