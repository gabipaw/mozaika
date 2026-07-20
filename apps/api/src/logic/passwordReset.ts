/**
 * Odzyskiwanie hasła („nie pamiętam hasła").
 *
 * Przebieg: user podaje e-mail → generujemy losowy token, jego SHA-256 zapisujemy
 * w bazie, a sam token wysyłamy mailem w linku → user klika, ustawia nowe hasło.
 *
 * Trzy zasady, na których stoi bezpieczeństwo tego przepływu:
 *  1. W bazie tylko hash tokenu — wyciek bazy nie pozwala przejąć konta.
 *  2. Token żyje godzinę i działa raz (usedAt), a udany reset unieważnia pozostałe.
 *  3. `requestPasswordReset` odpowiada tak samo dla istniejącego i nieistniejącego
 *     konta — inaczej formularz stałby się wyszukiwarką „czy X ma konto".
 */
import { createHash, randomBytes } from "node:crypto";

import { prisma } from "../db.js";
import { hashPassword } from "./auth.js";
import { sendMail } from "./mailer.js";
import { ValidationError } from "../errors.js";

/** Ile żyje link. Godzina: user zdąży przeczytać maila, złodziej maila raczej nie. */
const TTL_MS = 60 * 60 * 1000;

/** Minimalna długość hasła — ta sama co przy rejestracji i zmianie hasła. */
const MIN_PASSWORD = 6;

/**
 * Adres, pod którym stoi aplikacja — potrzebny do zbudowania linku w mailu.
 * Render sam ustawia RENDER_EXTERNAL_URL, więc na produkcji nie trzeba nic dodawać.
 */
function appUrl(): string {
  const url =
    process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? "http://localhost:3000";
  return url.replace(/\/+$/, ""); // bez końcowego ukośnika, żeby nie robić „//?reset="
}

/** SHA-256 tokenu w hex. Token jest losowy (nie hasło), więc solenie nie jest potrzebne. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Czy znaleziony token nadaje się do użycia: istnieje, nieużyty i nieprzeterminowany. */
export function isTokenUsable(
  row: { expiresAt: Date; usedAt: Date | null } | null,
  now: Date,
): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  return row.expiresAt.getTime() > now.getTime();
}

function resetMail(link: string): { subject: string; text: string; html: string } {
  const subject = "Mozaika — ustaw nowe hasło";
  const text = [
    "Cześć!",
    "",
    "Ktoś (mamy nadzieję, że Ty) poprosił o zmianę hasła w Mozaice.",
    "Otwórz ten link, żeby ustawić nowe hasło:",
    link,
    "",
    "Link jest ważny przez godzinę i zadziała tylko raz.",
    "Jeśli to nie Ty — zignoruj tę wiadomość, Twoje hasło pozostaje bez zmian.",
  ].join("\n");
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;line-height:1.5">
      <h2 style="margin:0 0 16px">Ustaw nowe hasło</h2>
      <p>Ktoś (mamy nadzieję, że Ty) poprosił o zmianę hasła w <strong>Mozaice</strong>.</p>
      <p style="margin:24px 0">
        <a href="${link}"
           style="background:#6c5ce7;color:#fff;padding:12px 20px;border-radius:8px;
                  text-decoration:none;display:inline-block">Ustaw nowe hasło</a>
      </p>
      <p style="color:#666;font-size:14px">
        Link jest ważny przez godzinę i zadziała tylko raz.<br>
        Jeśli to nie Ty — zignoruj tę wiadomość, hasło pozostaje bez zmian.
      </p>
    </div>`;
  return { subject, text, html };
}

/**
 * Wysyła link do zmiany hasła, jeśli konto istnieje.
 *
 * Zawsze kończy się bez błędu — także dla nieznanego adresu, konta bez hasła
 * (stare konta demo) i gdy SMTP padnie. Wołający ma odpowiedzieć jednym,
 * niezmiennym komunikatem.
 */
export async function requestPasswordReset(emailRaw: unknown): Promise<void> {
  const email = String(emailRaw ?? "")
    .trim()
    .toLowerCase();
  if (!email) return;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });
  // Konto bez hasła nie ma czego resetować — zachowujemy się jak przy braku konta.
  if (!user?.passwordHash) return;

  // Poprzednie, niezużyte linki tracą ważność — po prośbie o nowy link stary
  // nie powinien już działać.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });

  const link = `${appUrl()}/?reset=${token}`;
  await sendMail({ to: email, ...resetMail(link) });
}

/**
 * Ustawia nowe hasło na podstawie tokenu z linku.
 * Rzuca ValidationError, gdy token jest zły/zużyty/przeterminowany albo hasło za krótkie.
 */
export async function resetPassword(
  tokenRaw: unknown,
  passwordRaw: unknown,
): Promise<void> {
  const token = String(tokenRaw ?? "").trim();
  const password = String(passwordRaw ?? "");

  if (!token) throw new ValidationError("Brak tokenu resetu.");
  if (password.length < MIN_PASSWORD) {
    throw new ValidationError(`Hasło musi mieć min. ${MIN_PASSWORD} znaków.`);
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!isTokenUsable(row, new Date())) {
    throw new ValidationError("Link wygasł lub został już użyty. Poproś o nowy.");
  }

  // Hasło i zużycie tokenu w jednej transakcji: gdyby zapis hasła się nie udał,
  // token ma pozostać ważny, żeby user mógł spróbować jeszcze raz.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row!.userId },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: row!.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);
}
