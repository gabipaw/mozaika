/**
 * Testy filtra wulgaryzmów. Dwa rodzaje ryzyka i oba trzeba trzymać w ryzach:
 * przepuszczone wyzwisko ORAZ fałszywy alarm na zwykłym słowie (ten drugi jest
 * gorszy — psuje tekst człowiekowi, który nic złego nie napisał).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { censor, hasProfanity } from "./profanity.js";

test("zwykły tekst zostaje NIETKNIĘTY", () => {
  const teksty = [
    "Kino science fiction i japońskie animacje.",
    "Lubię filmy Kubricka, gry RPG i mangę.",
    "Oglądam wszystko — od Disneya po kino nowej przygody.",
    "Klasyka: Ojciec chrzestny, Chinatown, Siedem.",
  ];
  for (const t of teksty) assert.equal(censor(t), t, `zmienił: ${t}`);
});

test("wulgaryzm zamieniony na tyle gwiazdek, ile miał liter", () => {
  assert.equal(censor("ale kurwa fajny film"), "ale ***** fajny film");
  assert.equal(hasProfanity("ale kurwa fajny film"), true);
});

test("polska odmiana też wpada (rdzeń, nie pełna forma)", () => {
  for (const w of ["jebany", "jebana", "zajebiste", "pierdolony", "skurwysyn"]) {
    assert.equal(hasProfanity(`taki ${w} tekst`), true, `przepuścił: ${w}`);
  }
});

test("obelgi rasowe łapane po polsku i angielsku", () => {
  for (const w of ["czarnuch", "nigger", "faggot", "kike", "chink"]) {
    assert.equal(hasProfanity(`ty ${w}`), true, `przepuścił: ${w}`);
  }
});

test("obejścia: wielkie litery, ogonki, leetspeak, kropki, rozciąganie", () => {
  const proby = [
    "KURWA",
    "kurw4",
    "k.u.r.w.a",
    "kuuurwa",
    "ch0j",
    "chój",
    "f@ck",
    "@sshole",
    "b1tch",
    "n1gger",
  ];
  for (const w of proby) {
    assert.equal(hasProfanity(`o ${w} tu`), true, `przepuścił: ${w}`);
  }
});

test("słowa bez samogłosek (f*ck, fck) przechodzą — to świadomy kompromis", () => {
  // Żeby je złapać, trzeba by traktować „*" jak dowolną literę i zgadywać samogłoski,
  // a wtedy filtr tnie zwykłe wyrazy. Kto pisze „f*ck", ten już się ocenzurował sam.
  assert.equal(censor("no f*ck wie"), "no f*ck wie");
  assert.equal(censor("no fck wie"), "no fck wie");
});

test("NIE łapie niewinnych słów zawierających podobne ciągi", () => {
  // Klasyczny problem filtrów: „country" zawiera „cunt", „Scunthorpe" itd.
  const niewinne = [
    "country",
    "countryside",
    "spice",
    "spicy",
    "analiza",
    "assassin",
    "Chinatown",
    "klasyka",
    "dokument",
    "Cannes",
  ];
  for (const w of niewinne) {
    assert.equal(censor(`film ${w} tutaj`), `film ${w} tutaj`, `fałszywy alarm: ${w}`);
  }
});

test("cenzura nie zmienia długości tekstu (limit znaków zostaje limitem)", () => {
  const t = "kurwa mać";
  assert.equal(censor(t).length, t.length);
});

test("pusty tekst i sama interpunkcja nie wywalają filtra", () => {
  assert.equal(censor(""), "");
  assert.equal(censor("!!! ... ???"), "!!! ... ???");
  assert.equal(hasProfanity(""), false);
});
