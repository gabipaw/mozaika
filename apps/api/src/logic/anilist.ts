/**
 * Integracja z AniList (GraphQL) — wyszukiwanie MANGI i ANIME.
 * Darmowe, bez klucza, własna baza (niezależna od MyAnimeList/Jikan).
 * WAŻNE: jeden tytuł = jeden wpis serii (nie tomy/odcinki).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, parseReleaseDate, upsertExternalMedia } from "./media.js";

const ANILIST = "https://graphql.anilist.co";

/** Typ mediów w AniList (literał enuma GraphQL — stała, nie dane od usera). */
export type AniType = "MANGA" | "ANIME";

// Wspólny zestaw pól. Autor (manga) → staff; twórca (anime) → główne studio.
const MEDIA_FIELDS = `
  id
  title { romaji english }
  startDate { year }
  coverImage { large }
  genres
  studios(isMain: true) { nodes { name } }
  staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }
`;

// Stały zestaw nazw gatunków AniList (do filtrowania afinności pod discover po gatunku).
export const ANILIST_GENRES = new Set([
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Ecchi",
  "Fantasy",
  "Horror",
  "Mahou Shoujo",
  "Mecha",
  "Music",
  "Mystery",
  "Psychological",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
]);

interface AniListMedia {
  id: number;
  title: { romaji?: string | null; english?: string | null };
  startDate?: { year?: number | null };
  coverImage?: { large?: string | null };
  genres?: string[];
  studios?: { nodes?: { name?: string }[] };
  staff?: { nodes?: { name?: { full?: string | null } }[] };
}

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList error ${res.status}`);
  const json = (await res.json()) as { data?: T };
  if (!json.data) throw new Error("AniList: brak danych.");
  return json.data;
}

function toMedia(m: AniListMedia): ExternalMedia {
  const byline = (
    m.studios?.nodes?.[0]?.name ??
    m.staff?.nodes?.[0]?.name?.full ??
    ""
  ).trim();
  const title = (m.title.english || m.title.romaji || "").trim();
  return {
    externalId: String(m.id),
    title: byline ? `${title} — ${byline}` : title,
    year: m.startDate?.year ?? null,
    posterUrl: m.coverImage?.large ?? null,
    genres: m.genres ?? [],
  };
}

/** Szuka mang/anime w AniList. Zwraca do 18 serii (bez zapisu w bazie). */
export async function searchAniList(
  type: AniType,
  query: string,
): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const data = await gql<{ Page: { media: AniListMedia[] } }>(
    `query ($q: String) { Page(perPage: 18) { media(search: $q, type: ${type}, isAdult: false, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } } }`,
    { q },
  );
  return (data.Page.media ?? [])
    .filter((m) => m.id && (m.title.english || m.title.romaji))
    .map(toMedia);
}

/** Wspólny bieg discovery: zapytanie Page.media → lista serii; błąd → [] (nie blokuje). */
async function pageMedia(
  query: string,
  vars: Record<string, unknown>,
): Promise<ExternalMedia[]> {
  try {
    const data = await gql<{ Page: { media: AniListMedia[] } }>(query, vars);
    return (data.Page.media ?? [])
      .filter((m) => m.id && (m.title.english || m.title.romaji))
      .map(toMedia);
  } catch {
    return [];
  }
}

/**
 * „Odkrywanie" mangi/anime: najpopularniejsze serie z danego okna lat (bez zapisu).
 * Źródło NOWYCH kandydatów pod gust. Błąd/niedostępność → [] (nie blokuje discovery).
 */
export function discoverAniList(
  type: AniType,
  yearFrom: number,
  yearTo: number,
): Promise<ExternalMedia[]> {
  return pageMedia(
    `query ($from: FuzzyDateInt, $to: FuzzyDateInt) { Page(perPage: 18) { media(type: ${type}, isAdult: false, sort: POPULARITY_DESC, startDate_greater: $from, startDate_lesser: $to) { ${MEDIA_FIELDS} } } }`,
    { from: yearFrom * 10000, to: (yearTo + 1) * 10000 }, // FuzzyDateInt = YYYYMMDD
  );
}

/**
 * „Podobne serie" wg AniList (pole recommendations — dobiera po gatunku/treści).
 * Zasila rekomendacje „bo podobne do tytułu, który oceniłeś". Błąd → [] (nie blokuje).
 */
export async function similarAniList(
  type: AniType,
  externalId: string,
): Promise<ExternalMedia[]> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return [];
  try {
    const data = await gql<{
      Media: {
        recommendations?: { nodes?: { mediaRecommendation?: AniListMedia | null }[] };
      } | null;
    }>(
      `query ($id: Int) { Media(id: $id, type: ${type}) { recommendations(perPage: 18, sort: RATING_DESC) { nodes { mediaRecommendation { ${MEDIA_FIELDS} } } } } }`,
      { id: Number(id) },
    );
    const nodes = data.Media?.recommendations?.nodes ?? [];
    return nodes
      .map((n) => n.mediaRecommendation)
      .filter((m): m is AniListMedia => !!m?.id && !!(m.title.english || m.title.romaji))
      .map(toMedia);
  } catch {
    return [];
  }
}

/** „Odkrywanie" mangi/anime danego GATUNKU w oknie lat — „lubisz sci-fi → oto sci-fi". */
export function discoverAniListByGenre(
  type: AniType,
  genre: string,
  yearFrom: number,
  yearTo: number,
): Promise<ExternalMedia[]> {
  return pageMedia(
    `query ($genre: String, $from: FuzzyDateInt, $to: FuzzyDateInt) { Page(perPage: 18) { media(type: ${type}, isAdult: false, sort: POPULARITY_DESC, genre: $genre, startDate_greater: $from, startDate_lesser: $to) { ${MEDIA_FIELDS} } } }`,
    { genre, from: yearFrom * 10000, to: (yearTo + 1) * 10000 },
  );
}

/** Dodaje mangę/anime z AniList do katalogu (upsert po externalId = AniList id). */
export async function addFromAniList(type: AniType, externalId: string) {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("externalId musi być liczbą (AniList id).");
  }

  const data = await gql<{ Media: AniListMedia | null }>(
    `query ($id: Int) { Media(id: $id, type: ${type}) { ${MEDIA_FIELDS} } }`,
    { id: Number(id) },
  );
  if (!data.Media) throw new NotFoundError(`AniList ${type} #${id} nie istnieje.`);
  const mediaType = type === "ANIME" ? MediaType.ANIME : MediaType.MANGA;
  return upsertExternalMedia(mediaType, toMedia(data.Media));
}

