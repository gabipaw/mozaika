import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_REVIEW_LEN, validateReviewInput } from "./reviews.js";

const bazowe = { userId: 1, mediaId: 2, rating: 8 };

test("przepuszcza poprawna recenzje", () => {
  const v = validateReviewInput({ ...bazowe, text: "  Swietny film.  " });
  assert.equal(v.text, "Swietny film.", "tekst przycięty");
  assert.equal(v.rating, 8);
});

test("pusty tekst zapisuje sie jako null, nie pusty string", () => {
  assert.equal(validateReviewInput({ ...bazowe }).text, null);
  assert.equal(validateReviewInput({ ...bazowe, text: "   " }).text, null);
});

test("tekst dokladnie na limicie przechodzi", () => {
  const v = validateReviewInput({ ...bazowe, text: "a".repeat(MAX_REVIEW_LEN) });
  assert.equal(v.text?.length, MAX_REVIEW_LEN);
});

test("tekst ponad limit jest odrzucany", () => {
  // Bez tego limitu jedna recenzja mogla miec megabajty i szla potem w KAZDEJ
  // odpowiedzi /media/:id/reviews oraz w profilu autora.
  assert.throws(
    () => validateReviewInput({ ...bazowe, text: "a".repeat(MAX_REVIEW_LEN + 1) }),
    /najwyżej/,
  );
});

test("limit liczy sie PO przycieciu bialych znakow", () => {
  const tekst = `   ${"a".repeat(MAX_REVIEW_LEN)}   `;
  assert.doesNotThrow(() => validateReviewInput({ ...bazowe, text: tekst }));
});

test("ocena poza zakresem i nie-polowka sa odrzucane", () => {
  assert.throws(() => validateReviewInput({ ...bazowe, rating: 0 }), /Ocena/);
  assert.throws(() => validateReviewInput({ ...bazowe, rating: 11 }), /Ocena/);
  assert.throws(() => validateReviewInput({ ...bazowe, rating: 7.3 }), /Ocena/);
  assert.doesNotThrow(() => validateReviewInput({ ...bazowe, rating: 7.5 }));
});
