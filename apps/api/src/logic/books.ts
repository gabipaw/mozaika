/**
 * Integracja z Open Library — wyszukiwanie książek i dodawanie ich do katalogu.
 * Open Library jest darmowe i nie wymaga klucza API (żadnej konfiguracji na serwerze).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { aniListTitles } from "./anilist.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const OL = "https://openlibrary.org";
const COVER = "https://covers.openlibrary.org/b/id";

function coverUrl(coverId: number | null | undefined): string | null {
  return coverId ? `${COVER}/${coverId}-L.jpg` : null;
}

// Oznaczenia tomu/części w wielu językach: "Vol. 1", "Tome 01", "Part7", "Parte 7", "Band 3"…
// (brak \b po słowie celowo — łapie też sklejone formy typu "Part7").
const VOLUME_MARKER =
  /\b(volume|vol|tome|tomo|tom|teil|band|parte|part|deel|book)\.?\s*#?\s*\d+/gi;

/**
 * Usuwa z tytułu oznaczenia tomu/wydania (Vol/Tome/Part/…, "#3", końcowy numer),
 * żeby wszystkie tomy jednej serii zwijały się do jednego tytułu (np. "Naruto").
 */
function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/[,:#._-]+/g, " ")
    .replace(VOLUME_MARKER, " ")
    .replace(/\s+\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || raw.trim();
}

/**
 * Klucz do zwijania tomów tej samej serii. Agresywnie normalizuje: bez oznaczeń tomu,
 * bez znaków niełacińskich (jap./interpunkcja) i diakrytyków — dzięki temu warianty
 * "STEEL BALL RUN 1", "…スティール… 3", "…Vol. 9" trafiają pod jeden klucz.
 */
function dedupKey(raw: string): string {
  return cleanTitle(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Klucz do por\u00f3wnywania ksi\u0105\u017cki z mang\u0105 \u2014 same znaki alfanumeryczne (bez spacji,
 * apostrof\u00f3w, my\u015blnik\u00f3w), \u017ceby "JoJo's Bizarre\u2026" i "JOJOS BIZARRE\u2026" si\u0119 zr\u00f3wna\u0142y.
 */
function matchKey(raw: string): string {
  return cleanTitle(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
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
 * tomy tej samej serii do jednego wpisu. Zwraca do 18 wyników.
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

  // Manga trafia do Open Library jako „książki" (tomy) — pytamy AniList o tę samą
  // frazę i wykluczamy z wyników książek tytuły, które są mangą (mają swoją zakładkę).
  const mangaKeys = (await aniListTitles("MANGA", q))
    .map(matchKey)
    .filter((k) => k.length >= 5);

  const seen = new Set<string>();
  const out: ExternalMedia[] = [];
  for (const d of data.docs ?? []) {
    if (!d.title || !d.key || !d.cover_i) continue; // tylko z okładką
    const key = dedupKey(d.title);
    if (!key || seen.has(key)) continue; // ten sam tytuł (kolejny tom serii) już był
    if (isManga(matchKey(d.title), mangaKeys)) continue; // manga → zakładka Manga
    seen.add(key);
    out.push(toBook(d));
    if (out.length >= 18) break;
  }
  return out;
}

/** Czy klucz tytułu książki pasuje do którejś mangi (zawiera się / jest zawarty). */
function isManga(bookKey: string, mangaKeys: string[]): boolean {
  if (bookKey.length < 5) return false;
  return mangaKeys.some((mk) => mk.includes(bookKey) || bookKey.includes(mk));
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

/** Opis książki (Open Library) — do widoku szczegółów. Pusty, gdy brak. */
export async function bookDescription(externalId: string): Promise<string> {
  const id = externalId.trim();
  if (!/^OL[0-9]+[A-Z]$/.test(id)) return "";
  const res = await fetch(`${OL}/works/${id}.json`);
  if (!res.ok) return "";
  const w = (await res.json()) as { description?: string | { value?: string } };
  const d =
    typeof w.description === "string" ? w.description : (w.description?.value ?? "");
  return d.trim();
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
