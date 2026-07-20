/**
 * Integracja z TMDB — wyszukiwanie filmów i dodawanie ich do katalogu Mozaiki.
 * Klucz (TMDB_API_KEY) jest po stronie serwera — nie trafia do frontendu ani repo.
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { tmdbLocale } from "./lang.js";
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

/** Który katalog TMDB: filmy czy seriale. Ścieżki i nazwy pól różnią się między nimi. */
export type TmdbKind = "movie" | "tv";

interface TmdbItem {
  id: number;
  title?: string; // film
  name?: string; // serial
  release_date?: string; // film
  first_air_date?: string; // serial
  poster_path?: string | null;
  genre_ids?: number[]; // wyszukiwanie/discover
  genres?: { id: number; name: string }[]; // szczegóły pozycji
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
/**
 * Gatunki SERIALI mają w TMDB własne id i częściowo inne nazwy („Sci-Fi & Fantasy”
 * zamiast „Sci-Fi”). Mapujemy je na słownictwo filmowe, a nie zapisujemy dosłownie:
 * afinność gatunkowa (tasteProfile) grupuje po nazwie, więc dwa napisy na to samo
 * rozbiłyby profil gustu na dwie połówki i osłabiły rekomendacje.
 */
const TMDB_TV_GENRES: Record<number, string> = {
  10759: "Action", // Action & Adventure
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Family", // Kids
  9648: "Mystery",
  10763: "Documentary", // News
  10764: "Reality",
  10765: "Sci-Fi", // Sci-Fi & Fantasy
  10766: "Drama", // Soap
  10767: "Talk",
  10768: "War", // War & Politics
  37: "Western",
};

// Odwrotnie: nazwa EN → id (do zapytań discover po gatunku).
export const TMDB_GENRE_IDS: Record<string, number> = Object.fromEntries(
  Object.entries(TMDB_GENRES).map(([id, name]) => [name, Number(id)]),
);

// Anime = animacja (gatunek TMDB 16) w języku japońskim → należy do zakładki Anime.
const ANIMATION_GENRE = 16;
// Id 16 (Animacja) znaczy to samo w obu słownikach, więc reguła działa dla filmów
// i seriali bez rozróżniania rodzaju.
function isAnime(m: TmdbItem): boolean {
  return (
    (m.genre_ids?.includes(ANIMATION_GENRE) ?? false) && m.original_language === "ja"
  );
}

/** Tytuł pozycji — TMDB nazywa go inaczej dla filmu (`title`) i serialu (`name`). */
function itemTitle(m: TmdbItem): string {
  return m.title ?? m.name ?? "";
}

function toMedia(kind: TmdbKind, m: TmdbItem): ExternalMedia {
  const ids = m.genres?.map((g) => g.id) ?? m.genre_ids ?? [];
  const slownik = kind === "tv" ? TMDB_TV_GENRES : TMDB_GENRES;
  const data = kind === "tv" ? m.first_air_date : m.release_date;
  return {
    externalId: String(m.id),
    title: itemTitle(m),
    year: data ? Number(data.slice(0, 4)) : null,
    posterUrl: m.poster_path ? `${IMG}${m.poster_path}` : null,
    genres: ids.map((id) => slownik[id]).filter(Boolean),
  };
}

const toFilm = (m: TmdbItem): ExternalMedia => toMedia("movie", m);

/** Szuka w TMDB filmów albo seriali. Zwraca do 18 wyników (bez zapisywania w bazie). */
export async function searchTmdbKind(
  kind: TmdbKind,
  query: string,
): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const url =
    `${TMDB}/search/${kind}?api_key=${apiKey()}&language=${tmdbLocale()}` +
    `&include_adult=false&query=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB search error ${res.status}`);

  const data = (await res.json()) as { results?: TmdbItem[] };
  return (data.results ?? [])
    .filter((m) => itemTitle(m) && !isAnime(m)) // anime → osobna zakładka
    .slice(0, 18)
    .map((m) => toMedia(kind, m));
}

export const searchTmdb = (query: string) => searchTmdbKind("movie", query);
export const searchTmdbTv = (query: string) => searchTmdbKind("tv", query);

/**
 * Wspólny pobieracz list filmów dla discovery: buduje URL (w try, więc brak klucza
 * też daje []), pobiera i mapuje wyniki. Jedno źródło nie może wywalić discovery.
 */
async function discoverMovies(buildUrl: () => string): Promise<ExternalMedia[]> {
  try {
    const res = await fetch(buildUrl());
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: TmdbItem[] };
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
      `${TMDB}/discover/movie?api_key=${apiKey()}&language=${tmdbLocale()}` +
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
      `${TMDB}/discover/movie?api_key=${apiKey()}&language=${tmdbLocale()}` +
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
    () =>
      `${TMDB}/movie/${id}/recommendations?api_key=${apiKey()}&language=${tmdbLocale()}`,
  );
}

