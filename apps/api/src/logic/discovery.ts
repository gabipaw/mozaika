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
 * Na końcu odrzucamy to, co user już ocenił, i deduplikujemy.
 *
 * Wyjątek: KSIĄŻKI (Open Library) i MUZYKA (iTunes) nie mają API „podobne do", więc
 * dla nich sygnał (1) odpada — jadą na gatunku i popularności. Gatunek książki bierzemy
 * z gustu nauczonego na filmach, bo książki nie mają gatunków w bazie.
 */
import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";
import {
  ANILIST_GENRES,
  discoverAniList,
  discoverAniListByGenre,
  similarAniList,
} from "./anilist.js";
import { discoverBooks, discoverBooksByGenre, recognizesBookGenre } from "./books.js";
import { discoverRawg, similarRawg } from "./games.js";
import { discoverMusic, discoverMusicByGenre, recognizesMusicGenre } from "./music.js";
import type { ExternalMedia } from "./media.js";
import {
  computeTasteProfile,
  makeTasteScorer,
  MIN_TASTE_REVIEWS,
  type RecReason,
  type TasteProfile,
} from "./tasteProfile.js";
import {
  discoverTmdb,
  discoverTmdbByGenre,
  similarTmdb,
  TMDB_GENRE_IDS,
} from "./tmdb.js";

/** Ile rodzajów mediów (najbardziej lubianych) odkrywamy przez popularność. */
export const MAX_DISCOVER_TYPES = 3;
/** Szerokie okno lat, gdy user nie ma wyraźnie ulubionej dekady. */
export const FALLBACK_YEARS_BACK = 15;
/** Od jakiej oceny tytuł staje się „ziarnem" do szukania podobnych. */
export const LIKE_THRESHOLD = 7;
/** Ile najlepiej ocenionych tytułów bierzemy jako ziarna (limit zapytań do API). */
export const MAX_SEEDS = 8;
/** Ile pozycji zwraca discovery na stronę główną (więcej „pod Twój gust"). */
export const DEFAULT_DISCOVER_LIMIT = 24;
/** Ile ulubionych gatunków odkrywamy (na źródło). */
export const MAX_GENRES = 2;

interface Source {
  key: string;
  discover: (from: number, to: number) => Promise<ExternalMedia[]>;
  // Opcjonalne: Open Library i iTunes nie mają API „podobne do". Brak `similar`
  // oznacza, że tytuły tego rodzaju nie są ziarnami podobieństwa (pickSeeds).
  similar?: (externalId: string) => Promise<ExternalMedia[]>;
  // Odkrywanie po gatunku — tylko źródła, które to wspierają (TMDB, AniList).
  discoverByGenre?: (genre: string, from: number, to: number) => Promise<ExternalMedia[]>;
  recognizesGenre?: (genre: string) => boolean; // które nazwy gatunków źródło zna
}

/** Enum typu (baza) → źródło front + funkcje „discover” / „similar” / „po gatunku”. */
const DISCOVERABLE: Record<string, Source> = {
  FILM: {
    key: "film",
    discover: (f, t) => discoverTmdb(f, t),
    similar: (id) => similarTmdb(id),
    discoverByGenre: (g, f, t) => discoverTmdbByGenre(TMDB_GENRE_IDS[g], f, t),
    recognizesGenre: (g) => g in TMDB_GENRE_IDS,
  },
  ANIME: {
    key: "anime",
    discover: (f, t) => discoverAniList("ANIME", f, t),
    similar: (id) => similarAniList("ANIME", id),
    discoverByGenre: (g, f, t) => discoverAniListByGenre("ANIME", g, f, t),
    recognizesGenre: (g) => ANILIST_GENRES.has(g),
  },
  MANGA: {
    key: "manga",
    discover: (f, t) => discoverAniList("MANGA", f, t),
    similar: (id) => similarAniList("MANGA", id),
    discoverByGenre: (g, f, t) => discoverAniListByGenre("MANGA", g, f, t),
    recognizesGenre: (g) => ANILIST_GENRES.has(g),
  },
  GRA: {
    key: "game",
    discover: (f, t) => discoverRawg(f, t),
    similar: (id) => similarRawg(id),
  },
  // Książki i muzyka NIE mają w swoich API odpowiednika „podobne do” — dlatego
  // opierają się na gatunku i popularności. Gatunek książki bierzemy z gustu
  // nauczonego na filmach (książki nie mają gatunków w bazie).
  KSIAZKA: {
    key: "book",
    discover: (f, t) => discoverBooks(f, t),
    discoverByGenre: (g, f, t) => discoverBooksByGenre(g, f, t),
    recognizesGenre: (g) => recognizesBookGenre(g),
  },
  MUZYKA: {
    key: "music",
    discover: () => discoverMusic(), // iTunes RSS nie filtruje po roku
    discoverByGenre: (g) => discoverMusicByGenre(g),
    recognizesGenre: (g) => recognizesMusicGenre(g),
  },
};

