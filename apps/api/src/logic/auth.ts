/**
 * Uwierzytelnianie: rejestracja i logowanie.
 * Hasło hashowane przez scrypt (node:crypto) — w bazie trzymamy "salt:hash",
 * nigdy jawnego hasła. Weryfikacja w czasie stałym (timingSafeEqual).
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { prisma } from "../db.js";
import { censor } from "./profanity.js";
import { ValidationError } from "../errors.js";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Górne limity przy rejestracji. Wcześniej sprawdzaliśmy TYLKO minima, więc dało się
 * założyć konto z nazwą na sto tysięcy znaków — a zmiana nazwy w ustawieniach wymusza
 * 40. Nazwa wyświetla się wszędzie (czat, listy, komentarze), więc rozjazd był groźny.
 * Limit hasła chroni dodatkowo pętlę zdarzeń: hashPassword używa synchronicznego
 * scryptSync, który na bardzo długim wejściu zatrzymałby cały serwer.
 */
const MAX_NAME = 40;
const MAX_EMAIL = 254; // maksimum adresu e-mail wg RFC 5321
const MAX_PASSWORD = 200;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export interface PublicUser {
  id: number;
  email: string;
  displayName: string;
}

const PUBLIC = { id: true, email: true, displayName: true } as const;

export async function register(input: {
  email?: unknown;
  displayName?: unknown;
  password?: unknown;
}): Promise<PublicUser> {
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase();
  const displayName = String(input.displayName ?? "").trim();
  const password = String(input.password ?? "");

  if (!EMAIL_RE.test(email) || email.length > MAX_EMAIL) {
    throw new ValidationError("Nieprawidłowy e-mail.");
  }
  if (displayName.length < 2) throw new ValidationError("Nazwa musi mieć min. 2 znaki.");
  if (displayName.length > MAX_NAME) {
    throw new ValidationError(`Nazwa może mieć najwyżej ${MAX_NAME} znaków.`);
  }
  if (password.length < 6) throw new ValidationError("Hasło musi mieć min. 6 znaków.");
  if (password.length > MAX_PASSWORD) {
    throw new ValidationError(`Hasło może mieć najwyżej ${MAX_PASSWORD} znaków.`);
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new ValidationError("Konto z tym e-mailem już istnieje.");

  // Nazwa jest widoczna wszędzie, więc filtr obowiązuje już przy zakładaniu konta —
  // inaczej wystarczyłoby zarejestrować się z wyzwiskiem i nigdy nie zmieniać nazwy.
  return prisma.user.create({
    data: {
      email,
      displayName: censor(displayName),
      passwordHash: hashPassword(password),
    },
    select: PUBLIC,
  });
}

export async function login(input: {
  email?: unknown;
  password?: unknown;
}): Promise<PublicUser> {
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(input.password ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    throw new ValidationError("Błędny e-mail lub hasło.");
  }
  return { id: user.id, email: user.email, displayName: user.displayName };
}
