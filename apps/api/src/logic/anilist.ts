/**
 * Integracja z AniList (GraphQL) — wyszukiwanie MANGI i ANIME.
 * Darmowe, bez klucza, własna baza (niezależna od MyAnimeList/Jikan).
 * WAŻNE: jeden tytuł = jeden wpis serii (nie tomy/odcinki).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const ANILIST = "https://graphql.anilist.co";

/** Typ mediów w AniList (literał enuma GraphQL — stała, nie dane od usera). */
export type AniType = "MANGA" | "ANIME";

// Wspólny zestaw pól. Autor (manga) → staff; twórca (anime) → główne studio.
const MEDIA_FIELDS = `
  id
  title { romaji english }
  startDate { year }
  coverImage { large }
  studios(isMain: true) { nodes { name } }
  staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }
`;

interface AniListMedia {
  id: number;
  title: { romaji?: string | null; english?: string | null };
  startDate?: { year?: number | null };
  coverImage?: { large?: string | null };
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
    `query ($q: String) { Page(perPage: 18) { media(search: $q, type: ${type}, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } } }`,
    { q },
  );
  return (data.Page.media ?? [])
    .filter((m) => m.id && (m.title.english || m.title.romaji))
    .map(toMedia);
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

/**
 * Surowe tytuły (romaji + english) dla frazy — do wykluczania mangi/anime z innych
 * zakładek (np. mangi z Książek). Gdy AniList niedostępny, zwraca [] (nie blokuje).
 */
export async function aniListTitles(type: AniType, query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const data = await gql<{ Page: { media: AniListMedia[] } }>(
      `query ($q: String) { Page(perPage: 18) { media(search: $q, type: ${type}, sort: SEARCH_MATCH) { id title { romaji english } } } }`,
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
