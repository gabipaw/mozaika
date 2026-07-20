/**
 * Integracja z Open Library — wyszukiwanie książek i dodawanie ich do katalogu.
 * Open Library jest darmowe i nie wymaga klucza API (żadnej konfiguracji na serwerze).
 */
import { MediaType } from "@prisma/client";

import { NotFoundError, ValidationError } from "../errors.js";
import { aniListTitles } from "./anilist.js";
import { type ExternalMedia, upsertExternalMedia } from "./media.js";

const OL = "https://openlibrary.org";
const COVER = "https://covers.openlibrary.org/b/id";

function coverUrl(coverId: number | null | undefined): string | null {
  return coverId ? `${COVER}/${coverId}-L.jpg` : null;
}

// Oznaczenia tomu/części w wielu językach: "Vol. 1", "Tome 01", "Part7", "Parte 7", "Band 3"…
// (brak \b po słowie celowo — łapie też sklejone formy typu "Part7").
const VOLUME_MARKER =
  /\b(volume|vol|tome|tomo|tom|teil|band|parte|part|deel|book)\.?\s*#?\s*\d+/gi;

/**
 * Usuwa z tytułu oznaczenia tomu/wydania (Vol/Tome/Part/…, "#3", końcowy numer),
 * żeby wszystkie tomy jednej serii zwijały się do jednego tytułu (np. "Naruto").
 */
