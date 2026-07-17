/**
 * Web Push — prawdziwe powiadomienia na telefon (także gdy Mozaika jest zamknięta).
 *
 * Jak to działa: przeglądarka rejestruje subskrypcję u swojej bramki push (FCM /
 * Mozilla / Apple) i oddaje nam jej adres (`endpoint`) + klucze do szyfrowania.
 * My wysyłamy zaszyfrowany ładunek do tej bramki, a ona budzi Service Workera na
 * urządzeniu — nawet gdy apka nie jest otwarta.
 *
 * Wymaga pary kluczy VAPID (identyfikują nasz serwer wobec bramki):
 * VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT w env.
 * Bez nich push jest po prostu WYŁĄCZONY — reszta aplikacji działa normalnie.
 */
import webpush from "web-push";

import { prisma } from "../db.js";
import { ValidationError } from "../errors.js";

const publicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const subject = process.env.VAPID_SUBJECT ?? "mailto:kontakt@mozaika.dev";

/** Czy serwer ma klucze VAPID (bez nich nie wysyłamy pushy). */
export const pushEnabled = Boolean(publicKey && privateKey);

if (pushEnabled) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

/** Klucz publiczny dla przeglądarki (potrzebny przy zapisie subskrypcji). */
export function pushPublicKey(): string {
  return publicKey;
}

export interface BrowserSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Zapisuje subskrypcję urządzenia. Ten sam endpoint = to samo urządzenie → upsert. */
export async function savePushSubscription(userId: number, sub: BrowserSubscription) {
  const endpoint = sub?.endpoint?.trim();
  const p256dh = sub?.keys?.p256dh?.trim();
  const auth = sub?.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    throw new ValidationError("Niekompletna subskrypcja push.");
  }
  // Urządzenie mogło wcześniej należeć do innego konta (ten sam telefon, inny login)
  // — dlatego przy konflikcie nadpisujemy też userId.
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, userId },
    create: { endpoint, p256dh, auth, userId },
  });
}

/** Usuwa subskrypcję (user wyłączył powiadomienia albo odsubskrybował). */
export async function removePushSubscription(endpoint: string) {
  if (!endpoint?.trim()) throw new ValidationError("Brak endpointu subskrypcji.");
  await prisma.pushSubscription.deleteMany({ where: { endpoint: endpoint.trim() } });
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // dokąd zabrać po kliknięciu (domyślnie „/")
  /**
   * Grupa powiadomień: ten sam tag → nowe ZASTĘPUJE poprzednie. Domyślnie wszystko
   * ląduje w jednej grupie („mozaika"), ale rozmowy dostają tag per nadawca —
   * inaczej wiadomość od Bartka kasowałaby z ekranu tę od Celiny.
   */
  tag?: string;
}

/**
 * Wysyła powiadomienie na WSZYSTKIE urządzenia użytkownika.
 * Subskrypcje odrzucone przez bramkę (404/410 = użytkownik odinstalował apkę albo
 * wyczyścił dane) kasujemy, żeby nie pukać w martwe adresy w nieskończoność.
 * Błąd wysyłki NIGDY nie wywala akcji, która push wywołała (np. obserwowania).
 */
export async function sendPushToUser(userId: number, payload: PushPayload) {
  if (!pushEnabled) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription
            .delete({ where: { endpoint: s.endpoint } })
            .catch(() => {});
        } else {
          console.error("push send failed", code, (e as Error).message);
        }
      }
    }),
  );
}
