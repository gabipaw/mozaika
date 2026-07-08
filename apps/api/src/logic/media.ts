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
}

/** Dodaje/aktualizuje tytuł w katalogu (upsert po type+externalId). */
export function upsertExternalMedia(type: MediaType, m: ExternalMedia) {
  return prisma.media.upsert({
    where: { type_externalId: { type, externalId: m.externalId } },
    update: { posterUrl: m.posterUrl },
    create: {
      type,
      title: m.title,
      externalId: m.externalId,
      year: m.year,
      posterUrl: m.posterUrl,
    },
  });
}
