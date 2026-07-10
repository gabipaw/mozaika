/**
 * „Portret gustu" i rekomendacje treściowe (content-based).
 *
 * W odróżnieniu od rekomendacji przez podobnych użytkowników
 * (`recommendations.ts`), tutaj patrzymy na to, CO sam użytkownik ocenia wysoko:
 * jakie rodzaje mediów i z jakich dekad. Z tego budujemy „profil gustu",
 * a potem punktujemy nieocenione tytuły z katalogu tak, by pasowały do gustu.
 *
 * Sygnały (bez migracji bazy): typ mediów, dekada premiery, ocena, ulubione.
 * Czysta logika (compute*) jest oddzielona od bazy — łatwa do testów.
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
}

/** Dekada premiery jako klucz, np. 1995 → "1990". Null gdy brak roku. */
export function decadeOf(year: number | null): string | null {
  if (year === null || !Number.isFinite(year)) return null;
  return String(Math.floor(year / 10) * 10);
}

function mean(nums: number[]): number {
  return nums.reduce((s, n) => s + n, 0) / nums.length;
}

/** Grupuje oceny po kluczu i liczy afinność (avg, count, delta vs baseline). */
function affinities(
  reviews: TasteReview[],
  keyOf: (r: TasteReview) => string | null,
  baseline: number,
): Affinity[] {
  const groups = new Map<string, number[]>();
  for (const r of reviews) {
    const key = keyOf(r);
    if (key === null) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(r.rating);
    groups.set(key, bucket);
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
    return { baseline: 0, reviewCount: 0, types: [], decades: [] };
  }
  const baseline = Math.round(mean(reviews.map((r) => r.rating)) * 10) / 10;
  return {
    baseline,
    reviewCount: reviews.length,
    types: affinities(reviews, (r) => r.type, baseline),
    decades: affinities(reviews, (r) => decadeOf(r.year), baseline),
  };
}

/** Powód rekomendacji — front tłumaczy go na tekst („Bo lubisz…"). */
export type RecReason =
  | { kind: "type" } // pasuje do ulubionego rodzaju mediów
  | { kind: "decade"; decade: string } // pasuje do ulubionej dekady
  | { kind: "general" }; // ogólnie w Twoim guście

export interface TasteCandidate {
  mediaId: number;
  type: string;
  year: number | null;
}

export interface TasteRecommendation {
  mediaId: number;
  score: number; // przewidywana ocena 0,5–10
  reason: RecReason;
}

/** Wygładzony wkład afinności: mało próbek → wkład bliżej zera. */
function weightedDelta(a: Affinity | undefined): number {
  if (!a) return 0;
  const confidence = a.count / (a.count + CONFIDENCE_K);
  return a.delta * confidence;
}

/**
 * Czyste rekomendacje treściowe: dla każdego nieocenionego kandydata przewiduje
 * ocenę = baseline + wkład typu + wkład dekady, i sortuje malejąco.
 * Zwraca [], gdy użytkownik ma za mało ocen na wiarygodny profil.
 */
export function computeTasteRecommendations(
  reviews: TasteReview[],
  candidates: TasteCandidate[],
  limit: number = DEFAULT_TASTE_LIMIT,
): TasteRecommendation[] {
  if (reviews.length < MIN_TASTE_REVIEWS) return [];

  const profile = computeTasteProfile(reviews);
  const typeBy = new Map(profile.types.map((a) => [a.key, a]));
  const decadeBy = new Map(profile.decades.map((a) => [a.key, a]));

  const recs: TasteRecommendation[] = candidates.map((c) => {
    const typeAff = typeBy.get(c.type);
    const decadeKey = decadeOf(c.year);
    const decadeAff = decadeKey ? decadeBy.get(decadeKey) : undefined;

    const typeW = weightedDelta(typeAff);
    const decadeW = weightedDelta(decadeAff);
    const raw = profile.baseline + typeW + decadeW;
    const score = Math.round(Math.min(MAX_RATING, Math.max(MIN_RATING, raw)) * 10) / 10;

    // Powód = najsilniejszy dodatni wkład (typ vs dekada); inaczej „ogólnie".
    let reason: RecReason = { kind: "general" };
    if (typeW > 0 && typeW >= decadeW) reason = { kind: "type" };
    else if (decadeW > 0 && decadeKey) reason = { kind: "decade", decade: decadeKey };

    return { mediaId: c.mediaId, score, reason };
  });

  recs.sort((a, b) => b.score - a.score || a.mediaId - b.mediaId);
  return recs.slice(0, limit);
}

export interface TasteRecommendationWithMedia extends TasteRecommendation {
  id: number;
  title: string;
  type: string;
  externalId: string | null;
  year: number | null;
  posterUrl: string | null;
}

/** Rekomendacje treściowe dla użytkownika — dane z bazy, wzbogacone o tytuły. */
export async function tasteRecommendations(
  userId: number,
  limit: number = DEFAULT_TASTE_LIMIT,
): Promise<TasteRecommendationWithMedia[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError(`Użytkownik #${userId} nie istnieje.`);

  const [reviews, candidates] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      select: {
        mediaId: true,
        rating: true,
        favorite: true,
        media: { select: { type: true, year: true } },
      },
    }),
    // Kandydaci = tytuły z katalogu, których użytkownik jeszcze NIE ocenił.
    prisma.media.findMany({
      where: { reviews: { none: { userId } } },
      select: {
        id: true,
        title: true,
        type: true,
        externalId: true,
        year: true,
        posterUrl: true,
      },
    }),
  ]);

  const recs = computeTasteRecommendations(
    reviews.map((r) => ({
      mediaId: r.mediaId,
      rating: r.rating,
      favorite: r.favorite,
      type: r.media.type,
      year: r.media.year,
    })),
    candidates.map((m) => ({ mediaId: m.id, type: m.type, year: m.year })),
    limit,
  );
  if (recs.length === 0) return [];

  const mediaById = new Map(candidates.map((m) => [m.id, m]));
  return recs.map((r) => {
    const m = mediaById.get(r.mediaId)!;
    return {
      ...r,
      id: m.id,
      title: m.title,
      type: m.type,
      externalId: m.externalId,
      year: m.year,
      posterUrl: m.posterUrl,
    };
  });
}
