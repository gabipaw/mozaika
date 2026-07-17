/**
 * Język żądania — jeden dla całej obsługi requestu.
 *
 * Tytuły i opisy filmów nie są nasze: przychodzą z TMDB, które oddaje je w takim
 * języku, o jaki poprosimy (`language=`). Żeby nie przepychać `lang` przez sygnatury
 * kilkunastu funkcji domenowych, trzymamy go w AsyncLocalStorage — middleware ustawia
 * go raz na request, a warstwa TMDB czyta w miejscu użycia.
 */
import { AsyncLocalStorage } from "node:async_hooks";

/** Języki, które umie front (kody z przełącznika w app.js) → locale TMDB. */
const TMDB_LOCALES: Record<string, string> = {
  pl: "pl-PL",
  en: "en-US",
  de: "de-DE",
  es: "es-ES",
  pt: "pt-BR",
  zh: "zh-CN",
  ja: "ja-JP",
};

export const DEFAULT_LANG = "pl";

/** Kod języka (2 litery) obsługiwany przez front, albo domyślny polski. */
export function normalizeLang(raw: string | null | undefined): string {
  const code = (raw ?? "").trim().slice(0, 2).toLowerCase();
  return code in TMDB_LOCALES ? code : DEFAULT_LANG;
}

const storage = new AsyncLocalStorage<string>();

/** Uruchamia `fn` w kontekście danego języka (używane przez middleware). */
export function withLang<T>(lang: string, fn: () => T): T {
  return storage.run(normalizeLang(lang), fn);
}

/** Kod języka bieżącego requestu. Poza requestem (cron, testy) — polski. */
export function currentLang(): string {
  return storage.getStore() ?? DEFAULT_LANG;
}

/** Locale do parametru `language=` w TMDB, np. "de-DE". */
export function tmdbLocale(lang: string = currentLang()): string {
  return TMDB_LOCALES[normalizeLang(lang)];
}
