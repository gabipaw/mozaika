/**
 * Testy czystej logiki „portretu gustu" i rekomendacji treściowych (bez bazy).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeTasteProfile,
  computeTasteRecommendations,
  decadeOf,
  makeTasteScorer,
  MIN_TASTE_REVIEWS,
  type TasteCandidate,
  type TasteReview,
} from "./tasteProfile.js";

// Użytkownik, który wysoko ocenia ANIME i tytuły z lat 2010, a nisko FILM.
const reviews: TasteReview[] = [
  { mediaId: 1, rating: 9, favorite: true, type: "ANIME", year: 2013 },
  { mediaId: 2, rating: 10, favorite: false, type: "ANIME", year: 2016 },
  { mediaId: 3, rating: 4, favorite: false, type: "FILM", year: 1998 },
  { mediaId: 4, rating: 5, favorite: false, type: "FILM", year: 1995 },
];

test("decadeOf mapuje rok na dekadę i toleruje brak roku", () => {
  assert.equal(decadeOf(2013), "2010");
  assert.equal(decadeOf(1995), "1990");
  assert.equal(decadeOf(null), null);
});

test("profil liczy baseline i afinność (ANIME lubiane bardziej niż norma)", () => {
  const p = computeTasteProfile(reviews);
  assert.equal(p.reviewCount, 4);
  assert.equal(p.baseline, 7); // (9+10+4+5)/4
  // Najsilniejsza afinność typu to ANIME (delta dodatnia), FILM ujemna.
  assert.equal(p.types[0].key, "ANIME");
  assert.ok(p.types[0].delta > 0);
  assert.ok(p.types[p.types.length - 1].delta < 0);
});

test("pusty profil dla użytkownika bez ocen", () => {
  const p = computeTasteProfile([]);
  assert.equal(p.reviewCount, 0);
  assert.equal(p.types.length, 0);
});

test("poleca kandydata pasującego do gustu wyżej niż niepasującego", () => {
  const candidates: TasteCandidate[] = [
    { mediaId: 10, type: "ANIME", year: 2015 }, // pasuje: typ + dekada
    { mediaId: 11, type: "FILM", year: 1996 }, // nie pasuje: słaby typ + dekada
  ];
  const recs = computeTasteRecommendations(reviews, candidates);
  assert.equal(recs[0].mediaId, 10);
  assert.equal(recs[0].reason.kind, "type");
  assert.ok(recs[0].score > recs[1].score);
});

test("za mało ocen → brak rekomendacji (próg MIN_TASTE_REVIEWS)", () => {
  const few = reviews.slice(0, MIN_TASTE_REVIEWS - 1);
  const candidates: TasteCandidate[] = [{ mediaId: 10, type: "ANIME", year: 2015 }];
  assert.equal(computeTasteRecommendations(few, candidates).length, 0);
});

test("respektuje limit i sortuje malejąco po wyniku", () => {
  const candidates: TasteCandidate[] = [
    { mediaId: 10, type: "ANIME", year: 2015 },
    { mediaId: 11, type: "ANIME", year: 2011 },
    { mediaId: 12, type: "FILM", year: 1990 },
  ];
  const recs = computeTasteRecommendations(reviews, candidates, 2);
  assert.equal(recs.length, 2);
  assert.ok(recs[0].score >= recs[1].score);
});

test("makeTasteScorer daje wyższy wynik pozycji pasującej do gustu", () => {
  const score = makeTasteScorer(computeTasteProfile(reviews));
  const good = score({ mediaId: 0, type: "ANIME", year: 2015 });
  const bad = score({ mediaId: 0, type: "FILM", year: 1996 });
  assert.ok(good.score > bad.score);
  assert.equal(good.reason.kind, "type");
});
