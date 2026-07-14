/**
 * Wspólna warstwa dla zewnętrznych źródeł tytułów (TMDB, Open Library, …).
 * Każde źródło mapuje swój wynik na `ExternalMedia`, a zapis do katalogu
 * (upsert po parze type+externalId) jest jeden dla wszystkich typów mediów.
 */
import { MediaType } from "@prisma/client";

import { prisma } from "../db.js";

export interface ExternalMedia {
  externalId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[]; // np. ["Sci-Fi", "Thriller"] — puste, gdy źródło nie poda
}

/**
 * Data z zewnętrznego API w formacie „RRRR-MM-DD" → Date (północ UTC).
 * Null, gdy źródło daty nie zna albo podaje ją niepełną („2027", „2027-05") —
 * do powiadomienia o premierze potrzebujemy konkretnego dnia.
 */
export function parseReleaseDate(raw: string | null | undefined): Date | null {
  const s = (raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Dodaje/aktualizuje tytuł w katalogu (upsert po type+externalId). */
export function upsertExternalMedia(type: MediaType, m: ExternalMedia) {
  return prisma.media.upsert({
    where: { type_externalId: { type, externalId: m.externalId } },
    // Nie nadpisuj gatunków pustą tablicą (np. gdy wynik wyszukiwania ich nie ma).
    update: { posterUrl: m.posterUrl, ...(m.genres.length ? { genres: m.genres } : {}) },
    create: {
      type,
      title: m.title,
      externalId: m.externalId,
      year: m.year,
      posterUrl: m.posterUrl,
      genres: m.genres,
    },
  });
}
