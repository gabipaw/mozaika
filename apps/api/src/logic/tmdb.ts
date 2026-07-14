/**
 * Integracja z TMDB — wyszukiwanie filmów i dodawanie ich do katalogu Mozaiki.
 * Klucz (TMDB_API_KEY) jest po stronie serwera — nie trafia do frontendu ani repo.
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, parseReleaseDate, upsertExternalMedia } from "./media.js";

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
  genre_ids?: number[]; // wyszukiwanie/discover
  genres?: { id: number; name: string }[]; // szczegóły filmu
  original_language?: string;
}

// Stała lista gatunków filmowych TMDB (id → kanoniczna nazwa EN). Trzymamy nazwy EN,
// niezależnie od języka odpowiedzi, żeby afinność i discover po gatunku były spójne.
export const TMDB_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};
// Odwrotnie: nazwa EN → id (do zapytań discover po gatunku).
export const TMDB_GENRE_IDS: Record<string, number> = Object.fromEntries(
  Object.entries(TMDB_GENRES).map(([id, name]) => [name, Number(id)]),
);

// Anime = animacja (gatunek TMDB 16) w języku japońskim → należy do zakładki Anime.
const ANIMATION_GENRE = 16;
function isAnime(m: TmdbMovie): boolean {
  return (
    (m.genre_ids?.includes(ANIMATION_GENRE) ?? false) && m.original_language === "ja"
  );
}

function toFilm(m: TmdbMovie): ExternalMedia {
  const ids = m.genres?.map((g) => g.id) ?? m.genre_ids ?? [];
  return {
    externalId: String(m.id),
    title: m.title,
    year: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    posterUrl: m.poster_path ? `${IMG}${m.poster_path}` : null,
    genres: ids.map((id) => TMDB_GENRES[id]).filter(Boolean),
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
 * Wspólny pobieracz list filmów dla discovery: buduje URL (w try, więc brak klucza
 * też daje []), pobiera i mapuje wyniki. Jedno źródło nie może wywalić discovery.
 */
async function discoverMovies(buildUrl: () => string): Promise<ExternalMedia[]> {
  try {
    const res = await fetch(buildUrl());
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

/** „Odkrywanie" filmów: najpopularniejsze premiery z okna lat (NOWE, bez zapisu). */
export function discoverTmdb(yearFrom: number, yearTo: number): Promise<ExternalMedia[]> {
  return discoverMovies(
    () =>
      `${TMDB}/discover/movie?api_key=${apiKey()}&language=pl-PL` +
      `&include_adult=false&sort_by=popularity.desc&vote_count.gte=100` +
      `&primary_release_date.gte=${yearFrom}-01-01&primary_release_date.lte=${yearTo}-12-31`,
  );
}

/** „Odkrywanie" filmów danego GATUNKU (id TMDB) w oknie lat — „lubisz sci-fi → oto sci-fi". */
export function discoverTmdbByGenre(
  genreId: number,
  yearFrom: number,
  yearTo: number,
): Promise<ExternalMedia[]> {
  return discoverMovies(
    () =>
      `${TMDB}/discover/movie?api_key=${apiKey()}&language=pl-PL` +
      `&include_adult=false&sort_by=popularity.desc&vote_count.gte=100` +
      `&with_genres=${genreId}` +
      `&primary_release_date.gte=${yearFrom}-01-01&primary_release_date.lte=${yearTo}-12-31`,
  );
}

/** „Podobne filmy" wg TMDB (recommendations — dobiera po gatunku/treści). */
export function similarTmdb(externalId: string): Promise<ExternalMedia[]> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return Promise.resolve([]);
  return discoverMovies(
    () => `${TMDB}/movie/${id}/recommendations?api_key=${apiKey()}&language=pl-PL`,
  );
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

interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

/**
 * Zwiastun filmu z YouTube'a. TMDB trzyma materiały per język, a dla polskiego
 * zwykle nie ma nic — dlatego pytamy o angielskie (`en-US`), gdzie zwiastuny są
 * praktycznie zawsze. Wolimy oficjalny „Trailer"; teaser to plan awaryjny.
 */
export async function tmdbTrailer(externalId: string): Promise<string | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return null;
  const res = await fetch(
    `${TMDB}/movie/${id}/videos?api_key=${apiKey()}&language=en-US`,
  );
  if (!res.ok) return null;
  const { results = [] } = (await res.json()) as { results?: TmdbVideo[] };

  const yt = results.filter((v) => v.site === "YouTube");
  const best =
    yt.find((v) => v.type === "Trailer" && v.official) ??
    yt.find((v) => v.type === "Trailer") ??
    yt.find((v) => v.type === "Teaser");
  return best ? `https://www.youtube.com/embed/${best.key}` : null;
}

/** Data premiery filmu (TMDB `release_date`). Null, gdy TMDB jej nie zna. */
export async function tmdbReleaseDate(externalId: string): Promise<Date | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return null;
  const res = await fetch(`${TMDB}/movie/${id}?api_key=${apiKey()}&language=pl-PL`);
  if (!res.ok) return null;
  const m = (await res.json()) as { release_date?: string };
  return parseReleaseDate(m.release_date);
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
