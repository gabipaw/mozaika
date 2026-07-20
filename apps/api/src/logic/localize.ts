/**
 * Tłumaczenie tytułów katalogowych w odpowiedziach API.
 *
 * Film w bazie ma jeden `title`, zapisany w języku z chwili dodania — a oglądać go
 * może ktoś z innym językiem. Tytuły z ŻYWEGO TMDB (wyszukiwarka, discovery) są już
 * we właściwym języku, bo pytamy z `language=` bieżącego requestu; problem dotyczy
 * wyłącznie tego, co wychodzi z bazy.
 *
 * Rekordy Media wracają w kilkunastu miejscach i w różnych kształtach: samodzielnie,
 * w recenzji, w watchliście, w wiadomości czatu. Zamiast dokładać tłumaczenie w każdej
 * z tych ścieżek (i zapominać o nim w kolejnej), przechodzimy gotową odpowiedź i
 * podmieniamy tytuł tam, gdzie faktycznie jest — jedno miejsce, zero przeoczeń.
 *
 * Rozpoznajemy rekord bazy po `type: "FILM"` (enum Prismy, wersalikami). Discovery
 * używa małych kluczy źródła („film", „music"), więc jego świeże wyniki nie wpadają
 * tu przez pomyłkę.
 */
import { DEFAULT_LANG } from "./lang.js";
import { tmdbTitles } from "./tmdb.js";

interface FilmNode {
  type: string;
  externalId: string;
  title: string;
}

/**
 * Czy węzeł to rekord filmu ALBO serialu z katalogu (a nie świeży wynik z discovery).
 * Oba biorą tłumaczenie z TMDB, ale z INNYCH ścieżek (`/movie` vs `/tv`) — id 1399
 * to zupełnie inna pozycja w każdym z katalogów, więc rodzaju nie wolno pomylić.
 */
function isFilmNode(v: unknown): v is FilmNode {
  const o = v as Record<string, unknown> | null;
  return (
    !!o &&
    (o.type === "FILM" || o.type === "SERIAL") &&
    typeof o.externalId === "string" &&
    typeof o.title === "string"
  );
}

/** Odwiedza każdy obiekt/tablicę w strukturze odpowiedzi. */
function walk(node: unknown, visit: (film: FilmNode) => void): void {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit);
    return;
  }
  if (node === null || typeof node !== "object") return;
  if (isFilmNode(node)) visit(node);
  for (const value of Object.values(node)) walk(value, visit);
}

/**
 * Podmienia tytuły filmów w odpowiedzi na wersje w `lang`. Modyfikuje `body` w miejscu
 * (to świeżo sparsowany JSON tej odpowiedzi, niczyj więcej) i je zwraca.
 */
export async function localizeTitles(body: unknown, lang: string): Promise<unknown> {
  if (lang === DEFAULT_LANG) return body; // baza i tak jest po polsku

  const films: FilmNode[] = [];
  walk(body, (film) => films.push(film));
  if (!films.length) return body;

  // Osobne zapytania dla filmów i seriali — patrz uwaga przy isFilmNode.
  const [filmy, seriale] = [
    films.filter((f) => f.type === "FILM"),
    films.filter((f) => f.type === "SERIAL"),
  ];
  const [tytulyFilmow, tytulySeriali] = await Promise.all([
    filmy.length
      ? tmdbTitles(
          filmy.map((f) => f.externalId),
          lang,
          "movie",
        )
      : new Map<string, string>(),
    seriale.length
      ? tmdbTitles(
          seriale.map((f) => f.externalId),
          lang,
          "tv",
        )
      : new Map<string, string>(),
  ]);

  // Brak trafienia = zostaje tytuł z bazy. Lepszy polski niż pusty.
  for (const film of films) {
    const slownik = film.type === "SERIAL" ? tytulySeriali : tytulyFilmow;
    const translated = slownik.get(film.externalId);
    if (translated) film.title = translated;
  }
  return body;
}
