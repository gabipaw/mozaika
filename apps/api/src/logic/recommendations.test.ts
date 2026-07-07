/**
 * Testy czystej logiki rekomendacji (bez bazy).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { computeRecommendations, type OtherUser } from "./recommendations.js";
import type { RatingOf } from "./tasteMatch.js";

// Cel ocenił tytuły 1,2,3. Chcemy mu polecić coś, czego NIE ocenił.
const target: RatingOf[] = [
  { mediaId: 1, rating: 9 },
  { mediaId: 2, rating: 8 },
  { mediaId: 3, rating: 9 },
];

// Użytkownik o guście identycznym z celem na wspólnych tytułach (→ 100% dopasowania),
// dodatkowo oceniający tytuły z `extra`.
function bliski(userId: number, extra: RatingOf[]): OtherUser {
  return { userId, reviews: [...target, ...extra] };
}

test("poleca tytuł od użytkownika o podobnym guście", () => {
  const recs = computeRecommendations(target, [bliski(2, [{ mediaId: 4, rating: 10 }])]);
  assert.equal(recs.length, 1);
  assert.equal(recs[0].mediaId, 4);
  assert.equal(recs[0].score, 10);
  assert.equal(recs[0].recommenders[0].userId, 2);
});

test("ignoruje użytkownika o odmiennym guście (poniżej progu)", () => {
  const daleki: OtherUser = {
    userId: 3,
    reviews: [
      { mediaId: 1, rating: 1 },
      { mediaId: 2, rating: 2 },
      { mediaId: 3, rating: 1 },
      { mediaId: 5, rating: 10 },
    ],
  };
  assert.equal(computeRecommendations(target, [daleki]).length, 0);
});

test("nie poleca tytułów już ocenionych przez cel", () => {
  // bliski ocenia tylko 1,2,3 — wszystkie cel już zna → brak nowych poleceń
  assert.equal(computeRecommendations(target, [bliski(2, [])]).length, 0);
});

test("nie poleca tytułów ocenionych nisko (poniżej progu polubienia)", () => {
  const recs = computeRecommendations(target, [bliski(2, [{ mediaId: 4, rating: 4 }])]);
  assert.equal(recs.length, 0);
});

test("łączy polecenia od wielu podobnych i sortuje po wyniku", () => {
  const a = bliski(2, [
    { mediaId: 4, rating: 7 },
    { mediaId: 5, rating: 10 },
  ]);
  const b = bliski(3, [{ mediaId: 5, rating: 9 }]);
  const recs = computeRecommendations(target, [a, b]);
  // tytuł 5 polecony przez oboje i wyżej oceniony → przed tytułem 4
  assert.equal(recs[0].mediaId, 5);
  assert.equal(recs[0].recommenders.length, 2);
});
