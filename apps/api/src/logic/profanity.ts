/**
 * Filtr wulgaryzmów i obelg — zamienia trafione słowa na gwiazdki.
 *
 * Działa na tekstach PUBLICZNYCH: bio, nazwa użytkownika, recenzje, komentarze.
 * Prywatnych rozmów NIE dotyka — tam ludzie piszą do siebie i cenzurowanie
 * cudzej wiadomości nie jest naszą rolą.
 *
 * Uczciwie o ograniczeniach: lista słów nigdy nie jest kompletna i zawsze da się
 * ją obejść. Chodzi o podniesienie poprzeczki (przypadkowe wejście na profil
 * z obelgą), nie o szczelną moderację. Dlatego lista jest CELOWO zachowawcza —
 * słowa wieloznaczne („cygan", „murzyn", „asfalt", ang. „fag" = papieros w UK)
 * pomijamy, bo fałszywy alarm na zwykłym zdaniu boli bardziej niż przepuszczone
 * wyzwisko.
 */

/** Cyfry i znaki podstawiane za litery („kurw4", „ch0j", „f@ck"). */
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
};

/**
 * Litery z innych alfabetów wyglądające IDENTYCZNIE jak łacińskie. Bez tego
 * „кurwa" z cyrylickim „к" przechodziło jak gdyby nigdy nic — wygląda tak samo,
 * a dla kodu to inny znak.
 */
const HOMOGLYPHS: Record<string, string> = {
  а: "a",
  е: "e",
  о: "o",
  с: "c",
  р: "p",
  х: "x",
  у: "y",
  к: "k",
  м: "m",
  т: "t",
  в: "b",
  н: "h",
  і: "i",
  ј: "j",
  ѕ: "s",
  ԁ: "d",
  г: "r",
  п: "n",
  α: "a",
  ο: "o",
  ε: "e",
  ι: "i",
  κ: "k",
  τ: "t",
  ν: "v",
  ρ: "p",
  χ: "x",
};

/**
 * Znaki niewidoczne (zero-width, soft hyphen, znaczniki kierunku) — wklejone w środek
 * słowa rozbijały dopasowanie, a na ekranie nie widać ich wcale. Zapisane kodami,
 * bo literalnie byłyby w pliku niewidzialne.
 */
const INVISIBLE = /[\u00AD\u200B-\u200F\u2060\uFEFF]/g;

/**
 * Sprowadza słowo do postaci porównywalnej: bez wielkości liter, bez ogonków
 * i znaków łączących, bez kropek/myślników w środku („k.u.r.w.a"), bez znaków
 * niewidocznych, z podmienionymi homoglifami i leetspeakiem, bez rozciągania
 * liter („kuuurwa" → „kurwa"). Gwiazdki ZOSTAJĄ — obsługuje je dopasowanie.
 */
function normalize(word: string): string {
  const bare = [...word.toLowerCase().replace(INVISIBLE, "")]
    .map((c) => HOMOGLYPHS[c] ?? c)
    .join("")
    // „ß" NIE rozkłada się przez NFD, więc bez tego „scheiße" i „scheisse" to dla
    // kodu dwa różne słowa.
    .replace(/ß/g, "ss")
    .normalize("NFD")
    // \p{M} zamiast \p{Diacritic}: kreska łącząca spod „K̲U̲R̲W̲A̲" to znak łączący,
    // ale NIE diakrytyk — na samym \p{Diacritic} to obejście przechodziło.
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9@$*]/g, "");
  const deleet = [...bare].map((c) => LEET[c] ?? c).join("");
  return deleet.replace(/(.)\1{2,}/g, "$1");
}

/** Czy `word` pasuje do `pattern`, w którym „*" zastępuje dowolny znak. */
function matches(pattern: string, word: string): boolean {
  if (pattern.length !== word.length) return false;
  for (let i = 0; i < word.length; i++) {
    if (pattern[i] !== "*" && pattern[i] !== word[i]) return false;
  }
  return true;
}

