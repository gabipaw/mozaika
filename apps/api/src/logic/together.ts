/**
 * „Co obejrzeć razem" — typy dla DWOJGA.
 *
 * Pomysł: apka umie już dopasować gust dwóch osób („Wasz gust: 86%"), ale przy
 * decyzji „co dziś włączamy" ta wiedza nie była do niczego używana. Tutaj szukamy
 * tytułów, które spodobają się OBOJGU i których ŻADNE z was jeszcze nie oceniło.
 *
 * Skąd kandydaci (od najmocniejszego sygnału):
 *  1. oboje macie na liście „do obejrzenia" — nie ma lepszego dowodu chęci,
 *  2. jedno z was ma na liście, drugie tego nie zna,
 *  3. świeże tytuły z zewnątrz (ta sama maszyneria, co „Pod Twój gust").
 *
 * Punktacja: każdego kandydata przepuszczamy przez scorery OBU osób, a wynikiem
 * końcowym jest MINIMUM z dwóch przewidywanych ocen — nie średnia. Średnia
 * przepuszczałaby tytuły, które jedno pokocha, a drugie znienawidzi; minimum mówi
 * „obojgu spodoba się co najmniej tyle" i o to w oglądaniu razem chodzi.
 */
import { prisma } from "../db.js";
import { NotFoundError } from "../errors.js";
import { enumForKey, tasteDiscovery } from "./discovery.js";
import {
  computeTasteProfile,
  makeTasteScorer,
  type TasteReview,
} from "./tasteProfile.js";

/** Ile pozycji zwracamy. */
export const TOGETHER_LIMIT = 18;

export type TogetherReason =
  | { kind: "bothWatchlist" } // oboje macie na liście
  | { kind: "theirWatchlist" } // on/ona ma na liście, Ty tego nie znasz
  | { kind: "yourWatchlist" } // Ty masz na liście, on/ona tego nie zna
  | { kind: "fresh" }; // świeży tytuł spoza katalogu obojga

export interface TogetherItem {
  mediaId: number | null; // z katalogu (watchlisty) — albo null dla świeżych
  externalId: string | null;
  type: string; // klucz źródła na froncie (film / anime / …)
  title: string;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
  scoreYou: number; // przewidywana ocena dla Ciebie
  scoreThem: number; // przewidywana ocena dla niego/niej
  score: number; // min(scoreYou, scoreThem) — „obojgu spodoba się co najmniej tyle"
  reason: TogetherReason;
}

/**
 * Tylko to, co faktycznie konsumuje się WE DWOJE. Książki, mangę i muzykę celowo
 * pomijamy — bez tego filtra „co obejrzeć razem" proponowało albumy Metalliki
 * i powieści, czyli rzeczy z definicji samotne.
 */
const RAZEM_ENUM = new Set(["FILM", "SERIAL", "ANIME", "GRA"]);
const RAZEM_KLUCZE = new Set(["film", "anime", "game"]);

/** Waga sygnału — chęć obejrzenia bije samo dopasowanie gustu. */
const PRIORITY: Record<TogetherReason["kind"], number> = {
  bothWatchlist: 3,
  theirWatchlist: 2,
  yourWatchlist: 2,
  fresh: 1,
};

interface MediaRow {
  id: number;
  type: string;
  title: string;
  externalId: string | null;
  year: number | null;
  posterUrl: string | null;
  genres: string[];
}

const mediaSelect = {
  id: true,
  type: true,
  title: true,
  externalId: true,
  year: true,
  posterUrl: true,
  genres: true,
} as const;

/** Enum bazy („FILM") → klucz frontu („film"). Dla rodzajów bez źródła: małe litery. */
const FRONT_KEY: Record<string, string> = {
  FILM: "film",
  SERIAL: "film",
  ANIME: "anime",
  MANGA: "manga",
  GRA: "game",
  KSIAZKA: "book",
  MUZYKA: "music",
};

