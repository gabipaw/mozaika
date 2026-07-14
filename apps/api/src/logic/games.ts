/**
 * Integracja z RAWG — wyszukiwanie gier i dodawanie ich do katalogu.
 * Klucz (RAWG_API_KEY) jest po stronie serwera. Darmowy klucz: https://rawg.io/apikey
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, parseReleaseDate, upsertExternalMedia } from "./media.js";

const RAWG = "https://api.rawg.io/api";

function apiKey(): string {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new ValidationError("Brak klucza RAWG (RAWG_API_KEY) na serwerze.");
  }
  return key;
}

interface RawgGame {
  id: number;
  name: string;
  released?: string | null;
  background_image?: string | null;
  genres?: { name: string }[];
}

function toGame(g: RawgGame): ExternalMedia {
  return {
    externalId: String(g.id),
    title: g.name,
    year: g.released ? Number(g.released.slice(0, 4)) || null : null,
    posterUrl: g.background_image ?? null,
    genres: g.genres?.map((x) => x.name).filter(Boolean) ?? [],
  };
}

/** Szuka gier w RAWG. Zwraca do 18 wyników (bez zapisu w bazie). */
export async function searchGames(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const url = `${RAWG}/games?key=${apiKey()}&page_size=18&search=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RAWG search error ${res.status}`);

  const data = (await res.json()) as { results?: RawgGame[] };
  return (data.results ?? [])
    .filter((g) => g.name)
    .slice(0, 18)
    .map(toGame);
}

/**
 * Wspólny pobieracz list gier dla discovery: buduje URL (w try, więc brak klucza
 * też daje []), pobiera i mapuje wyniki. Jedno źródło nie może wywalić discovery.
 */
async function discoverGames(buildUrl: () => string): Promise<ExternalMedia[]> {
  try {
    const res = await fetch(buildUrl());
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: RawgGame[] };
    return (data.results ?? [])
      .filter((g) => g.name)
      .slice(0, 18)
      .map(toGame);
  } catch {
    return [];
  }
}

/** „Odkrywanie" gier: najpopularniejsze (wg `added`) z okna lat (NOWE, bez zapisu). */
export function discoverRawg(yearFrom: number, yearTo: number): Promise<ExternalMedia[]> {
  return discoverGames(
    () =>
      `${RAWG}/games?key=${apiKey()}&page_size=18&ordering=-added` +
      `&dates=${yearFrom}-01-01,${yearTo}-12-31`,
  );
}

/** „Podobne gry" wg RAWG (suggested — dobiera po gatunku/treści). */
export function similarRawg(externalId: string): Promise<ExternalMedia[]> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return Promise.resolve([]);
  return discoverGames(
    () => `${RAWG}/games/${id}/suggested?key=${apiKey()}&page_size=18`,
  );
}

/** Dodaje grę z RAWG do katalogu (upsert po externalId) i zwraca rekord Media. */
export async function addGameFromRawg(externalId: string) {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("externalId musi być liczbą (RAWG id).");
  }

  const res = await fetch(`${RAWG}/games/${id}?key=${apiKey()}`);
  if (res.status === 404) throw new NotFoundError(`Gra RAWG #${id} nie istnieje.`);
  if (!res.ok) throw new Error(`RAWG error ${res.status}`);

  return upsertExternalMedia(MediaType.GRA, toGame((await res.json()) as RawgGame));
}

/** Klip z RAWG: `data` trzyma warianty jakości pod kluczami "480" i "max". */
interface RawgMovie {
  data?: { "480"?: string; max?: string };
}

/**
 * Zwiastun gry (RAWG `/movies`). W przeciwieństwie do filmu i anime to NIE jest
 * osadzenie YouTube, tylko bezpośredni plik mp4 — front musi go puścić w <video>.
 * Null, gdy RAWG nie ma klipu dla tej gry (ma je tylko część tytułów).
 */
export async function gameTrailer(externalId: string): Promise<string | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id) || !process.env.RAWG_API_KEY) return null;

  const res = await fetch(`${RAWG}/games/${id}/movies?key=${apiKey()}`);
  if (!res.ok) return null;

  const { results = [] } = (await res.json()) as { results?: RawgMovie[] };
  const data = results[0]?.data;
  // "max" to najlepsza jakość; gdy jej nie ma, bierzemy 480p — byle cokolwiek zagrało.
  return data?.max ?? data?.["480"] ?? null;
}

/**
 * Data premiery gry (RAWG `released`). Null, gdy nieznana albo gdy RAWG oznacza
 * datę jako orientacyjną (`tba`) — wtedy nie ma czego zapowiadać.
 */
export async function gameReleaseDate(externalId: string): Promise<Date | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id) || !process.env.RAWG_API_KEY) return null;
  const res = await fetch(`${RAWG}/games/${id}?key=${apiKey()}`);
  if (!res.ok) return null;
  const g = (await res.json()) as { released?: string; tba?: boolean };
  if (g.tba) return null;
  return parseReleaseDate(g.released);
}

/** Opis gry (RAWG description_raw) — do widoku szczegółów. Pusty, gdy brak/klucza. */
export async function gameDescription(externalId: string): Promise<string> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id) || !process.env.RAWG_API_KEY) return "";
  const res = await fetch(`${RAWG}/games/${id}?key=${apiKey()}`);
  if (!res.ok) return "";
  const g = (await res.json()) as { description_raw?: string };
  return (g.description_raw ?? "").trim();
}
