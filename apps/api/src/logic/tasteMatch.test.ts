/**
 * Testy czystej logiki biznesowej (bez bazy) — wbudowany node:test + node:assert.
 * Uruchamiane przez tsx: `npm test`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { ValidationError } from "../errors.js";
import { validateReviewInput } from "./reviews.js";
import { computeTasteMatch } from "./tasteMatch.js";

test("identyczne oceny → 100% dopasowania", () => {
  const oceny = [
    { mediaId: 1, rating: 8 },
    { mediaId: 2, rating: 5 },
    { mediaId: 3, rating: 9 },
  ];
  const r = computeTasteMatch(oceny, oceny);
  assert.equal(r.status, "OK");
  if (r.status === "OK") assert.equal(r.score, 100);
});

test("mniej niż 3 wspólne oceny → INSUFFICIENT_DATA", () => {
  const a = [
    { mediaId: 1, rating: 8 },
    { mediaId: 2, rating: 5 },
  ];
  const b = [{ mediaId: 1, rating: 7 }];
  const r = computeTasteMatch(a, b);
  assert.equal(r.status, "INSUFFICIENT_DATA");
  if (r.status === "INSUFFICIENT_DATA") assert.equal(r.shared, 1);
});

test("skrajnie różne oceny → 0%", () => {
  const a = [
    { mediaId: 1, rating: 1 },
    { mediaId: 2, rating: 1 },
    { mediaId: 3, rating: 10 },
  ];
  const b = [
    { mediaId: 1, rating: 10 },
    { mediaId: 2, rating: 10 },
    { mediaId: 3, rating: 1 },
  ];
  const r = computeTasteMatch(a, b);
  assert.equal(r.status, "OK");
  if (r.status === "OK") assert.equal(r.score, 0);
});

test("liczy tylko wspólne tytuły, nie wszystkie", () => {
  const a = [
    { mediaId: 1, rating: 9 },
    { mediaId: 2, rating: 8 },
    { mediaId: 3, rating: 7 },
    { mediaId: 9, rating: 1 }, // nie ma go u B — ignorowany
  ];
  const b = [
    { mediaId: 1, rating: 9 },
    { mediaId: 2, rating: 8 },
    { mediaId: 3, rating: 7 },
  ];
  const r = computeTasteMatch(a, b);
  assert.equal(r.status, "OK");
  if (r.status === "OK") {
    assert.equal(r.shared, 3);
    assert.equal(r.score, 100);
  }
});

test("ocena poza zakresem 1–10 jest odrzucana", () => {
  assert.throws(
    () => validateReviewInput({ userId: 1, mediaId: 1, rating: 11 }),
    ValidationError,
  );
  assert.throws(
    () => validateReviewInput({ userId: 1, mediaId: 1, rating: 0 }),
    ValidationError,
  );
});

test("poprawne wejście przechodzi walidację i przycina tekst", () => {
  const v = validateReviewInput({ userId: 1, mediaId: 2, rating: 7, text: "  spoko  " });
  assert.equal(v.rating, 7);
  assert.equal(v.text, "spoko");
});
