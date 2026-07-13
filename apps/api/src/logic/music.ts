/**
 * Integracja z iTunes Search API (Apple) — wyszukiwanie albumów muzycznych.
 * Darmowe, bez klucza. Jednostka = album (naturalny odpowiednik filmu/książki).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const ITUNES = "https://itunes.apple.com";

interface ItunesAlbum {
  collectionId: number;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string | null;
  releaseDate?: string;
  primaryGenreName?: string;
  trackCount?: number;
  copyright?: string;
}

/** Podmienia miniaturę 100x100 na większą okładkę. */
function bigArt(url: string | null | undefined): string | null {
  return url ? url.replace(/\/\d+x\d+bb\.(jpg|png)$/, "/600x600bb.$1") : null;
}

function toAlbum(a: ItunesAlbum): ExternalMedia {
  const artist = (a.artistName ?? "").trim();
  const title = (a.collectionName ?? "").trim();
  return {
    externalId: String(a.collectionId),
    title: artist ? `${title} — ${artist}` : title,
    year: a.releaseDate ? Number(a.releaseDate.slice(0, 4)) || null : null,
    posterUrl: bigArt(a.artworkUrl100),
    genres: a.primaryGenreName ? [a.primaryGenreName] : [],
  };
}

/** Szuka albumów w iTunes. Zwraca do 18 wyników (bez zapisu w bazie). */
export async function searchMusic(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  const url = `${ITUNES}/search?entity=album&limit=18&term=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`iTunes search error ${res.status}`);

  const data = (await res.json()) as { results?: ItunesAlbum[] };
  return (data.results ?? [])
    .filter((a) => a.collectionId && a.collectionName)
    .slice(0, 18)
    .map(toAlbum);
}

/** Dodaje album z iTunes do katalogu (upsert po externalId = collectionId). */
export async function addMusicFromItunes(externalId: string) {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) {
    throw new ValidationError("externalId musi być liczbą (iTunes collectionId).");
  }

  const res = await fetch(`${ITUNES}/lookup?id=${id}`);
  if (!res.ok) throw new Error(`iTunes error ${res.status}`);

  const data = (await res.json()) as { results?: ItunesAlbum[] };
  const album = (data.results ?? []).find((a) => String(a.collectionId) === id);
  if (!album) throw new NotFoundError(`Album iTunes #${id} nie istnieje.`);
  return upsertExternalMedia(MediaType.MUZYKA, toAlbum(album));
}

interface ItunesTrack {
  wrapperType?: string;
  trackName?: string;
  trackNumber?: number;
}

/** „Opis" albumu = nagłówek (gatunek · liczba utworów) + lista utworów (z iTunes). */
export async function musicDescription(externalId: string): Promise<string> {
  const id = externalId.trim();
  if (!/^\d+$/.test(id)) return "";
  const res = await fetch(`${ITUNES}/lookup?id=${id}&entity=song`);
  if (!res.ok) return "";
  const data = (await res.json()) as { results?: (ItunesAlbum & ItunesTrack)[] };
  const results = data.results ?? [];

  const album = results.find((x) => String(x.collectionId) === id && x.collectionName);
  const header: string[] = [];
  if (album?.primaryGenreName) header.push(album.primaryGenreName);
  if (album?.trackCount) header.push(`${album.trackCount} utworów`);

  const tracks = results
    .filter((x) => x.wrapperType === "track" && x.trackName)
    .sort((a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0))
    .map((x) => `${x.trackNumber}. ${x.trackName}`);

  return [header.join(" · "), ...tracks].filter(Boolean).join("\n");
}

/**
 * Gatunki iTunes (`primaryGenreName`, tak je zapisujemy w bazie) → id kanału RSS
 * „top albums". ID sprawdzone na żywym API — Apple nie publikuje ich w dokumentacji.
 */
const ITUNES_GENRE_IDS: Record<string, number> = {
  Pop: 14,
  Rock: 21,
  Alternative: 20,
  "Hip-Hop/Rap": 18,
  "R&B/Soul": 15,
  Electronic: 7,
  Dance: 17,
  Jazz: 11,
  Classical: 5,
  Country: 6,
  Soundtrack: 16,
  Reggae: 24,
  Blues: 2,
};

/** Czy iTunes ma kanał „top albums" dla tego gatunku. */
export function recognizesMusicGenre(genre: string): boolean {
  return genre in ITUNES_GENRE_IDS;
}

interface RssEntry {
  id?: { attributes?: { "im:id"?: string } };
  "im:name"?: { label?: string };
  "im:artist"?: { label?: string };
  "im:image"?: { label?: string }[];
  "im:releaseDate"?: { label?: string };
  category?: { attributes?: { label?: string } };
}

/**
 * UWAGA: gdy kanał zwróci DOKŁADNIE JEDEN album, Apple podaje `entry` jako obiekt,
 * a nie tablicę jednoelementową. Kod zakładający tablicę cicho zwracał pustkę.
 */
function rssEntries(feed: { entry?: RssEntry | RssEntry[] } | undefined): RssEntry[] {
  const e = feed?.entry;
  if (!e) return [];
  return Array.isArray(e) ? e : [e];
}

function fromRss(e: RssEntry): ExternalMedia | null {
  const externalId = e.id?.attributes?.["im:id"];
  const album = (e["im:name"]?.label ?? "").trim();
  if (!externalId || !album) return null;

  const artist = (e["im:artist"]?.label ?? "").trim();
  const images = e["im:image"] ?? [];
  const date = e["im:releaseDate"]?.label ?? "";
  const genre = e.category?.attributes?.label;
  return {
    externalId,
    title: artist ? `${album} — ${artist}` : album,
    year: date ? Number(date.slice(0, 4)) || null : null,
    // ostatnia miniatura = największa; bigArt podmienia ją na okładkę 600x600
    posterUrl: bigArt(images[images.length - 1]?.label),
    genres: genre ? [genre] : [],
  };
}

/** Najpopularniejsze albumy (opcjonalnie w gatunku). Błąd źródła = pusta lista. */
async function topAlbums(genreId?: number): Promise<ExternalMedia[]> {
  const genre = genreId ? `genre=${genreId}/` : "";
  try {
    const res = await fetch(`${ITUNES}/pl/rss/topalbums/limit=20/${genre}json`);
    if (!res.ok) return [];
    const data = (await res.json()) as { feed?: { entry?: RssEntry | RssEntry[] } };
    return rssEntries(data.feed)
      .map(fromRss)
      .filter((m): m is ExternalMedia => m !== null);
  } catch {
    return [];
  }
}

/**
 * „Odkrywanie" muzyki: najpopularniejsze albumy. iTunes nie ma API „podobne" ani
 * filtra po roku, więc — inaczej niż filmy/gry — muzyka opiera się na popularności
 * (i na gatunku, gdy znamy Twój ulubiony).
 */
export function discoverMusic(): Promise<ExternalMedia[]> {
  return topAlbums();
}

/** Najpopularniejsze albumy w danym gatunku. */
export function discoverMusicByGenre(genre: string): Promise<ExternalMedia[]> {
  const id = ITUNES_GENRE_IDS[genre];
  return id ? topAlbums(id) : Promise.resolve([]);
}