/** Opis mangi/anime (AniList, bez HTML) — do widoku szczegółów. Pusty, gdy brak. */
export async function aniListDescription(
  type: AniType,
  externalId: string,
): Promise<string> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return "";
  try {
    const data = await gql<{ Media: { description?: string | null } | null }>(
      `query ($id: Int) { Media(id: $id, type: ${type}) { description(asHtml: false) } }`,
      { id: Number(id) },
    );
    return (data.Media?.description ?? "").replace(/<[^>]+>/g, "").trim();
  } catch {
    return "";
  }
}

/**
 * Data premiery anime/mangi (AniList `startDate`). AniList często zna tylko rok
 * albo rok i miesiąc — wtedy zwracamy null, bo do zapowiedzi potrzebny jest dzień.
 */
export async function aniListReleaseDate(
  type: AniType,
  externalId: string,
): Promise<Date | null> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return null;
  try {
    const data = await gql<{
      Media: {
        startDate?: { year?: number | null; month?: number | null; day?: number | null };
      } | null;
    }>(
      `query ($id: Int) { Media(id: $id, type: ${type}) { startDate { year month day } } }`,
      { id: Number(id) },
    );
    const d = data.Media?.startDate;
    if (!d?.year || !d.month || !d.day) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return parseReleaseDate(`${d.year}-${pad(d.month)}-${pad(d.day)}`);
  } catch {
    return null;
  }
}

/**
 * Surowe tytuły (romaji + english) dla frazy — do wykluczania mangi/anime z innych
 * zakładek (np. mangi z Książek). Gdy AniList niedostępny, zwraca [] (nie blokuje).
 */
export async function aniListTitles(type: AniType, query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const data = await gql<{ Page: { media: AniListMedia[] } }>(
      `query ($q: String) { Page(perPage: 18) { media(search: $q, type: ${type}, isAdult: false, sort: SEARCH_MATCH) { id title { romaji english } } } }`,
      { q },
    );
    const out: string[] = [];
    for (const m of data.Page.media ?? []) {
      if (m.title.romaji) out.push(m.title.romaji);
      if (m.title.english) out.push(m.title.english);
    }
    return out;
  } catch {
    return [];
  }
}