/** Dodaje film albo serial z TMDB do katalogu (upsert po externalId). */
export async function addFromTmdb(kind: TmdbKind, externalId: string) {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("externalId musi być liczbą (TMDB id).");
  }

  const res = await fetch(
    `${TMDB}/${kind}/${id}?api_key=${apiKey()}&language=${tmdbLocale()}`,
  );
  if (res.status === 404) throw new NotFoundError(`Pozycja TMDB #${id} nie istnieje.`);
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);

  const typ = kind === "tv" ? MediaType.SERIAL : MediaType.FILM;
  return upsertExternalMedia(typ, toMedia(kind, (await res.json()) as TmdbItem));
}

export const addMediaFromTmdb = (externalId: string) => addFromTmdb("movie", externalId);
export const addSerialFromTmdb = (externalId: string) => addFromTmdb("tv", externalId);

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
export async function tmdbTrailerKind(
  kind: TmdbKind,
  externalId: string,
): Promise<string | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return null;
  const res = await fetch(
    `${TMDB}/${kind}/${id}/videos?api_key=${apiKey()}&language=en-US`,
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

export const tmdbTrailer = (externalId: string) => tmdbTrailerKind("movie", externalId);
export const tmdbTvTrailer = (externalId: string) => tmdbTrailerKind("tv", externalId);

/**
 * Data premiery. Film ma `release_date`, serial `first_air_date` (data pierwszego
 * odcinka) — dla powiadomień o premierze to właściwy odpowiednik.
 */
export async function tmdbReleaseDateKind(
  kind: TmdbKind,
  externalId: string,
): Promise<Date | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return null;
  const res = await fetch(
    `${TMDB}/${kind}/${id}?api_key=${apiKey()}&language=${tmdbLocale()}`,
  );
  if (!res.ok) return null;
  const m = (await res.json()) as { release_date?: string; first_air_date?: string };
  return parseReleaseDate(kind === "tv" ? m.first_air_date : m.release_date);
}

export const tmdbReleaseDate = (externalId: string) =>
  tmdbReleaseDateKind("movie", externalId);
export const tmdbTvReleaseDate = (externalId: string) =>
  tmdbReleaseDateKind("tv", externalId);

/**
 * Tytuły filmów w danym języku, po id z TMDB.
 *
 * Katalog trzyma `Media.title` jako JEDEN string — w tym języku, w którym film
 * akurat trafił do bazy. Dla użytkownika z innym językiem to zły tytuł, a wspólna
 * kolumna nie ma gdzie pomieścić siedmiu wersji. Dlatego tłumaczenie dobieramy przy
 * wyświetlaniu i trzymamy w pamięci procesu: tytuł filmu się nie zmienia, więc cache
 * bez wygasania jest w porządku, a TMDB dostaje jedno pytanie na (film, język).
 *
 * Brak tłumaczenia w TMDB nie jest błędem — oddaje wtedy tytuł oryginalny, i dobrze.
 * Gdy zapytanie padnie, wołający zostaje przy tytule z bazy (patrz `localizeTitles`).
 */
const titleCache = new Map<string, string>();

export async function tmdbTitles(
  externalIds: string[],
  lang: string,
  kind: TmdbKind = "movie",
): Promise<Map<string, string>> {
  const locale = tmdbLocale(lang);
  const ids = [...new Set(externalIds)].filter((id) => /^\d+$/.test(id));
  const out = new Map<string, string>();

  const missing: string[] = [];
  for (const id of ids) {
    const hit = titleCache.get(`${kind}:${id}:${locale}`);
    if (hit) out.set(id, hit);
    else missing.push(id);
  }
  if (!missing.length) return out;

  // TMDB nie ma pobierania hurtem — jedno zapytanie na film, ale tylko raz w życiu
  // procesu. Równolegle, żeby lista 20 pozycji nie czekała 20 rund w kolejce.
  await Promise.all(
    missing.map(async (id) => {
      try {
        const res = await fetch(
          `${TMDB}/${kind}/${id}?api_key=${apiKey()}&language=${locale}`,
        );
        if (!res.ok) return;
        const tytul = itemTitle((await res.json()) as TmdbItem);
        if (!tytul) return;
        titleCache.set(`${kind}:${id}:${locale}`, tytul);
        out.set(id, tytul);
      } catch {
        // Sieć/klucz padły — zostawiamy tytuł z bazy zamiast wywalać całą listę.
      }
    }),
  );
  return out;
}

/** Opis (streszczenie TMDB) — do widoku szczegółów. Pusty, gdy brak. */
export async function tmdbDescriptionKind(
  kind: TmdbKind,
  externalId: string,
): Promise<string> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return "";
  const res = await fetch(
    `${TMDB}/${kind}/${id}?api_key=${apiKey()}&language=${tmdbLocale()}`,
  );
  if (!res.ok) return "";
  const m = (await res.json()) as { overview?: string };
  return (m.overview ?? "").trim();
}

export const tmdbDescription = (externalId: string) =>
  tmdbDescriptionKind("movie", externalId);
export const tmdbTvDescription = (externalId: string) =>
  tmdbDescriptionKind("tv", externalId);
