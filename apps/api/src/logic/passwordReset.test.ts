import assert from "node:assert/strict";
import { test } from "node:test";

import { hashToken, isTokenUsable } from "./passwordReset.js";

const TERAZ = new Date("2026-07-20T12:00:00Z");
const godzine = (h: number) => new Date(TERAZ.getTime() + h * 60 * 60 * 1000);

test("hash tokenu jest powtarzalny i nie zdradza tokenu", () => {
  const token = "abc123";
  assert.equal(hashToken(token), hashToken(token), "ten sam token → ten sam hash");
  assert.notEqual(hashToken(token), hashToken("abc124"), "inny token → inny hash");
  assert.doesNotMatch(hashToken(token), /abc123/, "hash nie zawiera tokenu");
  assert.equal(hashToken(token).length, 64, "SHA-256 w hex ma 64 znaki");
});

test("token ważny, gdy nieużyty i przed terminem", () => {
  assert.equal(isTokenUsable({ expiresAt: godzine(1), usedAt: null }, TERAZ), true);
});

test("token po terminie jest odrzucany", () => {
  assert.equal(isTokenUsable({ expiresAt: godzine(-1), usedAt: null }, TERAZ), false);
});

test("token użyty jest odrzucany, nawet jeśli jeszcze nie wygasł", () => {
  const uzyty = { expiresAt: godzine(1), usedAt: godzine(-0.5) };
  assert.equal(isTokenUsable(uzyty, TERAZ), false);
});

test("brak tokenu w bazie (null) jest odrzucany", () => {
  assert.equal(isTokenUsable(null, TERAZ), false);
});