/**
 * Rdzenie (dopasowanie po POCZĄTKU słowa) — polski odmienia wulgaryzmy na
 * kilkanaście sposobów („jebany", „jebana", „zajebiste"), więc lista pełnych form
 * byłaby bez końca. Rdzenie dobrane tak, żeby nie łapały zwykłych słów.
 */
const ROOTS = [
  "kurw",
  "chuj",
  "choj", // wariant „chój"; tu wpada też leetowe „ch0j" (0 → o)
  "huj",
  "pierdol",
  "pierdal",
  "jeba",
  "jebi",
  "jebn",
  "jeban",
  "zajeb",
  "wyjeb",
  "rozjeb",
  "najeb",
  "skurwysyn",
  "pizd",
  "kutas",
  "cwel",
  // Obelgi na tle rasowym/etnicznym i homofobiczne.
  "czarnuch",
  "ciapat",
  "parch",
  "zydek",
  "zydzisk",
  "pedzio",
  "nigger",
  "nigga",
  "faggot",
  "chinaman",
  "wetback",

  // --- niemiecki ---
  "arschloch",
  "hurensohn",
  "wichser",
  "schlampe",
  "scheiss", // „scheiße" → „scheisse" (ß rozwijamy w normalizacji)
  "ficken",
  "fickt",
  "verpiss",
  "neger", // obelga rasowa
  "kanake", // obelga etniczna
  "schwuchtel", // obelga homofobiczna

  // --- hiszpański ---
  "puta",
  "puto",
  "mierda",
  "joder",
  "jodid",
  "gilipolla",
  "cabron",
  "maricon",
  "pendejo",
  "sudaca", // obelga wobec Latynosów
  "chingar",
  "chinga",

  // --- portugalski ---
  "caralho",
  "foder",
  "fodas",
  "merda",
  "cuzao",
  "viado", // obelga homofobiczna („veado" pomijamy — to też „jeleń")
  "otario",
  "corno",
];

/**
 * Chiński i japoński NIE mają spacji między słowami, więc podział na słowa i rdzenie
 * tu nie działa — całe zdanie jest jednym „słowem". Dlatego szukamy tych wyrażeń jako
 * FRAGMENTU tekstu. To bezpieczne, bo znaki są długie i jednoznaczne (inaczej niż
 * łacińskie „cunt" w „country").
 */
const CJK = [
  // chiński
  "傻逼",
  "傻屄",
  "操你妈",
  "草你妈",
  "他妈的",
  "婊子",
  "贱人",
  "支那", // obelga wobec Chińczyków
  "尼哥", // zapis „nigger"
  "死全家",
  // japoński
  "死ね",
  "くたばれ",
  "きちがい",
  "キチガイ",
  "気違い",
  "チョン", // obelga wobec Koreańczyków
  "土人", // obelga wobec ludów rdzennych
  "クソ野郎",
  "くそったれ",
];

/**
 * Pełne słowa — tu dopasowanie DOKŁADNE, bo przedrostek łapałby niewinne wyrazy
 * („cunt" jako rdzeń złapałby „country", „spic" — „spice").
 */
const EXACT = new Set([
  "cipa",
  "cipy",
  "cipe",
  "szmata",
  "pedal",
  "pedaly",
  "fuck",
  "fack", // tu trafia „f@ck" i „f4ck" — @ i 4 czytamy jako „a", a „fack" nie jest słowem
  // Formy bez samogłosek dopisane WYBIÓRCZO. Ogólne dopasowanie po szkielecie
  // spółgłosek („fck" ≈ „fuck") łapałoby też zwykłe skróty, więc lepiej kilka
  // konkretnych wpisów niż reguła tnąca niewinne słowa.
  "fck",
  "fuk",
  "fuking",
  "krwa",
  "fucking",
  "fucker",
  "motherfucker",
  "cunt",
  "cunts",
  "whore",
  "slut",
  "retard",
  "retarded",
  "chink",
  "chinks",
  "kike",
  "kikes",
  "spic",
  "spics",
  "tranny",
  "trannies",
  "bitch",
  "bitches",
  "asshole",
  "assholes",
]);

