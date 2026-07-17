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
 * Sprowadza słowo do postaci porównywalnej: bez wielkości liter, bez ogonków,
 * bez kropek/myślników w środku („k.u.r.w.a"), z rozwiniętym leetspeakiem
 * i bez rozciągania liter („kuuurwa" → „kurwa").
 */
function normalize(word: string): string {
  const bare = word
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9@$]/g, "");
  const deleet = [...bare].map((c) => LEET[c] ?? c).join("");
  return deleet.replace(/(.)\1{2,}/g, "$1");
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
  return EXACT.has(n) || ROOTS.some((r) => n.startsWith(r));
}

/**
 * Zamienia wulgaryzmy na gwiazdki, resztę tekstu zostawia bez zmian.
 * Długość słowa zachowana — „****" zamiast „kurwa" nie zmienia układu zdania
 * ani nie omija limitu znaków.
 */
export function censor(raw: string): string {
  // Token = słowo z ewentualnymi kropkami/myślnikami/podstawieniami w środku,
  // żeby „k.u.r.w.a" wpadło w jedno dopasowanie, a nie rozsypało się na litery.
  // Zaczynać się może też od „@" lub „$" — inaczej „@sshole" gubiło pierwszą
  // literę i przechodziło jako „sshole".
  return raw.replace(/[\p{L}\p{N}@$][\p{L}\p{N}._\-*@$]*/gu, (word) =>
    isBad(word) ? "*".repeat(word.length) : word,
  );
}

/** Czy tekst zawiera coś, co filtr by ocenzurował. */
export function hasProfanity(raw: string): boolean {
  return censor(raw) !== raw;
}
