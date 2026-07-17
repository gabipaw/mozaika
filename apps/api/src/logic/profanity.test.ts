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

test("gwiazdka w środku słowa (f*ck, ch*j) zastępuje dowolną literę", () => {
  assert.equal(hasProfanity("no f*ck wie"), true);
  assert.equal(hasProfanity("no ch*j wie"), true);
});

test("formy bez samogłosek (fck, fuk) — dopisane wybiórczo do listy", () => {
  assert.equal(hasProfanity("no fck wie"), true);
  assert.equal(hasProfanity("no fuk wie"), true);
});

test("litery rozstrzelone spacjami (k u r w a) są sklejane i łapane", () => {
  assert.equal(hasProfanity("ale k u r w a fajne"), true);
  assert.equal(hasProfanity("ale f u c k fajne"), true);
  assert.equal(hasProfanity("ale c z a r n u c h fajne"), true);
});

test("sklejanie NIE rusza zwykłych ciągów pojedynczych liter", () => {
  // Kluczowe zabezpieczenie: sklejamy tylko po to, żeby SPRAWDZIĆ — maskujemy
  // dopiero, gdy sklejone naprawdę jest wyzwiskiem.
  for (const t of ["a b c", "I o U", "M A Z U R Y", "to jest o k", "A B B A"]) {
    assert.equal(censor(t), t, `fałszywy alarm: ${t}`);
  }
});

test("nie sklejamy CALEGO tekstu (cichu jasny bez spacji zawiera wulgaryzm)", () => {
  assert.equal(censor("cichu jasny dzień"), "cichu jasny dzień");
});

test("znaki niewidoczne wklejone w słowo nie ratują wulgaryzmu", () => {
  assert.equal(hasProfanity("ale kur​wa"), true); // zero-width space
  assert.equal(hasProfanity("ale ku‍rwa"), true); // zero-width joiner
  assert.equal(hasProfanity("ale kur­wa"), true); // soft hyphen
});

test("cyrylickie litery udające łacińskie (кurwa) też wpadają", () => {
  assert.equal(hasProfanity("ale кurwa"), true); // к = cyrylickie „ka"
  assert.equal(hasProfanity("ale сhuj"), true); // с = cyrylickie „es"
});

test("znaki łączące (K̲U̲R̲W̲A̲) nie rozbijają już słowa", () => {
  assert.equal(hasProfanity("o K̲U̲R̲W̲A̲ tu"), true);
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
