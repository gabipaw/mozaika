/**
 * Integracja z TMDB — wyszukiwanie filmów i dodawanie ich do katalogu Mozaiki.
 * Klucz (TMDB_API_KEY) jest po stronie serwera — nie trafia do frontendu ani repo.
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

function apiKey(): string {
  const key = process.env.TMDB_API_KEY;
  if (!key) {
    throw new ValidationError("Brak klucza TMDB (TMDB_API_KEY) na serwerze.");
  }
  return key;
}

interface TmdbMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  genre_ids?: number[];
  original_language?: string;
}

// Anime = animacja (gatunek TMDB 16) w języku japońskim → należy do zakładki Anime.
const ANIMATION_GENRE = 16;
function isAnime(m: TmdbMovie): boolean {
  return (
    (m.genre_ids?.includes(ANIMATION_GENRE) ?? false) && m.original_language === "ja"
  );
}

function toFilm(m: TmdbMovie): ExternalMedia {
  return {
    externalId: String(m.id),
    title: m.title,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    posterUrl: m.poster_path ? `${IMG}${m.poster_path}` : null,
  };
}

/** Szuka filmów w TMDB. Zwraca do 18 wyników (bez zapisywania w bazie). */
export async function searchTmdb(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const url =
    `${TMDB}/search/movie?api_key=${apiKey()}&language=pl-PL` +
    `&include_adult=false&query=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search error ${res.status}`);

  const data = (await res.json()) as { results?: TmdbMovie[] };
  return (data.results ?? [])
    .filter((m) => m.title && !isAnime(m)) // anime → osobna zakładka
    .slice(0, 18)
    .map(toFilm);
}

/**
 * „Odkrywanie" filmów: najpopularniejsze premiery z danego okna lat (bez zapisu).
 * Źródło kandydatów do rekomendacji pod gust — NOWE tytuły, nie z katalogu.
 * Błąd/brak klucza → [] (discovery nie może się wywalić przez jedno źródło).
 */
export async function discoverTmdb(
  yearFrom: number,
  yearTo: number,
): Promise<ExternalMedia[]> {
  try {
    const url =
      `${TMDB}/discover/movie?api_key=${apiKey()}&language=pl-PL` +
      `&include_adult=false&sort_by=popularity.desc&vote_count.gte=100` +
      `&primary_release_date.gte=${yearFrom}-01-01&primary_release_date.lte=${yearTo}-12-31`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TmdbMovie[] };
    return (data.results ?? [])
      .filter((m) => m.title && !isAnime(m)) // anime → osobna zakładka
      .slice(0, 18)
      .map(toFilm);
  } catch {
    return [];
  }
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

  return upsertExternalMedia(MediaType.FILM, toFilm((await res.json()) as TmdbMovie));
}

/** Opis filmu (streszczenie TMDB) — do widoku szczegółów. Pusty, gdy brak. */
export async function tmdbDescription(externalId: string): Promise<string> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return "";
  const res = await fetch(`${TMDB}/movie/${id}?api_key=${apiKey()}&language=pl-PL`);
  if (!res.ok) return "";
  const m = (await res.json()) as { overview?: string };
  return (m.overview ?? "").trim();
}
