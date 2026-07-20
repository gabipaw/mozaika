import assert from "node:assert/strict";
import { test } from "node:test";

import { rankGames, type RawgGame } from "./games.js";

/** Skrót do budowania atrap wyników RAWG. */
const gra = (name: string, added: number, id = 1): RawgGame => ({ id, name, added });

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

test("nie mutuje tablicy wejsciowej", () => {
  const wejscie = [gra("Niszowa", 3, 1), gra("Popularna", 9000, 2)];
  rankGames("gra", wejscie);
  assert.deepEqual(tytuly(wejscie), ["Niszowa", "Popularna"], "kolejnosc bez zmian");
});
