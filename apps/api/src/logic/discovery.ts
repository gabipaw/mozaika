/**
 * „Odkrywanie pod gust" — rekomendacje ORYGINALNE (nie z katalogu innych osób).
 *
 * Dwa sygnały, blendowane:
 *  1) PODOBIEŃSTWO (główne): dla tytułów, które user ocenił wysoko, pytamy źródło
 *     o „podobne" (TMDB recommendations / AniList recommendations / RAWG suggested).
 *     Te API dobierają po GATUNKU i treści → trafia w „podobny gatunek" i
 *     „podobne do czegoś, co już oceniłeś".
 *  2) POPULARNOŚĆ + DEKADA (dopełnienie): najpopularniejsze tytuły w ulubionym
 *     rodzaju i dekadzie — używane tylko do uzupełnienia, nie jako jedyny powód.
 *
 * Na końcu odrzucamy to, co user już ocenił, i deduplikujemy. Muzyka (iTunes) i
 * książki (Open Library) nie mają API „podobne/discover” → na razie film/anime/manga/gry.
 */
import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";
import { discoverAniList, similarAniList } from "./anilist.js";
import { discoverRawg, similarRawg } from "./games.js";
import type { ExternalMedia } from "./media.js";
import {
  computeTasteProfile,
  DEFAULT_TASTE_LIMIT,
  makeTasteScorer,
  MIN_TASTE_REVIEWS,
  type RecReason,
  type TasteProfile,
} from "./tasteProfile.js";
import { discoverTmdb, similarTmdb } from "./tmdb.js";

/** Ile rodzajów mediów (najbardziej lubianych) odkrywamy przez popularność. */
export const MAX_DISCOVER_TYPES = 3;
/** Szerokie okno lat, gdy user nie ma wyraźnie ulubionej dekady. */
export const FALLBACK_YEARS_BACK = 15;
/** Od jakiej oceny tytuł staje się „ziarnem" do szukania podobnych. */
export const LIKE_THRESHOLD = 7;
/** Ile najlepiej ocenionych tytułów bierzemy jako ziarna (limit zapytań do API). */
export const MAX_SEEDS = 6;

/** Enum typu (baza) → źródło front + funkcje „discover” i „similar”. */
const DISCOVERABLE: Record<
  string,
  {
    key: string;
    discover: (from: number, to: number) => Promise<ExternalMedia[]>;
    similar: (externalId: string) => Promise<ExternalMedia[]>;
  }
> = {
  FILM: {
    key: "film",
    discover: (f, t) => discoverTmdb(f, t),
    similar: (id) => similarTmdb(id),
  },
  ANIME: {
    key: "anime",
    discover: (f, t) => discoverAniList("ANIME", f, t),
    similar: (id) => similarAniList("ANIME", id),
  },
  MANGA: {
    key: "manga",
    discover: (f, t) => discoverAniList("MANGA", f, t),
    similar: (id) => similarAniList("MANGA", id),
  },
  GRA: {
    key: "game",
    discover: (f, t) => discoverRawg(f, t),
    similar: (id) => similarRawg(id),
  },
};

export interface DiscoverItem extends ExternalMedia {
  type: string; // klucz źródła na froncie (film / anime / manga / game)
  score: number; // przewidywana ocena pod gust (0,5–10)
  reason: RecReason;
}

/** Oceniony tytuł jako kandydat na „ziarno" podobieństwa. */
export interface RatedSeed {
  type: string; // enum typu (FILM/ANIME/…)
  externalId: string;
  title: string;
  rating: number;
  favorite: boolean;
}

/** Które rodzaje mediów odkrywać przez popularność: najlubianiejsze i odkrywalne. */
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

/** Ziarna podobieństwa: wysoko ocenione, odkrywalne tytuły; ulubione i najlepsze wpierw. */
export function pickSeeds(rated: RatedSeed[]): RatedSeed[] {
  return rated
    .filter((r) => DISCOVERABLE[r.type] && r.externalId && r.rating >= LIKE_THRESHOLD)
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.rating - a.rating)
    .slice(0, MAX_SEEDS);
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

/** Usuwa duplikaty po (rodzaj + externalId); pierwszy wygrywa (podobne > popularne). */
export function dedupeByKey(items: DiscoverItem[]): DiscoverItem[] {
  const seen = new Set<string>();
  const out: DiscoverItem[] = [];
  for (const it of items) {
    const key = `${it.type}:${it.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

/** Rekomendacje odkrywcze: świeże tytuły z zewnątrz, głównie „podobne do” Twoich ocen. */
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
      media: { select: { type: true, year: true, externalId: true, title: true } },
    },
  });
  if (reviews.length < MIN_TASTE_REVIEWS) return [];

  const profile = computeTasteProfile(
    reviews.map((r) => ({
      mediaId: r.mediaId,
      rating: r.rating,
      favorite: r.favorite,
      type: r.media.type,
      year: r.media.year,
    })),
  );
  const scorer = makeTasteScorer(profile);

  // Klucz wykluczeń = to, co user już ocenił (rodzaj źródła + externalId).
  const rated = new Set(
    reviews
      .filter((r) => r.media.externalId && DISCOVERABLE[r.media.type])
      .map((r) => `${DISCOVERABLE[r.media.type].key}:${r.media.externalId}`),
  );
  const fresh = (it: DiscoverItem) => !rated.has(`${it.type}:${it.externalId}`);
  const toItem = (
    m: ExternalMedia,
    enumType: string,
    reason: RecReason,
  ): DiscoverItem => ({
    ...m,
    type: DISCOVERABLE[enumType].key,
    score: scorer({ mediaId: 0, type: enumType, year: m.year }).score,
    reason,
  });

  const seeds = pickSeeds(
    reviews.map((r) => ({
      type: r.media.type,
      externalId: r.media.externalId ?? "",
      title: r.media.title,
      rating: r.rating,
      favorite: r.favorite,
    })),
  );
  const types = pickDiscoverTypes(profile);
  const { from, to } = pickYearWindow(profile, new Date().getFullYear());

  // Oba źródła kandydatów równolegle: podobne (per ziarno) + popularne (per rodzaj).
  const [similarRaw, popularRaw] = await Promise.all([
    Promise.all(
      seeds.map(async (s) => {
        const found = await DISCOVERABLE[s.type].similar(s.externalId);
        return found.map((m) => toItem(m, s.type, { kind: "similar", to: s.title }));
      }),
    ),
    Promise.all(
      types.map(async (enumType) => {
        const found = await DISCOVERABLE[enumType].discover(from, to);
        return found.map((m) =>
          toItem(
            m,
            enumType,
            scorer({ mediaId: 0, type: enumType, year: m.year }).reason,
          ),
        );
      }),
    ),
  ]);

  // Przeplot po ZIARNACH/rodzajach (round-robin), by nie zdominował jeden tytuł.
  const similar = dedupeByKey(interleave(similarRaw).filter(fresh));
  const popular = dedupeByKey(interleave(popularRaw).filter(fresh));

  // Podobne najpierw, popularne dopełniają; dedupe usuwa powtórki między strumieniami.
  return dedupeByKey([...similar, ...popular]).slice(0, limit);
}
