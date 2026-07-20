/**
 * Wysyłka maili przez SMTP Gmaila.
 *
 * Dlaczego Gmail, a nie usługa transakcyjna (Resend/SendGrid): te wymagają własnej
 * domeny — na darmowym nadawcy `onboarding@resend.dev` Resend pozwala wysyłać
 * WYŁĄCZNIE na adres właściciela konta, więc reset hasła nie zadziałałby dla
 * nikogo innego. Gmail wysyła do każdego, za darmo, kosztem gorszej
 * dostarczalności (mail bywa w spamie) i limitu ~500 maili na dobę.
 *
 * Konfiguracja: GMAIL_USER + GMAIL_APP_PASSWORD (hasło APLIKACJI z konta Google,
 * nie zwykłe hasło — myaccount.google.com → Bezpieczeństwo → Hasła aplikacji).
 * Bez tych zmiennych wysyłka jest po prostu WYŁĄCZONA, a reszta aplikacji działa.
 */
import nodemailer from "nodemailer";

const user = process.env.GMAIL_USER ?? "";
const pass = process.env.GMAIL_APP_PASSWORD ?? "";

/** Czy serwer ma czym wysyłać maile. */
export const mailEnabled = Boolean(user && pass);

// Transport tworzymy raz — nodemailer sam trzyma pulę połączeń do SMTP.
const transporter = mailEnabled
  ? nodemailer.createTransport({ service: "gmail", auth: { user, pass } })
  : null;

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Wysyła maila. Zwraca `false`, gdy wysyłka jest wyłączona lub SMTP odmówił.
 *
 * Świadomie NIE rzuca: jedyny obecny nadawca to reset hasła, który z zasady
 * odpowiada tak samo niezależnie od wyniku (patrz passwordReset.ts) — inaczej
 * po treści błędu dałoby się sprawdzać, które adresy mają konto.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (!transporter) {
    console.warn("[mailer] Brak GMAIL_USER/GMAIL_APP_PASSWORD — mail nie wysłany.");
    return false;
  }
  try {
    await transporter.sendMail({ from: `Mozaika <${user}>`, ...mail });
    return true;
  } catch (err) {
    console.error("[mailer] Wysyłka nie powiodła się:", err);
    return false;
  }
}
