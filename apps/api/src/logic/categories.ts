/**
 * Podział typów mediów na kategorie — takie same, jakimi profil dzieli okładki
 * (CAT_GROUPS w app.js). Film i serial to dla użytkownika jedna półka, tak samo
 * książka i manga; TOP 4 liczy się właśnie na półkach, nie na surowym enumie.
 */
import { MediaType } from "@prisma/client";

export const CATEGORIES: Record<string, MediaType[]> = {
  music: [MediaType.MUZYKA],
  film: [MediaType.FILM, MediaType.SERIAL],
  anime: [MediaType.ANIME],
  book: [MediaType.KSIAZKA, MediaType.MANGA],
  game: [MediaType.GRA],
};

/** Ile tytułów można przypiąć do TOP 4 w JEDNEJ kategorii. */
export const MAX_FAVORITES = 4;

/** Klucz kategorii danego typu (np. SERIAL → "film"). */
export function categoryOf(type: MediaType): string {
  for (const [key, types] of Object.entries(CATEGORIES)) {
    if (types.includes(type)) return key;
  }
  return "film"; // enum nie ma innych wartości, ale nie zgadujemy po cichu
}

/** Typy z tej samej półki co podany (np. FILM → [FILM, SERIAL]). */
export function siblingTypes(type: MediaType): MediaType[] {
  return CATEGORIES[categoryOf(type)];
}
