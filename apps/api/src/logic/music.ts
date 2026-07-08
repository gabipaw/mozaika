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
