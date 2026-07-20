import assert from "node:assert/strict";
import { test } from "node:test";

import { genresFromSubjects } from "./books.js";

test("wyławia gatunek z typowego subjectu Open Library", () => {
  // Prawdziwe subjecty „Diuny".
  const g = genresFromSubjects([
    "Dune (Imaginary place)",
    "Fiction",
    "Fiction, science fiction, general",
    "Science fiction",
  ]);
  assert.deepEqual(g, ["Sci-Fi"]);
});

test("rozpoznaje polskie subjecty", () => {
  // Prawdziwy subject „Chrztu ognia".
  const g = genresFromSubjects([
    "Powieść fantastyczna polska",
    "Fiction, thrillers, suspense",
  ]);
  assert.ok(g.includes("Fantasy"), "fantastyczna → Fantasy");
  assert.ok(g.includes("Thriller"), "thrillers → Thriller");
});

test("nazwy gatunków sa te same co dla filmow (Sci-Fi, nie 'Science fiction')", () => {
  // Afinnosc gustu grupuje po nazwie — rozjazd slownictwa rozbilby profil na polowki.
  assert.deepEqual(genresFromSubjects(["Science Fiction"]), ["Sci-Fi"]);
});

test("IGNORUJE szum: nagrody, notki wydawnicze, jezyki", () => {
  const g = genresFromSubjects([
    "New York Times reviewed",
    "nyt:mass-market-monthly=2021-11-07",
    "award:hugo_award=1966",
    "Hugo Award Winner",
    "American literature",
    "Anglais (langue)",
    "Translations into Russian",
  ]);
  assert.deepEqual(g, [], "nic z tego nie jest gatunkiem");
});

test("'war' nie lapie sie w 'Warsaw' ani 'Award'", () => {
  // Dopasowanie po calych slowach — inaczej pol katalogu bylo by wojenne.
  assert.deepEqual(genresFromSubjects(["Warsaw", "Award winning", "Backward"]), []);
  assert.deepEqual(genresFromSubjects(["World War, 1939-1945"]), ["War"]);
});

test("pojedynczy szum w DLUGIEJ liscie nie robi gatunku", () => {
  // Przypadek z produkcji: "Harry Potter" ma 108 subjectow i dostawal Sci-Fi od
  // JEDNEJ etykiety polki "Science fiction & fantasy". Sygnal prawdziwy sie powtarza.
  const dlugaLista = [
    "Juvenile fiction",
    "Children's stories",
    "Juvenile literature",
    "Children's fiction",
    "Magic",
    "Wizards",
    "Witches",
    "Schools",
    "Ghosts",
    "Monsters",
    "Science fiction & fantasy", // jedyne wskazanie na Sci-Fi
    "Fantasy fiction",
    "Fantasy",
  ];
  const g = genresFromSubjects(dlugaLista);
  assert.ok(!g.includes("Sci-Fi"), `Sci-Fi nie powinno przejsc, dostalem ${g}`);
  assert.ok(g.includes("Family"), "powtarzajace sie 'juvenile/children' → Family");
  assert.ok(g.includes("Fantasy"), "powtarzajace sie 'fantasy' → Fantasy");
});

test("w KROTKIEJ liscie jedno wskazanie wystarczy", () => {
  // Ksiazki niszowe maja po 2-3 subjecty; tam jedno trafienie to caly opis.
  assert.deepEqual(genresFromSubjects(["Horror tales", "American fiction"]), ["Horror"]);
});

test("nie zwraca wiecej niz 4 gatunkow", () => {
  const g = genresFromSubjects([
    "science fiction",
    "fantasy",
    "horror",
    "thriller",
    "mystery",
    "romance",
    "crime",
    "western",
  ]);
  assert.equal(g.length, 4);
});

test("brak subjectow albo zly typ nie wywala funkcji", () => {
  assert.deepEqual(genresFromSubjects([]), []);
  assert.deepEqual(genresFromSubjects(undefined), []);
  assert.deepEqual(genresFromSubjects("science fiction"), [], "string to nie tablica");
  assert.deepEqual(genresFromSubjects([null, 42, {}]), [], "smieci pomijamy");
});
