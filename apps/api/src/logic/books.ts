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

/**
 * Usuwa z tytułu oznaczenia tomu/wydania ("Vol. 1", "Tom 2", "#3", końcowy numer),
 * żeby wszystkie tomy jednej serii zwijały się do jednego tytułu (np. "Naruto").
 */
function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/[,:#]/g, " ")
    .replace(/\b(vol|volume|tom|no|nr|part|cz|czesc|book)\b\.?\s*\d+/gi, " ")
    .replace(/\s+\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || raw.trim();
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
  const title = cleanTitle(d.title);
  return {
    externalId: d.key.replace("/works/", ""),
    title: author ? `${title} — ${author}` : title,
    year: d.first_publish_year ?? null,
    posterUrl: coverUrl(d.cover_i),
  };
}

/**
 * Szuka książek w Open Library. Pomija pozycje bez okładki i zwija wszystkie
 * tomy tej samej serii/autora do jednego wpisu. Zwraca do 18 wyników.
 */
export async function searchBooks(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  // Pobieramy z zapasem (60), bo po odfiltrowaniu bez-okładek i dedupie zostaje mniej.
  const url =
    `${OL}/search.json?limit=60` +
    `&fields=key,title,first_publish_year,cover_i,author_name` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library search error ${res.status}`);

  const data = (await res.json()) as { docs?: OlDoc[] };
  const seen = new Set<string>();
  const out: ExternalMedia[] = [];
  for (const d of data.docs ?? []) {
    if (!d.title || !d.key || !d.cover_i) continue; // tylko z okładką
    const key = `${cleanTitle(d.title).toLowerCase()}|${(d.author_name?.[0] ?? "").toLowerCase()}`;
    if (seen.has(key)) continue; // ten sam tytuł+autor już był (kolejny tom)
    seen.add(key);
    out.push(toBook(d));
    if (out.length >= 18) break;
  }
  return out;
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
  const baseTitle = cleanTitle(work.title ?? id);
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