function isBad(word: string): boolean {
  const n = normalize(word);
  if (n.length < 3) return false; // za krótkie, żeby cokolwiek znaczyło
  if (!n.includes("*")) {
    return EXACT.has(n) || ROOTS.some((r) => n.startsWith(r));
  }
  // Z gwiazdką („f*ck", „ch*j") — gwiazdka zastępuje dowolną literę. Reszta liter
  // musi się zgadzać co do jednej, więc zwykłe słowa z „*" nie wpadają przypadkiem.
  return (
    [...EXACT].some((w) => matches(n, w)) ||
    ROOTS.some((r) => n.length >= r.length && matches(n.slice(0, r.length), r))
  );
}

/**
 * Zamienia wulgaryzmy na gwiazdki, resztę tekstu zostawia bez zmian.
 * Długość słowa zachowana — „****" zamiast „kurwa" nie zmienia układu zdania
 * ani nie omija limitu znaków.
 */
/**
 * Litery rozstrzelone spacjami („k u r w a"). To jedyne obejście, którego nie da się
 * złapać patrząc na pojedyncze słowo — trzeba skleić ciąg pojedynczych znaków.
 *
 * Sklejamy TYLKO takie ciągi (pojedyncze litery oddzielone spacją/kropką/myślnikiem)
 * i maskujemy dopiero, gdy sklejone faktycznie jest wulgaryzmem. Sklejanie CAŁEGO
 * tekstu byłoby katastrofą: „cichu jasny" bez spacji zawiera „chuj".
 */
const SPACED =
  /(?<![\p{L}\p{N}])(?:[\p{L}\p{N}@$*][ .\-_]+){2,}[\p{L}\p{N}@$*](?![\p{L}\p{N}])/gu;

/**
 * Dla sklejonego ciągu pytamy o ZAWIERANIE, nie o początek: dopasowanie wciąga też
 * sąsiednią samotną literę („o k u r w a" → „okurwa"), więc sprawdzanie od początku
 * by go nie złapało. Bezpieczne, bo dotyczy wyłącznie ciągów pojedynczych liter.
 */
function spacedIsBad(seq: string): boolean {
  const n = normalize(seq.replace(/[ .\-_]/g, ""));
  if (n.length < 3) return false;
  return ROOTS.some((r) => n.includes(r)) || [...EXACT].some((w) => n.includes(w));
}

export function censor(input: string): string {
  // Znaki niewidoczne lecą z CAŁEGO tekstu od razu: wklejone w środek słowa rozbijały
  // je na kawałki jeszcze zanim normalizacja zdążyła cokolwiek zrobić („kur<zwsp>wa"
  // to dla kodu „kur" + „wa"). W opisie czy recenzji nie mają żadnego zastosowania.
  let raw = input.replace(INVISIBLE, "");
  // Chiński/japoński: bez spacji nie ma „słów", więc podmieniamy fragment tekstu.
  for (const zwrot of CJK) {
    if (raw.includes(zwrot)) raw = raw.split(zwrot).join("*".repeat(zwrot.length));
  }
  const bezRozstrzelonych = raw.replace(SPACED, (seq) =>
    spacedIsBad(seq) ? "*".repeat(seq.length) : seq,
  );
  // Token = słowo z ewentualnymi kropkami/myślnikami/podstawieniami w środku,
  // żeby „k.u.r.w.a" wpadło w jedno dopasowanie, a nie rozsypało się na litery.
  // Zaczynać się może też od „@" lub „$" — inaczej „@sshole" gubiło pierwszą
  // literę i przechodziło jako „sshole".
  return bezRozstrzelonych.replace(/[\p{L}\p{N}@$][\p{L}\p{N}\p{M}._\-*@$]*/gu, (word) =>
    isBad(word) ? "*".repeat(word.length) : word,
  );
}

/** Czy tekst zawiera coś, co filtr by ocenzurował. */
export function hasProfanity(raw: string): boolean {
  return censor(raw) !== raw;
}
