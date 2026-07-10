/**
 * „Odkrywanie pod gust" — rekomendacje ORYGINALNE (nie z katalogu innych osób).
 *
 * Zamiast przestawiać katalog, pytamy zewnętrzne źródła (TMDB / AniList / RAWG)
 * o najpopularniejsze tytuły w rodzajach i dekadzie, które użytkownik ocenia wysoko,
 * a potem odrzucamy to, co już ocenił. Wynik to NOWE tytuły dobrane do jego gustu.
 *
 * Muzyka (iTunes) i książki (Open Library) mają tylko wyszukiwarkę (bez „discover”),
 * więc na razie odkrywamy film / anime / manga / gry.
 */
import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";
import { discoverAniList } from "./anilist.js";
import { discoverRawg } from "./games.js";
import type { ExternalMedia } from "./media.js";
import {
  computeTasteProfile,
  DEFAULT_TASTE_LIMIT,
  makeTasteScorer,
  MIN_TASTE_REVIEWS,
  type RecReason,
  type TasteProfile,
  type TasteReview,
} from "./tasteProfile.js";
import { discoverTmdb } from "./tmdb.js";

/** Ile rodzajów mediów (najbardziej lubianych) odkrywamy naraz. */
export const MAX_DISCOVER_TYPES = 3;
/** Szerokie okno lat, gdy user nie ma wyraźnie ulubionej dekady. */
export const FALLBACK_YEARS_BACK = 15;

/** Enum typu (baza) → { klucz źródła na froncie, funkcja „discover”. } */
const DISCOVERABLE: Record<
  string,
  { key: string; discover: (from: number, to: number) => Promise<ExternalMedia[]> }
> = {
  FILM: { key: "film", discover: (f, t) => discoverTmdb(f, t) },
  ANIME: { key: "anime", discover: (f, t) => discoverAniList("ANIME", f, t) },
  MANGA: { key: "manga", discover: (f, t) => discoverAniList("MANGA", f, t) },
  GRA: { key: "game", discover: (f, t) => discoverRawg(f, t) },
};

export interface DiscoverItem extends ExternalMedia {
  type: string; // klucz źródła na froncie (film / anime / manga / game)
  score: number; // przewidywana ocena pod gust (0,5–10)
  reason: RecReason;
}

/** Które rodzaje mediów odkrywać: najlubianiejsze, ale tylko te z „discover”. */
export function pickDiscoverTypes(profile: TasteProfile): string[] {
  return profile.types
    .filter((a) => DISCOVERABLE[a.key])
    .slice(0, MAX_DISCOVER_TYPES)
    .map((a) => a.key);
}

/** Okno lat: ulubiona dekada (jeśli ma poparcie), inaczej ostatnie N lat. */
export function pickYearWindow(
  profile: TasteProfile,
  currentYear: number,
): { from: number; to: number } {
  const fav = profile.decades.find((d) => d.count >= 2 && d.delta > 0);
  if (fav) {
    const from = Number(fav.key);
    return { from, to: from + 9 };
  }
  return { from: currentYear - FALLBACK_YEARS_BACK, to: currentYear };
}

/** Przeplata listy (round-robin), by wynik był miksem rodzajów, nie blokami. */
export function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const longest = lists.reduce((m, l) => Math.max(m, l.length), 0);
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
}

/** Rekomendacje odkrywcze dla użytkownika — świeże tytuły z zewnątrz, pod jego gust. */
export async function tasteDiscovery(
  userId: number,
  limit: number = DEFAULT_TASTE_LIMIT,
): Promise<DiscoverItem[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError(`Użytkownik #${userId} nie istnieje.`);

  const reviews = await prisma.review.findMany({
    where: { userId },
    select: {
      mediaId: true,
      rating: true,
      favorite: true,
      media: { select: { type: true, year: true, externalId: true } },
    },
  });
  if (reviews.length < MIN_TASTE_REVIEWS) return [];

  const tasteReviews: TasteReview[] = reviews.map((r) => ({
    mediaId: r.mediaId,
    rating: r.rating,
    favorite: r.favorite,
    type: r.media.type,
    year: r.media.year,
  }));

  const profile = computeTasteProfile(tasteReviews);
  const scorer = makeTasteScorer(profile);

  const types = pickDiscoverTypes(profile);
  if (types.length === 0) return [];
  const { from, to } = pickYearWindow(profile, new Date().getFullYear());

  // Wyklucz to, co user już ocenił (klucz = typ + externalId ze źródła).
  const rated = new Set(
    reviews
      .filter((r) => r.media.externalId)
      .map((r) => `${r.media.type}:${r.media.externalId}`),
  );

  const perType = await Promise.all(
    types.map(async (enumType) => {
      const src = DISCOVERABLE[enumType];
      const found = await src.discover(from, to);
      return found
        .filter((m) => !rated.has(`${enumType}:${m.externalId}`))
        .map<DiscoverItem>((m) => ({
          ...m,
          type: src.key,
          ...scorer({ mediaId: 0, type: enumType, year: m.year }),
        }));
    }),
  );

  return interleave(perType).slice(0, limit);
}
