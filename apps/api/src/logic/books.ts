/**
 * Integracja z Open Library — wyszukiwanie książek i dodawanie ich do katalogu.
 * Open Library jest darmowe i nie wymaga klucza API (żadnej konfiguracji na serwerze).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const OL = "https://openlibrary.org";
const COVER = "https://covers.openlibrary.org/b/id";

function coverUrl(coverId: number | null | undefined): string | null {
  return coverId ? `${COVER}/${coverId}-L.jpg` : null;
}

interface OlDoc {
  key: string; // np. "/works/OL45804W"
  title: string;
  first_publish_year?: number;
  cover_i?: number;
  author_name?: string[];
}

function toBook(d: OlDoc): ExternalMedia {
  const author = d.author_name?.[0];
  return {
    externalId: d.key.replace("/works/", ""),
    title: author ? `${d.title} — ${author}` : d.title,
    year: d.first_publish_year ?? null,
    posterUrl: coverUrl(d.cover_i),
  };
}

/** Szuka książek w Open Library. Zwraca do 18 wyników (bez zapisu w bazie). */
export async function searchBooks(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const url =
    `${OL}/search.json?limit=18` +
    `&fields=key,title,first_publish_year,cover_i,author_name` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library search error ${res.status}`);

  const data = (await res.json()) as { docs?: OlDoc[] };
  return (data.docs ?? [])
    .filter((d) => d.title && d.key)
    .slice(0, 18)
    .map(toBook);
}

/** Dodaje książkę z Open Library do katalogu (upsert po externalId). */
export async function addBookFromOpenLibrary(externalId: string) {
  const id = externalId.trim();
  if (!/^OL[0-9]+[A-Z]$/.test(id)) {
    throw new ValidationError("externalId musi być kluczem Open Library (np. OL45804W).");
  }

  const res = await fetch(`${OL}/works/${id}.json`);
  if (res.status === 404)
    throw new NotFoundError(`Książka Open Library ${id} nie istnieje.`);
  if (!res.ok) throw new Error(`Open Library error ${res.status}`);

  const work = (await res.json()) as {
    title?: string;
    covers?: number[];
    first_publish_date?: string;
    authors?: { author?: { key?: string } }[];
  };
  const year = work.first_publish_date
    ? Number((work.first_publish_date.match(/\d{4}/) ?? [])[0]) || null
    : null;
  const author = await authorName(work.authors?.[0]?.author?.key);
  const baseTitle = work.title ?? id;
  return upsertExternalMedia(MediaType.KSIAZKA, {
    externalId: id,
    title: author ? `${baseTitle} — ${author}` : baseTitle,
    year,
    posterUrl: coverUrl(work.covers?.[0]),
  });
}

/** Pobiera imię i nazwisko autora z Open Library (puste, gdy się nie uda — autor opcjonalny). */
async function authorName(key: string | undefined): Promise<string> {
  if (!key) return "";
  try {
    const res = await fetch(`${OL}${key}.json`);
    if (!res.ok) return "";
    return String(((await res.json()) as { name?: string }).name ?? "").trim();
  } catch {
    return "";
  }
}
