/**
 * Opis i zwiastun tytułu do widoku szczegółów — dobiera źródło po typie mediów.
 * Opis to goły tekst (pusty, gdy brak), zwiastun to adres do osadzenia albo null.
 */
import { aniListDescription, aniListTrailer } from "./anilist.js";
import { bookDescription } from "./books.js";
import { gameDescription } from "./games.js";
import { musicDescription } from "./music.js";
import { tmdbDescription, tmdbTrailer } from "./tmdb.js";

export async function getDescription(type: string, externalId: string): Promise<string> {
  if (type === "book") return bookDescription(externalId);
  if (type === "manga") return aniListDescription("MANGA", externalId);
  if (type === "anime") return aniListDescription("ANIME", externalId);
  if (type === "music") return musicDescription(externalId);
  if (type === "game") return gameDescription(externalId);
  return tmdbDescription(externalId);
}

/**
 * Adres zwiastuna do osadzenia. Mają go tylko filmy (TMDB) i anime (AniList) —
 * dla książek, muzyki, gier i mangi te API zwiastunów nie trzymają.
 */
export async function getTrailer(
  type: string,
  externalId: string,
): Promise<string | null> {
  if (type === "anime") return aniListTrailer("ANIME", externalId);
  if (type === "film") return tmdbTrailer(externalId);
  return null;
}
