/**
 * Testy czystych pomocników odkrywania (bez bazy i bez sieci).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dedupeByKey,
  interleave,
  pickDiscoverTypes,
  pickSeeds,
  pickYearWindow,
  type DiscoverItem,
  type RatedSeed,
} from "./discovery.js";
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

test("pickSeeds: ulubione i najwyżej ocenione wpierw, tylko odkrywalne i ≥ progu", () => {
  const rated: RatedSeed[] = [
    { type: "FILM", externalId: "1", title: "A", rating: 8, favorite: false },
    { type: "ANIME", externalId: "2", title: "B", rating: 7.5, favorite: true },
    { type: "MUZYKA", externalId: "3", title: "C", rating: 10, favorite: false }, // brak discover
    { type: "GRA", externalId: "4", title: "D", rating: 5, favorite: false }, // < próg
  ];
  const seeds = pickSeeds(rated);
  assert.deepEqual(
    seeds.map((s) => s.title),
    ["B", "A"], // MUZYKA i za niska ocena odpadają; ulubione (B) przed A
  );
});

test("dedupeByKey usuwa powtórki po (rodzaj + externalId), pierwszy wygrywa", () => {
  const items: DiscoverItem[] = [
    {
      externalId: "9",
      title: "X",
      year: 2020,
      posterUrl: null,
      type: "film",
      score: 8,
      reason: { kind: "similar", to: "Seed" },
    },
    {
      externalId: "9",
      title: "X",
      year: 2020,
      posterUrl: null,
      type: "film",
      score: 7,
      reason: { kind: "decade", decade: "2020" },
    },
    {
      externalId: "9",
      title: "X",
      year: 2020,
      posterUrl: null,
      type: "game",
      score: 7,
      reason: { kind: "general" },
    },
  ];
  const out = dedupeByKey(items);
  assert.equal(out.length, 2); // film:9 raz + game:9 raz
  assert.equal(out[0].reason.kind, "similar"); // pierwszy (podobne) wygrywa
});
