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

  if (!EMAIL_RE.test(email)) throw new ValidationError("Nieprawidłowy e-mail.");
  if (displayName.length < 2) throw new ValidationError("Nazwa musi mieć min. 2 znaki.");
  if (password.length < 6) throw new ValidationError("Hasło musi mieć min. 6 znaków.");

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
