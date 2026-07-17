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

export async function translate(
  raw: string,
  lang: string = currentLang(),
): Promise<Translation> {
  const text = (raw ?? "").trim();
  if (!text) throw new ValidationError("Nie ma czego tłumaczyć.");
  if (text.length > MAX_CHARS) {
    throw new ValidationError(`Tekst jest za długi (limit ${MAX_CHARS} znaków).`);
  }
  const key = process.env.DEEPL_API_KEY;
  if (!key) throw new ValidationError("Tłumaczenie jest wyłączone na tym serwerze.");

  const target = DEEPL_TARGETS[lang] ?? DEEPL_TARGETS.pl;
  const cacheKey = `${target}:${createHash("sha256").update(text).digest("hex")}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const res = await fetch(deeplUrl(key), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: [text], target_lang: target }),
  });
  // 456 = wyczerpany limit znaków; osobny komunikat, bo to nie jest awaria kodu.
  if (res.status === 456) {
    throw new ValidationError("Miesięczny limit tłumaczeń wyczerpany.");
  }
  if (!res.ok) throw new Error(`DeepL error ${res.status}`);

  const data = (await res.json()) as {
    translations?: { text: string; detected_source_language?: string }[];
  };
  const first = data.translations?.[0];
  if (!first) throw new Error("DeepL nie zwrócił tłumaczenia.");

  const out: Translation = {
    text: first.text,
    from: (first.detected_source_language ?? "").toLowerCase(),
  };
  // Najstarszy wpis wypada — cache ma nie rosnąć w nieskończoność na wolnym planie.
  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
  cache.set(cacheKey, out);
  return out;
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
