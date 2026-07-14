/**
 * Opis i zwiastun tytułu do widoku szczegółów — dobiera źródło po typie mediów.
 * Opis to goły tekst (pusty, gdy brak), zwiastun to adres do osadzenia albo null.
 */
import { aniListDescription, aniListTrailer } from "./anilist.js";
import { bookDescription } from "./books.js";
import { gameDescription, gameTrailer } from "./games.js";
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
 * Zwiastun do pokazania w szczegółach.
 * `kind` mówi frontowi, CZYM to odtworzyć: film (TMDB) i anime (AniList) dają
 * osadzenie YouTube, a gry (RAWG) — goły plik mp4, którego w iframe puścić się nie da.
 * Książki, manga i muzyka zwiastunów nie mają.
 */
export interface Trailer {
  url: string;
  kind: "youtube" | "video";
}

export async function getTrailer(
  type: string,
  externalId: string,
): Promise<Trailer | null> {
  if (type === "game") {
    const url = await gameTrailer(externalId);
    return url ? { url, kind: "video" } : null;
  }
  const url =
    type === "anime"
      ? await aniListTrailer("ANIME", externalId)
      : type === "film"
        ? await tmdbTrailer(externalId)
        : null;
  return url ? { url, kind: "youtube" } : null;
}