export async function togetherPicks(
  userId: number,
  otherId: number,
  limit: number = TOGETHER_LIMIT,
): Promise<TogetherItem[]> {
  if (userId === otherId) return [];

  const [ja, on] = await Promise.all([
    // Same sprawdzenia istnienia — patrz komentarz w recommendations.ts.
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: otherId }, select: { id: true } }),
  ]);
  if (!ja) throw new NotFoundError(`Użytkownik #${userId} nie istnieje.`);
  if (!on) throw new NotFoundError(`Użytkownik #${otherId} nie istnieje.`);

  const [mojeOceny, jegoOceny, mojaLista, jegoLista] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      select: {
        mediaId: true,
        rating: true,
        favorite: true,
        media: { select: mediaSelect },
      },
    }),
    prisma.review.findMany({
      where: { userId: otherId },
      select: {
        mediaId: true,
        rating: true,
        favorite: true,
        media: { select: mediaSelect },
      },
    }),
    prisma.watchlistItem.findMany({
      where: { userId },
      select: { media: { select: mediaSelect } },
    }),
    prisma.watchlistItem.findMany({
      where: { userId: otherId },
      select: { media: { select: mediaSelect } },
    }),
  ]);

  const doProfilu = (
    oceny: { mediaId: number; rating: number; favorite: boolean; media: MediaRow }[],
  ): TasteReview[] =>
    oceny.map((r) => ({
      mediaId: r.mediaId,
      rating: r.rating,
      favorite: r.favorite,
      type: r.media.type,
      year: r.media.year,
      genres: r.media.genres,
    }));

  const scorerJa = makeTasteScorer(computeTasteProfile(doProfilu(mojeOceny)));
  const scorerOn = makeTasteScorer(computeTasteProfile(doProfilu(jegoOceny)));

  // Obejrzane = ocenione. Tego nie proponujemy „do obejrzenia razem".
  const ocenilJa = new Set(mojeOceny.map((r) => r.mediaId));
  const ocenilOn = new Set(jegoOceny.map((r) => r.mediaId));
  // Klucz zewnętrzny (rodzaj:externalId) — żeby świeży tytuł z API nie wrócił,
  // jeśli któreś z was ma go już w katalogu pod innym mediaId.
  const znaneZewnetrznie = new Set(
    [...mojeOceny, ...jegoOceny]
      .filter((r) => r.media.externalId)
      .map((r) => `${FRONT_KEY[r.media.type]}:${r.media.externalId}`),
  );

  const wynik = new Map<string, TogetherItem>();
  const dodaj = (m: MediaRow, reason: TogetherReason) => {
    if (!RAZEM_ENUM.has(m.type)) return; // książki/manga/muzyka — nie „razem"
    const type = FRONT_KEY[m.type] ?? m.type.toLowerCase();
    const klucz = `id:${m.id}`;
    if (wynik.has(klucz)) return;
    const you = scorerJa({ mediaId: m.id, type: m.type, year: m.year }).score;
    const them = scorerOn({ mediaId: m.id, type: m.type, year: m.year }).score;
    wynik.set(klucz, {
      mediaId: m.id,
      externalId: m.externalId,
      type,
      title: m.title,
      year: m.year,
      posterUrl: m.posterUrl,
      genres: m.genres,
      scoreYou: you,
      scoreThem: them,
      score: Math.min(you, them),
      reason,
    });
  };

  const mojeListaIds = new Set(mojaLista.map((w) => w.media.id));
  const jegoListaIds = new Set(jegoLista.map((w) => w.media.id));

  // 1) Oboje macie na liście.
  for (const w of mojaLista) {
    if (
      jegoListaIds.has(w.media.id) &&
      !ocenilJa.has(w.media.id) &&
      !ocenilOn.has(w.media.id)
    ) {
      dodaj(w.media, { kind: "bothWatchlist" });
    }
  }
  // 2) On ma na liście, Ty tego nie znasz (i odwrotnie).
  for (const w of jegoLista) {
    if (
      !mojeListaIds.has(w.media.id) &&
      !ocenilJa.has(w.media.id) &&
      !ocenilOn.has(w.media.id)
    ) {
      dodaj(w.media, { kind: "theirWatchlist" });
    }
  }
  for (const w of mojaLista) {
    if (
      !jegoListaIds.has(w.media.id) &&
      !ocenilJa.has(w.media.id) &&
      !ocenilOn.has(w.media.id)
    ) {
      dodaj(w.media, { kind: "yourWatchlist" });
    }
  }

  // 3) Świeże tytuły z zewnątrz — ta sama pula, co „Pod Twój gust" (z cache’u).
  //    Bierzemy pule OBOJGA i łączymy: pula jednej osoby jest skrzywiona w jej stronę,
  //    więc sam Twój zestaw dawałby „Twoje typy, które on ledwo toleruje".
  //    Punktujemy gustem obojga; te, których któreś już oceniło, odpadają.
  try {
    const [mojaPula, jegoPula] = await Promise.all([
      tasteDiscovery(userId),
      tasteDiscovery(otherId),
    ]);
    const swieze = [...mojaPula, ...jegoPula];
    for (const it of swieze) {
      if (!it.externalId) continue;
      if (!RAZEM_KLUCZE.has(it.type)) continue; // tylko film / anime / gry
      if (znaneZewnetrznie.has(`${it.type}:${it.externalId}`)) continue;
      const klucz = `ext:${it.type}:${it.externalId}`;
      if (wynik.has(klucz)) continue;

      const enumType = enumForKey(it.type);
      if (!enumType) continue;
      const you = scorerJa({ mediaId: 0, type: enumType, year: it.year }).score;
      const them = scorerOn({ mediaId: 0, type: enumType, year: it.year }).score;
      wynik.set(klucz, {
        mediaId: null,
        externalId: it.externalId,
        type: it.type,
        title: it.title,
        year: it.year,
        posterUrl: it.posterUrl,
        genres: it.genres,
        scoreYou: you,
        scoreThem: them,
        score: Math.min(you, them),
        reason: { kind: "fresh" },
      });
    }
  } catch (e) {
    // Zewnętrzne API bywa kapryśne — watchlisty i tak dadzą sensowną listę.
    console.error("together: discovery nie wyszlo:", (e as Error).message);
  }

  return [...wynik.values()]
    .sort(
      (a, b) =>
        PRIORITY[b.reason.kind] - PRIORITY[a.reason.kind] || // najpierw chęć obejrzenia
        b.score - a.score, // potem: obojgu spodoba się najbardziej
    )
    .slice(0, limit);
}
