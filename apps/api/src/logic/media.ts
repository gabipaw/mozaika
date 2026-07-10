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