/** Ulubione gatunki użytkownika rozpoznawane przez dane źródło (delta>0, poparcie ≥2). */
export function pickTopGenres(
  profile: TasteProfile,
  recognizes: (g: string) => boolean,
  n: number = MAX_GENRES,
): string[] {
  return profile.genres
    .filter((a) => a.delta > 0 && a.count >= 2 && recognizes(a.key))
    .slice(0, n)
    .map((a) => a.key);
}

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

/**
 * Ziarna podobieństwa: wysoko ocenione tytuły ze źródeł, które MAJĄ API „podobne do".
 * Książki i muzyka go nie mają, więc ziarnem nie będą (pytanie o nie byłoby jałowe).
 */
export function pickSeeds(rated: RatedSeed[]): RatedSeed[] {
  return rated
    .filter(
      (r) => DISCOVERABLE[r.type]?.similar && r.externalId && r.rating >= LIKE_THRESHOLD,
    )
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.rating - a.rating)
    .slice(0, MAX_SEEDS);
}

/** Tasuje KOPIĘ tablicy (Fisher–Yates) — rotacja: inny zestaw przy każdym wejściu. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

/** TTL puli kandydatów (drogie zapytania do API). Rotacja i tak działa — patrz niżej. */
export const POOL_TTL_MS = 10 * 60 * 1000; // 10 minut

interface PoolCache {
  at: number;
  similarRaw: DiscoverItem[][];
  genreRaw: DiscoverItem[][];
  popularRaw: DiscoverItem[][];
}
// Klucz: `userId:typ` — każdy filtr rodzaju ma WŁASNĄ pulę, inaczej wejście na
// „Gry" nadpisałoby pulę „Filmów" i po powrocie widziałbyś gry w filmach.
const poolCache = new Map<string, PoolCache>();

/** Kasuje pule użytkownika z cache — np. po nowej ocenie (gust się zmienił). */
export function invalidateDiscoveryCache(userId: number): void {
  for (const key of poolCache.keys()) {
    if (key.startsWith(`${userId}:`)) poolCache.delete(key);
  }
}

/** Klucz źródła z frontu („film") → enum bazy („FILM"). Null, gdy nieznany. */
export function enumForKey(key: string): string | null {
  const found = Object.entries(DISCOVERABLE).find(([, src]) => src.key === key);
  return found ? found[0] : null;
}

/** Rodzaje (enum bazy), które umiemy odkrywać dla danego klucza z frontu. */
export function typesForKey(typeKey?: string): string[] {
  const all = Object.keys(DISCOVERABLE);
  if (!typeKey) return all;
  return all.filter((enumType) => DISCOVERABLE[enumType].key === typeKey);
}

/**
 * Rekomendacje odkrywcze: świeże tytuły z zewnątrz, głównie „podobne do” Twoich ocen.
 * `typeKey` (film/anime/manga/game) zawęża wynik do jednego rodzaju — wtedy odkrywamy
 * TEN rodzaj, nawet jeśli nie jest ulubiony (user właśnie o niego poprosił).
 * Książki i muzyka nie mają API „podobne/discover" → dla nich zwracamy pustą listę.
 */