function cleanTitle(raw: string): string {
  const cleaned = raw
    .replace(/[,:#._-]+/g, " ")
    .replace(VOLUME_MARKER, " ")
    .replace(/\s+\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || raw.trim();
}

/**
 * Klucz do zwijania tomów tej samej serii. Agresywnie normalizuje: bez oznaczeń tomu,
 * bez znaków niełacińskich (jap./interpunkcja) i diakrytyków — dzięki temu warianty
 * "STEEL BALL RUN 1", "…スティール… 3", "…Vol. 9" trafiają pod jeden klucz.
 */
function dedupKey(raw: string): string {
  return cleanTitle(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Klucz do por\u00f3wnywania ksi\u0105\u017cki z mang\u0105 \u2014 same znaki alfanumeryczne (bez spacji,
 * apostrof\u00f3w, my\u015blnik\u00f3w), \u017ceby "JoJo's Bizarre\u2026" i "JOJOS BIZARRE\u2026" si\u0119 zr\u00f3wna\u0142y.
 */
function matchKey(raw: string): string {
  return cleanTitle(raw)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

interface OlDoc {
  key: string; // np. "/works/OL45804W"
  title: string;
  first_publish_year?: number;
  cover_i?: number;
  author_name?: string[];
}

function toBook(d: OlDoc): ExternalMedia {
  const author = d.author_name?.[0];
  const title = cleanTitle(d.title);
  return {
    externalId: d.key.replace("/works/", ""),
    title: author ? `${title} — ${author}` : title,
    year: d.first_publish_year ?? null,
    posterUrl: coverUrl(d.cover_i),
    // Pusto CELOWO: wyniki wyszukiwania nigdy nie trafiają do bazy — zapisuje je
    // dopiero addBookFromOpenLibrary, które pyta /works/{id} i stamtąd bierze
    // gatunki (genresFromSubjects). Ciągnięcie „subjects" dla 60 wyników naraz
    // byłoby czystym marnotrawstwem, bo karty i tak ich nie pokazują.
    genres: [],
  };
}

/**
 * Szuka książek w Open Library. Pomija pozycje bez okładki i zwija wszystkie
 * tomy tej samej serii do jednego wpisu. Zwraca do 18 wyników.
 */
export async function searchBooks(query: string): Promise<ExternalMedia[]> {
  const q = query.trim();
  if (!q) throw new ValidationError("Podaj frazę do wyszukania.");

  // Pobieramy z zapasem (60), bo po odfiltrowaniu bez-okładek i dedupie zostaje mniej.
  const url =
    `${OL}/search.json?limit=60` +
    `&fields=key,title,first_publish_year,cover_i,author_name` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open Library search error ${res.status}`);

  const data = (await res.json()) as { docs?: OlDoc[] };

  // Manga trafia do Open Library jako „książki" (tomy) — pytamy AniList o tę samą
  // frazę i wykluczamy z wyników książek tytuły, które są mangą (mają swoją zakładkę).
  const mangaKeys = (await aniListTitles("MANGA", q))
    .map(matchKey)
    .filter((k) => k.length >= 5);

  const seen = new Set<string>();
  const out: ExternalMedia[] = [];
  for (const d of data.docs ?? []) {
    if (!d.title || !d.key || !d.cover_i) continue; // tylko z okładką
    const key = dedupKey(d.title);
    if (!key || seen.has(key)) continue; // ten sam tytuł (kolejny tom serii) już był
    if (isManga(matchKey(d.title), mangaKeys)) continue; // manga → zakładka Manga
    seen.add(key);
    out.push(toBook(d));
    if (out.length >= 18) break;
  }
  return out;
}

/**
 * Nasze nazwy gatunków (z TMDB/AniList) → „subject_key" w Open Library. Dzięki temu
 * gust nauczony na filmach przenosi się na książki: lubisz sci-fi → dostajesz książki
 * sci-fi. To mapowanie służy PYTANIU Open Library o gatunek; w drugą stronę (czytanie
 * gatunku dodawanej książki) działa `genresFromSubjects` niżej.
 *
 * Mapujemy TYLKO gatunki, w których OL jest wiarygodne — sprawdzone na żywym API.
 * Pominięte celowo: War/History (zwracają fantasy i przypadkowe non-fiction),
 * Drama/Action (dla książek nic nie znaczą). Lepiej mniej kategorii niż śmieci.
 */
const OL_SUBJECTS: Record<string, string> = {
  "Sci-Fi": "science_fiction",
  Fantasy: "fantasy",
  Horror: "horror",
  Thriller: "thriller",
  Mystery: "mystery",
  Romance: "romance",
  Adventure: "adventure",
  Comedy: "humor",
  Crime: "crime",
};

/** Czy Open Library rozpoznaje ten gatunek na tyle dobrze, żeby o niego pytać. */
export function recognizesBookGenre(genre: string): boolean {
  return genre in OL_SUBJECTS;
}

/**
 * Zapytanie do Open Library posortowane po ocenach czytelników (`sort=rating`).
 * Bierzemy z zapasem, bo odpadają pozycje bez okładki i kolejne tomy tej samej serii.
 * Błąd źródła = pusta lista (odkrywanie ma nie wywalać całej strony głównej).
 */
async function olDiscover(query: string): Promise<ExternalMedia[]> {
  const url =
    `${OL}/search.json?limit=60&sort=rating` +
    `&fields=key,title,first_publish_year,cover_i,author_name` +
    `&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: OlDoc[] };

    const seen = new Set<string>();
    const out: ExternalMedia[] = [];
    for (const d of data.docs ?? []) {
      if (!d.title || !d.key || !d.cover_i) continue; // tylko z okładką
      const key = dedupKey(d.title);
      if (!key || seen.has(key)) continue; // kolejny tom tej samej serii
      seen.add(key);
      out.push(toBook(d));
      if (out.length >= 18) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** „Odkrywanie" książek: najlepiej oceniane z okna lat (bez zapisu w bazie). */
export function discoverBooks(
  yearFrom: number,
  yearTo: number,
): Promise<ExternalMedia[]> {
  return olDiscover(`first_publish_year:[${yearFrom} TO ${yearTo}]`);
}

/** Książki w danym gatunku i oknie lat — najlepiej oceniane. */
export function discoverBooksByGenre(
  genre: string,
  yearFrom: number,
  yearTo: number,
): Promise<ExternalMedia[]> {
  const subject = OL_SUBJECTS[genre];
  if (!subject) return Promise.resolve([]);
  // subject_key (ścisła fasetka), NIE subject (rozmyty tekst) — rozmyty zwracał
  // „Złodzieja pioruna" dla horroru i Harry'ego Pottera dla wojny.
  return olDiscover(
    `subject_key:${subject} first_publish_year:[${yearFrom} TO ${yearTo}]`,
  );
}

/**
 * „Subjects" z Open Library → gatunki w TYM SAMYM słowniku co filmy, seriale i gry.
 *
 * Surowych subjectów wziąć się nie da — obok sensownych („Science fiction") lecą
 * „New York Times reviewed", „award:hugo_award=1966", „Anglais (langue)" czy nazwy
 * miejsc. Dlatego nie bierzemy ich hurtem, tylko wyławiamy rozpoznawalne gatunki.
 *
 * Nazwy MUSZĄ być te same co w TMDB/RAWG: afinność gatunkowa (tasteProfile) grupuje
 * po nazwie, więc osobne „Science fiction" dla książek rozbiłoby profil na połówki.
 *
 * Dopasowanie po CAŁYCH słowach, nie po fragmencie — inaczej „war" łapałoby się
 * w „Warsaw" i „award", a takich subjectów jest tu pełno.
 */
const BOOK_GENRE_RULES: Array<{ wzorzec: RegExp; gatunek: string }> = [
  { wzorzec: /\bscience fiction\b|\bsci fi\b/, gatunek: "Sci-Fi" },
  { wzorzec: /\bfantasy\b|\bfantastyczn\w*\b/, gatunek: "Fantasy" },
  { wzorzec: /\bhorror\w*\b|\bghost stories\b/, gatunek: "Horror" },
  { wzorzec: /\bthriller\w*\b|\bsuspense\b/, gatunek: "Thriller" },
  {
    wzorzec: /\bmystery\b|\bmysteries\b|\bdetective\w*\b|\bkryminal\w*\b/,
    gatunek: "Mystery",
  },
  { wzorzec: /\bromance\b|\blove stories\b|\bromans\w*\b/, gatunek: "Romance" },
  { wzorzec: /\bcrime\b|\bcriminal\w*\b/, gatunek: "Crime" },
  { wzorzec: /\bwestern\w*\b/, gatunek: "Western" },
  { wzorzec: /\bwar\b|\bwars\b|\bwojenn\w*\b/, gatunek: "War" },
  { wzorzec: /\bhistory\b|\bhistorical\b|\bhistoryczn\w*\b/, gatunek: "History" },
  { wzorzec: /\bhumor\w*\b|\bcomedy\b|\bsatire\b|\bcomic\b/, gatunek: "Comedy" },
  { wzorzec: /\badventure\w*\b|\bprzygod\w*\b/, gatunek: "Adventure" },
  { wzorzec: /\bjuvenile\b|\bchildren\w*\b|\bpicture books\b/, gatunek: "Family" },
  { wzorzec: /\bbiography\b|\bautobiography\b|\bmemoir\w*\b/, gatunek: "Documentary" },
  { wzorzec: /\bdrama\b|\bdramat\w*\b/, gatunek: "Drama" },
];

/** Ile gatunków najwyżej przypisujemy — dłuższa lista to już nie opis, tylko szum. */
const MAX_BOOK_GENRES = 4;

/** Do dopasowania: małe litery, bez znaków diakrytycznych, same słowa. */
function normalizeSubject(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Od ilu subjectów lista jest na tyle długa, że pojedyncze trafienie to już szum.
 * Popularne książki mają ich po sto — „Harry Potter" dostawał Sci-Fi od JEDNEJ
 * etykiety półki „Science fiction & fantasy" wśród 108 pozycji.
 */
const DUZO_SUBJECTOW = 10;

/**
 * Wyławia gatunki z listy „subjects". Pusta lista, gdy nic rozpoznawalnego nie ma.
 *
 * Liczymy, ILE subjectów wskazuje na dany gatunek, zamiast przyjmować pierwsze
 * trafienie: przy długich listach jedno przypadkowe słowo trafia się prawie zawsze,
 * a sygnał prawdziwy powtarza się („Juvenile fiction", „Children's stories",
 * „Juvenile literature" → Family). Gatunki z jednym trafieniem w długiej liście
 * odrzucamy, w krótkiej zostawiamy — tam jedno wskazanie to często całość opisu.
 */
export function genresFromSubjects(subjects: unknown): string[] {
  if (!Array.isArray(subjects)) return [];
  const teksty = subjects
    .filter((s): s is string => typeof s === "string")
    .map(normalizeSubject)
    .filter(Boolean);
  if (!teksty.length) return [];

  const prog = teksty.length > DUZO_SUBJECTOW ? 2 : 1;
  const trafienia = BOOK_GENRE_RULES.map(({ wzorzec, gatunek }) => ({
    gatunek,
    ile: teksty.filter((t) => wzorzec.test(t)).length,
  })).filter((g) => g.ile >= prog);

  // Najmocniejszy sygnał na początek; przy remisie zostaje kolejność z reguł
  // (a ta idzie od gatunków najbardziej charakterystycznych).
  trafienia.sort((a, b) => b.ile - a.ile);
  const out: string[] = [];
  for (const { gatunek } of trafienia) {
    if (out.length >= MAX_BOOK_GENRES) break;
    if (!out.includes(gatunek)) out.push(gatunek);
  }
  return out;
}

/** Czy klucz tytułu książki pasuje do którejś mangi (zawiera się / jest zawarty). */
function isManga(bookKey: string, mangaKeys: string[]): boolean {
  if (bookKey.length < 5) return false;
  return mangaKeys.some((mk) => mk.includes(bookKey) || bookKey.includes(mk));
}

/** Dodaje książkę z Open Library do katalogu (upsert po externalId). */
export async function addBookFromOpenLibrary(externalId: string) {
  const id = externalId.trim();
  if (!/^OL[0-9]+[A-Z]$/.test(id)) {
    throw new ValidationError("externalId musi być kluczem Open Library (np. OL45804W).");
  }

  const res = await fetch(`${OL}/works/${id}.json`);
  if (res.status === 404)
    throw new NotFoundError(`Książka Open Library ${id} nie istnieje.`);
  if (!res.ok) throw new Error(`Open Library error ${res.status}`);

  const work = (await res.json()) as {
    title?: string;
    covers?: number[];
    first_publish_date?: string;
    authors?: { author?: { key?: string } }[];
    subjects?: string[];
  };
  const year = work.first_publish_date
    ? Number((work.first_publish_date.match(/\d{4}/) ?? [])[0]) || null
    : null;
  const author = await authorName(work.authors?.[0]?.author?.key);
  const baseTitle = cleanTitle(work.title ?? id);
  return upsertExternalMedia(MediaType.KSIAZKA, {
    externalId: id,
    title: author ? `${baseTitle} — ${author}` : baseTitle,
    year,
    posterUrl: coverUrl(work.covers?.[0]),
    genres: genresFromSubjects(work.subjects),
  });
}

/** Opis książki (Open Library) — do widoku szczegółów. Pusty, gdy brak. */
export async function bookDescription(externalId: string): Promise<string> {
  const id = externalId.trim();
  if (!/^OL[0-9]+[A-Z]$/.test(id)) return "";
  const res = await fetch(`${OL}/works/${id}.json`);
  if (!res.ok) return "";
  const w = (await res.json()) as { description?: string | { value?: string } };
  const d =
    typeof w.description === "string" ? w.description : (w.description?.value ?? "");
  return d.trim();
}

/** Pobiera imię i nazwisko autora z Open Library (puste, gdy się nie uda — autor opcjonalny). */
async function authorName(key: string | undefined): Promise<string> {
  if (!key) return "";
  try {
    const res = await fetch(`${OL}${key}.json`);
    if (!res.ok) return "";
    return String(((await res.json()) as { name?: string }).name ?? "").trim();
  } catch {
    return "";
  }
}
