/**
 * Opis tytułu do widoku szczegółów — dobiera źródło po typie mediów.
 * Każde źródło zwraca goły tekst (puste, gdy brak opisu).
 */
import { aniListDescription } from "./anilist.js";
import { bookDescription } from "./books.js";
import { gameDescription } from "./games.js";
import { musicDescription } from "./music.js";
import { tmdbDescription } from "./tmdb.js";

export async function getDescription(type: string, externalId: string): Promise<string> {
  if (type === "book") return bookDescription(externalId);
  if (type === "manga") return aniListDescription("MANGA", externalId);
  if (type === "anime") return aniListDescription("ANIME", externalId);
  if (type === "music") return musicDescription(externalId);
  if (type === "game") return gameDescription(externalId);
  return tmdbDescription(externalId);
}
