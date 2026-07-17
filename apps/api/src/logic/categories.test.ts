/**
 * Testy podziału typów na kategorie — od niego zależy limit TOP 4 (bez bazy).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { MediaType } from "@prisma/client";

import { CATEGORIES, categoryOf, siblingTypes } from "./categories.js";

test("film i serial to jedna kategoria, ksiazka i manga też", () => {
  assert.equal(categoryOf(MediaType.FILM), "film");
  assert.equal(categoryOf(MediaType.SERIAL), "film");
  assert.deepEqual(siblingTypes(MediaType.SERIAL), [MediaType.FILM, MediaType.SERIAL]);

  assert.equal(categoryOf(MediaType.MANGA), "book");
  assert.deepEqual(siblingTypes(MediaType.KSIAZKA), [MediaType.KSIAZKA, MediaType.MANGA]);
});

test("anime NIE dzieli kategorii z filmem — inaczej wracałby wspólny limit", () => {
  assert.equal(categoryOf(MediaType.ANIME), "anime");
  assert.deepEqual(siblingTypes(MediaType.ANIME), [MediaType.ANIME]);
  assert.ok(!siblingTypes(MediaType.FILM).includes(MediaType.ANIME));
});

test("każdy typ z enuma należy do dokładnie jednej kategorii", () => {
  for (const type of Object.values(MediaType)) {
    const hits = Object.entries(CATEGORIES).filter(([, types]) => types.includes(type));
    assert.equal(hits.length, 1, `typ ${type} pasuje do ${hits.length} kategorii`);
  }
});
