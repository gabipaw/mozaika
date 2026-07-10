/**
 * „Portret gustu" — czysta logika + odczyt z bazy (jak w tasteMatch.ts).
 *
 * Patrzymy na to, CO użytkownik ocenia wysoko: jakie rodzaje mediów, dekady i
 * gatunki. Z tego budujemy „profil gustu" (afinność vs własna średnia), scorer
 * punktuje kandydatów pod ten gust, a `tastePortrait` składa profil do pokazania.
 */
import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";

/** Ile ocen trzeba mieć, by profil gustu był wiarygodny. */
export const MIN_TASTE_REVIEWS = 3;
/** Wygładzanie afinności (shrinkage): mało próbek → mniejszy wpływ na wynik. */
export const CONFIDENCE_K = 3;
/** Ile rekomendacji zwracamy domyślnie. */
export const DEFAULT_TASTE_LIMIT = 12;

const MIN_RATING = 0.5;
const MAX_RATING = 10;

export interface TasteReview {
  mediaId: number;
  rating: number;
  favorite: boolean;
  type: string;
  year: number | null;
  genres: string[];
}

/** Afinność do jednej grupy (typ mediów albo dekada). */
export interface Affinity {
  key: string; // np. "ANIME" albo "2010"
  avg: number; // średnia ocena użytkownika w tej grupie
  count: number; // liczba ocen w grupie
  delta: number; // avg − baseline (na plus = lubi bardziej niż zwykle)
}

export interface TasteProfile {
  baseline: number; // „norma" użytkownika — jego średnia ocena
  reviewCount: number;
  types: Affinity[]; // afinność wg typu mediów, malejąco po delcie
  decades: Affinity[]; // afinność wg dekady premiery, malejąco po delcie
  genres: Affinity[]; // afinność wg gatunku, malejąco po delcie
}

/** Dekada premiery jako klucz, np. 1995 → "1990". Null gdy brak roku. */
export function decadeOf(year: number | null): string | null {
  if (year === null || !Number.isFinite(year)) return null;
  return String(Math.floor(year / 10) * 10);
}

function mean(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** Grupuje oceny po kluczach i liczy afinność (avg, count, delta vs baseline).
 *  keysOf zwraca 0..N kluczy (dekada = 0/1, gatunki = wiele). */
function affinities(
  reviews: TasteReview[],
  keysOf: (r: TasteReview) => string[],
  baseline: number,
): Affinity[] {
  const groups = new Map<string, number[]>();
  for (const r of reviews) {
    for (const key of keysOf(r)) {
      const bucket = groups.get(key) ?? [];
      bucket.push(r.rating);
      groups.set(key, bucket);
    }
  }

  const out: Affinity[] = [];
  for (const [key, ratings] of groups) {
    const avg = mean(ratings);
    out.push({
      key,
      avg: Math.round(avg * 10) / 10,
      count: ratings.length,
      delta: Math.round((avg - baseline) * 10) / 10,
    });
  }
  out.sort((a, b) => b.delta - a.delta || b.count - a.count);
  return out;
}

/** Czysty profil gustu — z tablicy ocen, bez bazy. */
export function computeTasteProfile(reviews: TasteReview[]): TasteProfile {
  if (reviews.length === 0) {
    return { baseline: 0, reviewCount: 0, types: [], decades: [], genres: [] };
  }
  const baseline = Math.round(mean(reviews.map((r) => r.rating)) * 10) / 10;
  const decade = (r: TasteReview) => {
    const d = decadeOf(r.year);
    return d ? [d] : [];
  };
  return {
    baseline,
    reviewCount: reviews.length,
    types: affinities(reviews, (r) => [r.type], baseline),
    decades: affinities(reviews, decade, baseline),
    genres: affinities(reviews, (r) => r.genres, baseline),
  };
}

/** Powód rekomendacji — front tłumaczy go na tekst („Bo lubisz…"). */
export type RecReason =
  | { kind: "type" } // pasuje do ulubionego rodzaju mediów
  | { kind: "decade"; decade: string } // pasuje do ulubionej dekady
  | { kind: "genre"; genre: string } // pasuje do ulubionego gatunku
  | { kind: "similar"; to: string } // podobne (gatunek/treść) do tytułu, który oceniłeś
  | { kind: "general" }; // ogólnie w Twoim guście

export interface TasteCandidate {
  mediaId: number;
  type: string;
  year: number | null;
}

export interface ScoredReason {
  score: number; // przewidywana ocena 0,5–10
  reason: RecReason;
}

export interface TasteRecommendation extends ScoredReason {
  mediaId: number;
}

/** Wygładzony wkład afinności: mało próbek → wkład bliżej zera. */
function weightedDelta(a: Affinity | undefined): number {
  if (!a) return 0;
  const confidence = a.count / (a.count + CONFIDENCE_K);
  return a.delta * confidence;
}

/**
 * Buduje scorer dla danego profilu: przewiduje ocenę kandydata
 * = baseline + wkład typu + wkład dekady i dobiera powód (najsilniejszy wkład).
 * Jeden scorer, wiele kandydatów — używany i przez rekomendacje, i przez discovery.
 */
export function makeTasteScorer(
  profile: TasteProfile,
): (c: TasteCandidate) => ScoredReason {
  const typeBy = new Map(profile.types.map((a) => [a.key, a]));
  const decadeBy = new Map(profile.decades.map((a) => [a.key, a]));

  return (c) => {
    const typeW = weightedDelta(typeBy.get(c.type));
    const decadeKey = decadeOf(c.year);
    const decadeW = weightedDelta(decadeKey ? decadeBy.get(decadeKey) : undefined);

    const raw = profile.baseline + typeW + decadeW;
    const score = Math.round(Math.min(MAX_RATING, Math.max(MIN_RATING, raw)) * 10) / 10;

    let reason: RecReason = { kind: "general" };
    if (typeW > 0 && typeW >= decadeW) reason = { kind: "type" };
    else if (decadeW > 0 && decadeKey) reason = { kind: "decade", decade: decadeKey };

    return { score, reason };
  };
}

/**
 * Czyste rekomendacje: punktuje kandydatów pod gust i sortuje malejąco.
 * Zwraca [], gdy użytkownik ma za mało ocen na wiarygodny profil.
 */
export function computeTasteRecommendations(
  reviews: TasteReview[],
  candidates: TasteCandidate[],
  limit: number = DEFAULT_TASTE_LIMIT,
): TasteRecommendation[] {
  if (reviews.length < MIN_TASTE_REVIEWS) return [];

  const score = makeTasteScorer(computeTasteProfile(reviews));
  const recs: TasteRecommendation[] = candidates.map((c) => ({
    mediaId: c.mediaId,
    ...score(c),
  }));

  recs.sort((a, b) => b.score - a.score || a.mediaId - b.mediaId);
  return recs.slice(0, limit);
}

export interface TastePortrait extends TasteProfile {
  globalBaseline: number | null; // średnia ocen w całym serwisie (do „surowości")
}

/** Portret gustu użytkownika: profil (typy/dekady/gatunki) + średnia serwisu. */
export async function tastePortrait(userId: number): Promise<TastePortrait> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError(`Użytkownik #${userId} nie istnieje.`);

  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      select: {
        mediaId: true,
        rating: true,
        favorite: true,
        media: { select: { type: true, year: true, genres: true } },
      },
    }),
    prisma.review.aggregate({ _avg: { rating: true } }),
  ]);

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
  const globalBaseline =
    agg._avg.rating !== null ? Math.round(agg._avg.rating * 10) / 10 : null;
  return { ...profile, globalBaseline };
}