export async function tasteDiscovery(
  userId: number,
  limit: number = DEFAULT_DISCOVER_LIMIT,
  typeKey?: string,
): Promise<DiscoverItem[]> {
  const allowed = typesForKey(typeKey);
  if (allowed.length === 0) return []; // np. książki / muzyka

  // Samo sprawdzenie istnienia — patrz komentarz w recommendations.ts.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new NotFoundError(`Użytkownik #${userId} nie istnieje.`);

  const reviews = await prisma.review.findMany({
    where: { userId },
    select: {
      mediaId: true,
      rating: true,
      favorite: true,
      media: {
        select: { type: true, year: true, externalId: true, title: true, genres: true },
      },
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
      genres: r.media.genres,
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

  // Ziarna „podobne do…" bierzemy tylko z wybranego rodzaju — inaczej przy filtrze
  // „Gry" pytalibyśmy RAWG o gry podobne do filmu, którego RAWG w ogóle nie zna.
  const seeds = pickSeeds(
    reviews
      .filter((r) => allowed.includes(r.media.type))
      .map((r) => ({
        type: r.media.type,
        externalId: r.media.externalId ?? "",
        title: r.media.title,
        rating: r.rating,
        favorite: r.favorite,
      })),
  );
  // Przy wybranym rodzaju odkrywamy WŁAŚNIE jego, nawet gdy nie jest ulubiony:
  // user kliknął „Gry", więc chce gier, a nie swoich najczęstszych filmów.
  const types = typeKey ? allowed : pickDiscoverTypes(profile);
  const { from, to } = pickYearWindow(profile, new Date().getFullYear());

  // Zadania „po gatunku": dla każdego odkrywalnego rodzaju bierzemy jego ulubione,
  // rozpoznawane gatunki i pytamy źródło (TMDB with_genres / AniList genre).
  const genreTasks = types.flatMap((enumType) => {
    const src = DISCOVERABLE[enumType];
    if (!src.discoverByGenre || !src.recognizesGenre) return [];
    return pickTopGenres(profile, src.recognizesGenre).map(async (genre) => {
      const found = await src.discoverByGenre!(genre, from, to);
      return found.map((m) => toItem(m, enumType, { kind: "genre", genre }));
    });
  });

  // Pula kandydatów z cache: drogie zapytania do API najwyżej raz na POOL_TTL_MS.
  // Tasowanie i wybór 24 robimy PONIŻEJ świeżo, więc rotacja przy każdym wejściu zostaje.
  const cacheKey = `${userId}:${typeKey ?? "all"}`;
  let pools = poolCache.get(cacheKey);
  if (!pools || Date.now() - pools.at > POOL_TTL_MS) {
    const [similarRaw, genreRaw, popularRaw] = await Promise.all([
      Promise.all(
        seeds.map(async (s) => {
          // pickSeeds przepuszcza tylko źródła z `similar`, ale sprawdzamy jawnie.
          const similar = DISCOVERABLE[s.type].similar;
          if (!similar) return [];
          const found = await similar(s.externalId);
          return found.map((m) => toItem(m, s.type, { kind: "similar", to: s.title }));
        }),
      ),
      Promise.all(genreTasks),
      Promise.all(
        types.map(async (enumType) => {
          const found = await DISCOVERABLE[enumType].discover(from, to);
          return found.map((m) => {
            // Popularne wybieramy z ulubionych rodzajów, więc zawsze umiemy wyjaśnić
            // powód: dekada (gdy silna) albo sam rodzaj — nigdy gołe „w guście".
            const r = scorer({ mediaId: 0, type: enumType, year: m.year }).reason;
            // Gdy rodzaj wybrał SAM (zakładka), „Bo lubisz gry" byłoby kłamstwem —
            // może nie mieć ani jednej oceny gry. Uczciwy powód to popularność.
            if (typeKey) {
              const honest: RecReason =
                r.kind === "general" || r.kind === "type" ? { kind: "popular" } : r;
              return toItem(m, enumType, honest);
            }
            return toItem(m, enumType, r.kind === "general" ? { kind: "type" } : r);
          });
        }),
      ),
    ]);
    pools = { at: Date.now(), similarRaw, genreRaw, popularRaw };
    poolCache.set(cacheKey, pools);
  }
  const { similarRaw, genreRaw, popularRaw } = pools;

  // Rotacja: tasujemy pulę każdego ziarna/gatunku/rodzaju ORAZ ich kolejność, więc
  // każde wejście daje inny zestaw (wciąż dobrany pod gust — jakość zachowana).
  const similar = dedupeByKey(interleave(shuffle(similarRaw.map(shuffle))).filter(fresh));
  const genre = dedupeByKey(interleave(shuffle(genreRaw.map(shuffle))).filter(fresh));
  const popular = dedupeByKey(interleave(shuffle(popularRaw.map(shuffle))).filter(fresh));

  // Miks trzech sygnałów round-robin, żeby KAŻDY był widoczny (nie zdominuje „podobne"):
  // podobne + po gatunku + popularne na przemian. Krótsze strumienie dopełniają dłuższe.
  return dedupeByKey(interleave([similar, genre, popular])).slice(0, limit);
}
