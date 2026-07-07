/**
 * Integracja z TMDB — wyszukiwanie filmów i dodawanie ich do katalogu Mozaiki.
 * Klucz (TMDB_API_KEY) jest po stronie serwera — nie trafia do frontendu ani repo.
 */
import { MediaType } from "@prisma/client";

import { prisma } from "../db.js";
import { NotFoundError, ValidationError } from "../errors.js";

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new ValidationError("Brak klucza TMDB (TMDB_API_KEY) na serwerze.");
  }
  return key;
}

export interface TmdbFilm {
  externalId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
}

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
}

function toFilm(m: TmdbMovie): TmdbFilm {
  return {
    externalId: String(m.id),
    title: m.title,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    posterUrl: m.poster_path ? `${IMG}${m.poster_path}` : null,
  };
}

/** Szuka filmów w TMDB. Zwraca do 18 wyników (bez zapisywania w bazie). */
export async function searchTmdb(query: string): Promise<TmdbFilm[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const url =
    `${TMDB}/search/movie?api_key=${apiKey()}&language=pl-PL` +
    `&include_adult=false&query=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search error ${res.status}`);

  const data = (await res.json()) as { results?: TmdbMovie[] };
  return (data.results ?? [])
    .filter((m) => m.title)
    .slice(0, 18)
    .map(toFilm);
}

/** Dodaje film z TMDB do katalogu (upsert po externalId) i zwraca rekord Media. */
export async function addMediaFromTmdb(externalId: string) {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("externalId musi być liczbą (TMDB id).");
  }

  const res = await fetch(`${TMDB}/movie/${id}?api_key=${apiKey()}&language=pl-PL`);
  if (res.status === 404) throw new NotFoundError(`Film TMDB #${id} nie istnieje.`);
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);

  const film = toFilm((await res.json()) as TmdbMovie);
  return prisma.media.upsert({
    where: { type_externalId: { type: MediaType.FILM, externalId: film.externalId } },
    update: { posterUrl: film.posterUrl },
    create: {
      type: MediaType.FILM,
      title: film.title,
      externalId: film.externalId,
      year: film.year,
      posterUrl: film.posterUrl,
    },
  });
}
