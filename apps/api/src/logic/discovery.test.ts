/**
 * Testy czystych pomocników odkrywania (bez bazy i bez sieci).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { interleave, pickDiscoverTypes, pickYearWindow } from "./discovery.js";
import { computeTasteProfile, type TasteReview } from "./tasteProfile.js";

const reviews: TasteReview[] = [
  { mediaId: 1, rating: 9, favorite: true, type: "ANIME", year: 2013 },
  { mediaId: 2, rating: 10, favorite: false, type: "ANIME", year: 2016 },
  { mediaId: 3, rating: 8, favorite: false, type: "GRA", year: 2015 },
  { mediaId: 4, rating: 4, favorite: false, type: "FILM", year: 1998 },
];

test("pickDiscoverTypes bierze najlubianiejsze, tylko odkrywalne rodzaje", () => {
  const types = pickDiscoverTypes(computeTasteProfile(reviews));
  assert.ok(types.includes("ANIME"));
  assert.ok(types.length <= 3);
  // ANIME (najwyższa afinność) przed FILM (najniższa).
  assert.ok(types.indexOf("ANIME") < types.indexOf("FILM"));
});

test("pickDiscoverTypes pomija rodzaje bez źródła discover (np. MUZYKA)", () => {
  const music: TasteReview[] = [
    { mediaId: 1, rating: 9, favorite: false, type: "MUZYKA", year: 2013 },
    { mediaId: 2, rating: 8, favorite: false, type: "MUZYKA", year: 2016 },
    { mediaId: 3, rating: 7, favorite: false, type: "MUZYKA", year: 2019 },
  ];
  assert.deepEqual(pickDiscoverTypes(computeTasteProfile(music)), []);
});

test("pickYearWindow zwraca ulubioną dekadę, gdy ma poparcie", () => {
  const w = pickYearWindow(computeTasteProfile(reviews), 2026);
  assert.equal(w.from, 2010);
  assert.equal(w.to, 2019);
});

test("pickYearWindow spada do ostatnich lat bez wyraźnej dekady", () => {
  const one: TasteReview[] = [
    { mediaId: 1, rating: 9, favorite: false, type: "ANIME", year: 1990 },
    { mediaId: 2, rating: 9, favorite: false, type: "ANIME", year: 2005 },
    { mediaId: 3, rating: 9, favorite: false, type: "ANIME", year: 2020 },
  ];
  const w = pickYearWindow(computeTasteProfile(one), 2026);
  assert.equal(w.to, 2026);
  assert.ok(w.from < 2026);
});

test("interleave przeplata listy round-robin", () => {
  assert.deepEqual(
    interleave([
      [1, 3, 5],
      [2, 4],
    ]),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(interleave([[], ["a"]]), ["a"]);
});
