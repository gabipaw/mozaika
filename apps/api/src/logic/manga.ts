/**
 * Integracja z AniList (GraphQL) — wyszukiwanie mangi.
 * Darmowe, bez klucza, własna baza (niezależna od MyAnimeList/Jikan, które bywa 504).
 * WAŻNE: jedna manga = jeden wpis serii (nie pojedyncze tomy).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const ANILIST = "https://graphql.anilist.co";

// Wspólny zestaw pól dla wyszukiwania i pojedynczego tytułu (bez duplikacji zapytań).
const MEDIA_FIELDS = `
  id
  title { romaji english }
  startDate { year }
  coverImage { large }
  staff(perPage: 1, sort: RELEVANCE) { nodes { name { full } } }
`;

interface AniListMedia {
  id: number;
  title: { romaji?: string | null; english?: string | null };
  startDate?: { year?: number | null };
  coverImage?: { large?: string | null };
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

function toManga(m: AniListMedia): ExternalMedia {
  const author = (m.staff?.nodes?.[0]?.name?.full ?? "").trim();
  const title = (m.title.english || m.title.romaji || "").trim();
  return {
    externalId: String(m.id),
    title: author ? `${title} — ${author}` : title,
    year: m.startDate?.year ?? null,
    posterUrl: m.coverImage?.large ?? null,
  };
}

/** Szuka mang w AniList. Zwraca do 18 serii (bez zapisu w bazie). */
export async function searchManga(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const data = await gql<{ Page: { media: AniListMedia[] } }>(
    `query ($q: String) { Page(perPage: 18) { media(search: $q, type: MANGA, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } } }`,
    { q },
  );
  return (data.Page.media ?? [])
    .filter((m) => m.id && (m.title.english || m.title.romaji))
    .map(toManga);
}

/** Dodaje mangę z AniList do katalogu (upsert po externalId = AniList id). */
export async function addMangaFromAniList(externalId: string) {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("externalId musi być liczbą (AniList id).");
  }

  const data = await gql<{ Media: AniListMedia | null }>(
    `query ($id: Int) { Media(id: $id, type: MANGA) { ${MEDIA_FIELDS} } }`,
    { id: Number(id) },
  );
  if (!data.Media) throw new NotFoundError(`Manga AniList #${id} nie istnieje.`);
  return upsertExternalMedia(MediaType.MANGA, toManga(data.Media));
}
