import assert from "node:assert/strict";
import { test } from "node:test";

import { shouldAnnounce } from "./premieres.js";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const TERAZ = d("2026-07-14");

test("wysyła push, gdy tytuł wyszedł po dodaniu go na listę", () => {
  // Dodane w maju, premiera w lipcu, dziś po premierze → to jest ta premiera.
  assert.equal(shouldAnnounce(d("2026-05-01"), d("2026-07-10"), TERAZ), true);
});

test("milczy, gdy tytuł był wydany, zanim trafił na listę", () => {
  // Klasyczny stary film dopisany wczoraj — nikt nie chce pushu „Premiera!".
  assert.equal(shouldAnnounce(d("2026-07-13"), d("1999-03-31"), TERAZ), false);
});

test("milczy przed premierą", () => {
  assert.equal(shouldAnnounce(d("2026-05-01"), d("2026-12-01"), TERAZ), false);
});

test("milczy, gdy data premiery nie jest znana", () => {
  assert.equal(shouldAnnounce(d("2026-05-01"), null, TERAZ), false);
});

test("premiera dokładnie dziś liczy się jako premiera", () => {
  assert.equal(shouldAnnounce(d("2026-05-01"), TERAZ, TERAZ), true);
});

test("tytuł dodany dokładnie w dniu premiery nie jest zapowiadany", () => {
  // Premiera już się odbyła w chwili dodania — to nie jest nowość dla tej osoby.
  assert.equal(shouldAnnounce(TERAZ, TERAZ, TERAZ), false);
});
