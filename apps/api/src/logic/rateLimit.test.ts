import assert from "node:assert/strict";
import { test } from "node:test";

import { rateLimit, rateLimitReset, rateLimitClear } from "./rateLimit.js";

const KEY = "test:1.2.3.4";
const MAX = 3;
const WIN = 60_000; // 1 min

test("przepuszcza do limitu, potem blokuje", () => {
  rateLimitClear();
  const t = 1_000_000;
  for (let i = 0; i < MAX; i++) {
    assert.equal(rateLimit(KEY, MAX, WIN, t).allowed, true, `proba ${i + 1}`);
  }
  const zablokowane = rateLimit(KEY, MAX, WIN, t);
  assert.equal(zablokowane.allowed, false);
  assert.ok(zablokowane.retryAfter > 0, "retryAfter powinien byc dodatni");
});

test("okno się przesuwa — po jego upływie znów wpuszcza", () => {
  rateLimitClear();
  const t = 2_000_000;
  for (let i = 0; i < MAX; i++) rateLimit(KEY, MAX, WIN, t);
  assert.equal(rateLimit(KEY, MAX, WIN, t).allowed, false, "tuz po wyczerpaniu");
  // Chwila po wygasnieciu najstarszej proby robi sie miejsce.
  assert.equal(
    rateLimit(KEY, MAX, WIN, t + WIN + 1).allowed,
    true,
    "po oknie znow wolne",
  );
});

test("reset kasuje licznik (np. po udanym logowaniu)", () => {
  rateLimitClear();
  const t = 3_000_000;
  for (let i = 0; i < MAX; i++) rateLimit(KEY, MAX, WIN, t);
  assert.equal(rateLimit(KEY, MAX, WIN, t).allowed, false);
  rateLimitReset(KEY);
  assert.equal(rateLimit(KEY, MAX, WIN, t).allowed, true, "po resecie znow wolne");
});

test("klucze są niezależne — jeden adres nie blokuje innego", () => {
  rateLimitClear();
  const t = 4_000_000;
  for (let i = 0; i < MAX; i++) rateLimit("auth:1.1.1.1", MAX, WIN, t);
  assert.equal(rateLimit("auth:1.1.1.1", MAX, WIN, t).allowed, false);
  assert.equal(
    rateLimit("auth:2.2.2.2", MAX, WIN, t).allowed,
    true,
    "inny adres ma wlasny licznik",
  );
});

test("tempo jest ograniczone do max/okno — odrzucone próby nie przedłużają blokady", () => {
  rateLimitClear();
  const t = 5_000_000;
  for (let i = 0; i < MAX; i++) rateLimit(KEY, MAX, WIN, t);
  // Próby w trakcie blokady (odrzucone) nie zuzywaja budzetu.
  assert.equal(rateLimit(KEY, MAX, WIN, t + 1).allowed, false);
  assert.equal(rateLimit(KEY, MAX, WIN, t + 2).allowed, false);
  // Gdy pierwotne proby wygasna, klient znow moze probowac — nie jest wieczasnie
  // zablokowany przez wlasne ponawianie.
  assert.equal(
    rateLimit(KEY, MAX, WIN, t + WIN + 1).allowed,
    true,
    "po oknie klient sie odblokowuje",
  );
});
