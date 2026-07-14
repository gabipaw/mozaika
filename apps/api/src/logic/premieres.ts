/**
 * Powiadomienia o premierach tytułów z watchlisty.
 *
 * Raz dziennie (cron → POST /api/cron/premieres) sprawdzamy, czy któryś tytuł
 * z czyjejś listy „do obejrzenia" właśnie wyszedł, i wysyłamy push do tej osoby.
 *
 * Kiedy wysyłamy push — jedna reguła (patrz `shouldAnnounce`): tytuł musi być
 * wydany PO tym, jak trafił na czyjąś listę. Dzięki temu wgranie tej funkcji na
 * bazę pełną starych, dawno wydanych filmów nie zasypie nikogo lawiną „premier".
 *
 * Daty bierzemy z tych źródeł, które podają konkretny dzień: TMDB (filmy),
 * AniList (anime) i RAWG (gry). Książki i muzyka takiej daty nie mają, więc ich
 * nie ruszamy.
 */
import { MediaType, type Media } from "@prisma/client";

import { prisma } from "../db.js";
import { aniListReleaseDate } from "./anilist.js";
import { gameReleaseDate } from "./games.js";
import { sendPushToUser } from "./push.js";
import { tmdbReleaseDate } from "./tmdb.js";

/** Typy, dla których zewnętrzne API zna dzień premiery. */
const ANNOUNCED_TYPES = [MediaType.FILM, MediaType.ANIME, MediaType.GRA];

/** Jak długo ufamy zapamiętanej dacie premiery, zanim zapytamy API ponownie. */
const RECHECK_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Limit zapytań do zewnętrznych API na jeden przebieg (RAWG i TMDB mają limity). */
const MAX_LOOKUPS = 60;

export interface PremiereRun {
  /** Pozycje watchlisty czekające na rozstrzygnięcie premiery. */
  pending: number;
  /** Ile razy pytaliśmy zewnętrzne API o datę. */
  lookups: number;
  /** Ile pushy poszło. */
  sent: number;
}

/**
 * Czy o tym tytule wysłać push do osoby, która ma go na liście.
 * Tytuł musi być już wydany, ale wydany PÓŹNIEJ niż trafił na listę — inaczej to
 * nie jest premiera, tylko stary tytuł, który ktoś sobie dopisał.
 */
export function shouldAnnounce(
  addedAt: Date,
  releaseDate: Date | null,
  now: Date,
): boolean {
  if (!releaseDate) return false; // daty nie znamy — nie ma czego zapowiadać
  if (releaseDate > now) return false; // jeszcze nie wyszło — czekamy
  return addedAt < releaseDate;
}

/** Czy warto pytać API o datę tego tytułu (żeby nie pytać w kółko o to samo). */
function needsLookup(m: Media, now: Date): boolean {
  if (!m.externalId) return false; // tytuł spoza zewnętrznego źródła
  if (!m.releaseCheckedAt) return true; // nigdy nie pytaliśmy
  if (m.releaseDate && m.releaseDate <= now) return false; // już wiemy, że wyszło
  // Data nieznana albo dopiero przed nami — a takie potrafią się przesuwać.
  return now.getTime() - m.releaseCheckedAt.getTime() > RECHECK_AFTER_MS;
}

/** Pyta właściwe API o datę premiery. Null, gdy źródło jej nie zna. */
function fetchReleaseDate(m: Media): Promise<Date | null> {
  const id = m.externalId ?? "";
  switch (m.type) {
    case MediaType.FILM:
      return tmdbReleaseDate(id);
    case MediaType.ANIME:
      return aniListReleaseDate("ANIME", id);
    case MediaType.GRA:
      return gameReleaseDate(id);
    default:
      return Promise.resolve(null);
  }
}

/**
 * Jeden przebieg: odśwież daty, wyślij pushe o tym, co właśnie wyszło.
 * `now` wstrzykiwane w testach.
 */
export async function checkPremieres(now: Date = new Date()): Promise<PremiereRun> {
  const items = await prisma.watchlistItem.findMany({
    where: { premiereNotifiedAt: null, media: { type: { in: ANNOUNCED_TYPES } } },
    include: { media: true },
  });

  // Ten sam tytuł bywa na listach wielu osób — o datę pytamy raz na tytuł.
  const media = new Map<number, Media>();
  for (const it of items) media.set(it.mediaId, it.media);

  let lookups = 0;
  for (const m of media.values()) {
    if (lookups >= MAX_LOOKUPS) break;
    if (!needsLookup(m, now)) continue;
    lookups++;
    try {
      const releaseDate = await fetchReleaseDate(m);
      media.set(
        m.id,
        await prisma.media.update({
          where: { id: m.id },
          data: { releaseDate, releaseCheckedAt: now },
        }),
      );
    } catch (e) {
      // Padnięte API to nie powód, żeby wywalić cały przebieg — nie zapisujemy
      // znacznika sprawdzenia, więc ten tytuł wróci w kolejnym przebiegu.
      console.error(
        "premiery: nie udało się pobrać daty",
        m.type,
        m.externalId,
        (e as Error).message,
      );
    }
  }

  let sent = 0;
  for (const it of items) {
    const m = media.get(it.mediaId);
    if (!m?.releaseDate || m.releaseDate > now) continue; // data nieznana albo jeszcze przed premierą

    if (shouldAnnounce(it.createdAt, m.releaseDate, now)) {
      await sendPushToUser(it.userId, {
        title: "🍿 Premiera!",
        body: `„${m.title}" jest już dostępne — masz to na liście do obejrzenia.`,
      });
      sent++;
    }
    // Tytuł jest wydany: albo właśnie o tym powiadomiliśmy, albo był wydany, zanim
    // trafił na listę. Tak czy siak nie ma już na co czekać — zamykamy tę pozycję.
    await prisma.watchlistItem.update({
      where: { id: it.id },
      data: { premiereNotifiedAt: now },
    });
  }

  return { pending: items.length, lookups, sent };
}
