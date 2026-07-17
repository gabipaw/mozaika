/**
 * Tłumaczenie tekstów pisanych przez użytkowników (czat, recenzje, komentarze)
 * na język wybrany w ustawieniach. Silnik: DeepL (plan free).
 *
 * Tytułów i opisów z TMDB to NIE dotyczy — te przychodzą już w dobrym języku,
 * bo pytamy o nie z `language=` requestu (patrz logic/lang.ts).
 *
 * Klucz (DEEPL_API_KEY) jest po stronie serwera. Bez klucza tłumaczenie jest po
 * prostu wyłączone — front pyta o to `/api/translate/enabled` i nie pokazuje
 * przycisku, zamiast dawać go i wywalać się przy kliknięciu.
 */
import { createHash } from "node:crypto";

import { ValidationError } from "../errors.js";
import { currentLang, DEFAULT_LANG } from "./lang.js";

/**
 * DeepL ma DWA adresy i wybór zależy od planu, nie od nas. Klucze planu free kończą
 * się na „:fx" (tak to dokumentuje DeepL) i chodzą pod api-free; klucze Pro pod api.
 * Bierzemy to z klucza, bo zaszycie jednego adresu znaczyłoby, że zmiana planu psuje
 * tłumaczenie bez żadnej wskazówki dlaczego.
 */
function deeplUrl(key: string): string {
  const host = key.endsWith(":fx") ? "api-free.deepl.com" : "api.deepl.com";
  return `https://${host}/v2/translate`;
}

/** Nasze kody języków → kody docelowe DeepL (te są inne, np. pt → PT-BR). */
const DEEPL_TARGETS: Record<string, string> = {
  pl: "PL",
  en: "EN-US",
  de: "DE",
  es: "ES",
  pt: "PT-BR",
  zh: "ZH",
  ja: "JA",
};

export function translateEnabled(): boolean {
  return !!process.env.DEEPL_API_KEY;
}

/** Dłuższych tekstów nie tłumaczymy — limit DeepL jest wspólny dla całej apki. */
const MAX_CHARS = 2000;

export interface Translation {
  text: string;
  /** Język źródłowy wykryty przez DeepL (kod dwuliterowy, np. "en"). */
  from: string;
}

/**
 * Cache w pamięci procesu: ten sam tekst tłumaczy się tak samo w kółko, a każdy
 * znak liczy się do miesięcznego limitu. Kluczem skrót tekstu (nie sam tekst —
 * to prywatne wiadomości, nie ma powodu trzymać ich w pamięci dwa razy).
 */
const cache = new Map<string, Translation>();
const MAX_CACHE = 500;

const cacheKeyFor = (text: string, target: string) =>
  `${target}:${createHash("sha256").update(text).digest("hex")}`;

/**
 * Ile tekstów naraz. DeepL nie ogranicza ich liczby, tylko rozmiar żądania (128 KiB),
 * ale przy MAX_CHARS=2000 pięćdziesiąt sztuk to ~100 KB — mieścimy się z zapasem.
 */
const MAX_BATCH = 50;

/**
 * Tłumaczy WIELE tekstów jednym zapytaniem — DeepL przyjmuje je hurtem i oddaje
 * w tej samej kolejności. To nie optymalizacja dla sportu: tryb automatyczny
 * tłumaczy cały wątek naraz, a osobne zapytanie na wiadomość rozbijałoby limit
 * żądań (30/min) na pierwszej dłuższej rozmowie.
 */
export async function translateMany(
  raws: string[],
  lang: string = currentLang(),
): Promise<Translation[]> {
  const texts = raws.map((r) => (r ?? "").trim());
  if (!texts.length) return [];
  if (texts.length > MAX_BATCH) {
    throw new ValidationError(`Naraz maksymalnie ${MAX_BATCH} tekstów.`);
  }
  for (const text of texts) {
    if (!text) throw new ValidationError("Nie ma czego tłumaczyć.");
    if (text.length > MAX_CHARS) {
      throw new ValidationError(`Tekst jest za długi (limit ${MAX_CHARS} znaków).`);
    }
  }
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new ValidationError("Tłumaczenie jest wyłączone na tym serwerze.");

  const target = DEEPL_TARGETS[lang] ?? DEEPL_TARGETS.pl;
  const out = new Array<Translation | undefined>(texts.length);
  texts.forEach((text, i) => (out[i] = cache.get(cacheKeyFor(text, target))));

  // Do DeepL-a idzie tylko to, czego nie ma w cache, i bez powtórek: w jednym wątku
  // te same „ok" czy „dzięki" potrafią wystąpić wiele razy, a każde kosztuje znaki.
  const missing = [...new Set(texts.filter((_, i) => !out[i]))];
  if (missing.length) {
    const res = await fetch(deeplUrl(key), {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text: missing, target_lang: target }),
    });
    // 456 = wyczerpany limit znaków; osobny komunikat, bo to nie jest awaria kodu.
    if (res.status === 456) {
      throw new ValidationError("Miesięczny limit tłumaczeń wyczerpany.");
    }
    if (!res.ok) throw new Error(`DeepL error ${res.status}`);

    const data = (await res.json()) as {
      translations?: { text: string; detected_source_language?: string }[];
    };
    const got = data.translations ?? [];
    if (got.length !== missing.length) {
      throw new Error("DeepL zwrócił inną liczbę tłumaczeń niż tekstów.");
    }
    const byText = new Map<string, Translation>();
    missing.forEach((text, i) => {
      const tr: Translation = {
        text: got[i].text,
        from: (got[i].detected_source_language ?? "").toLowerCase(),
      };
      byText.set(text, tr);
      // Najstarszy wpis wypada — cache ma nie rosnąć w nieskończoność na wolnym planie.
      if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
      cache.set(cacheKeyFor(text, target), tr);
    });
    texts.forEach((text, i) => (out[i] ??= byText.get(text)));
  }
  return out as Translation[];
}

export async function translate(
  raw: string,
  lang: string = currentLang(),
): Promise<Translation> {
  return (await translateMany([raw], lang))[0];
}

/**
 * Komunikat błędu w języku użytkownika.
 *
 * Błędy domenowe są w kodzie po polsku (73 różne teksty, część z wstawkami w rodzaju
 * „max 500 znaków"). Słownik znaczyłby ~500 ręcznie tłumaczonych stringów i pilnowanie
 * go przy każdym nowym komunikacie — a mamy DeepL i te teksty są krótkie oraz stale
 * te same, więc cache tłumaczy każdy z nich raz na język i tyle.
 *
 * Cokolwiek pójdzie nie tak (brak klucza, wyczerpany limit, padnięta sieć) — zostaje
 * polski oryginał. Błąd ma dotrzeć do użytkownika zawsze; język jest dodatkiem.
 */
export async function localizeMessage(msg: string, lang: string): Promise<string> {
  if (lang === DEFAULT_LANG || !translateEnabled() || !msg.trim()) return msg;
  try {
    return (await translate(msg, lang)).text;
  } catch {
    return msg;
  }
}
