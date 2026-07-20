import assert from "node:assert/strict";
import { test } from "node:test";

import { rankGames, type RawgGame } from "./games.js";

/** Skrót do budowania atrap wyników RAWG. */
const gra = (name: string, added: number, id = 1, released?: string): RawgGame => ({
  id,
  name,
  added,
  released,
});

const tytuly = (gry: RawgGame[]) => gry.map((g) => g.name);

test("hit wygrywa z amatorska gra o dokladnie takiej nazwie", () => {
  // Prawdziwy przypadek: RAWG na „witcher" stawial „Witcher Switcher" nad Wiedzminem 3,
  // bo dopasowanie nazwy bylo dokladniejsze. Popularnosc ma to przewazyc.
  const wynik = rankGames("witcher", [
    gra("witcher", 5, 1),
    gra("Witcher Switcher", 12, 2),
    gra("The Witcher 3: Wild Hunt", 21000, 3),
  ]);
  assert.equal(tytuly(wynik)[0], "The Witcher 3: Wild Hunt");
});

test("przy zblizonej popularnosci wygrywa trafniejsza nazwa", () => {
  const wynik = rankGames("zelda", [
    gra("Some Game Mentioning Zelda", 1000, 1),
    gra("Zelda", 1000, 2),
  ]);
  assert.equal(tytuly(wynik)[0], "Zelda");
});

test("interpunkcja i wielkosc liter nie psuja dopasowania", () => {
  const wynik = rankGames("mario bros", [
    gra("Totally Other Game", 900, 1),
    gra("MARIO  BROS.", 800, 2),
  ]);
  assert.equal(tytuly(wynik)[0], "MARIO  BROS.");
});

test("brak `added` nie wywala sortowania — uzywa ratings_count", () => {
  const wynik = rankGames("fifa", [
    { id: 1, name: "FIFA 97" },
    { id: 2, name: "FIFA 22", ratings_count: 5000 },
  ]);
  assert.equal(tytuly(wynik)[0], "FIFA 22");
});

test("pusta fraza sortuje sama popularnoscia i nie rzuca", () => {
  const wynik = rankGames("", [gra("Niszowa", 3, 1), gra("Popularna", 9000, 2)]);
  assert.deepEqual(tytuly(wynik), ["Popularna", "Niszowa"]);
});

test("seria o zblizonej popularnosci szereguje sie od najnowszej", () => {
  // Przypadek z produkcji: FIFA wychodzily w kolejnosci 18, 17, 15, 19 — roznice
  // w liczbie graczy sa tu male i przypadkowe, wiec o kolejnosci ma decydowac rok.
  const wynik = rankGames("fifa", [
    gra("FIFA 15", 1000, 1, "2014-09-23"),
    gra("FIFA 20", 1100, 2, "2019-09-27"),
    gra("FIFA 17", 1050, 3, "2016-09-27"),
  ]);
  assert.deepEqual(tytuly(wynik), ["FIFA 20", "FIFA 17", "FIFA 15"]);
});

test("rok NIE przebija duzej roznicy popularnosci", () => {
  // Nowa niszowa gra nie ma wyprzedzac klasyka tylko dlatego, ze jest swiezsza.
  const wynik = rankGames("witcher", [
    gra("Witcher Fan Remake", 4, 1, "2024-01-01"),
    gra("The Witcher 3: Wild Hunt", 21000, 2, "2015-05-18"),
  ]);
  assert.equal(tytuly(wynik)[0], "The Witcher 3: Wild Hunt");
});

test("gra bez daty premiery ladzie za datowanymi z tego samego kubelka", () => {
  const wynik = rankGames("fifa", [
    gra("FIFA bez daty", 1000, 1),
    gra("FIFA 20", 1000, 2, "2019-09-27"),
  ]);
  assert.deepEqual(tytuly(wynik), ["FIFA 20", "FIFA bez daty"]);
});

test("nie mutuje tablicy wejsciowej", () => {
  const wejscie = [gra("Niszowa", 3, 1), gra("Popularna", 9000, 2)];
  rankGames("gra", wejscie);
  assert.deepEqual(tytuly(wejscie), ["Niszowa", "Popularna"], "kolejnosc bez zmian");
});
