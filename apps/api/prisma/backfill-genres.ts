/**
 * Backfill gatunków dla tytułów już w katalogu (po migracji add_media_genres).
 * Dla każdego Media z pustymi `genres` woła właściwe źródło (TMDB/AniList/RAWG/iTunes),
 * które przy okazji zapisuje gatunki (upsert). Idempotentny — można puszczać wielokrotnie.
 *
 * Uruchom (z apps/api, z .env i kluczami API):  npm run db:backfill
 */
import { MediaType } from "@prisma/client";

import { prisma } from "../src/db.js";
import { addFromAniList } from "../src/logic/anilist.js";
import { addBookFromOpenLibrary } from "../src/logic/books.js";
import { addGameFromRawg } from "../src/logic/games.js";
import { addMusicFromItunes } from "../src/logic/music.js";
import { addMediaFromTmdb, addSerialFromTmdb } from "../src/logic/tmdb.js";

function refill(type: MediaType, externalId: string) {
  switch (type) {
    case MediaType.FILM:
      return addMediaFromTmdb(externalId);
    case MediaType.ANIME:
      return addFromAniList("ANIME", externalId);
    case MediaType.MANGA:
      return addFromAniList("MANGA", externalId);
    case MediaType.GRA:
      return addGameFromRawg(externalId);
    case MediaType.MUZYKA:
      return addMusicFromItunes(externalId);
    case MediaType.KSIAZKA:
      return addBookFromOpenLibrary(externalId);
    case MediaType.SERIAL:
      return addSerialFromTmdb(externalId);
    default:
      return null;
  }
}

async function main() {
  const rows = await prisma.media.findMany({
    where: { genres: { isEmpty: true }, externalId: { not: null } },
    select: { id: true, type: true, title: true, externalId: true },
  });
  console.log(`Do uzupełnienia: ${rows.length} tytułów.`);

  let ok = 0;
  let fail = 0;
  for (const m of rows) {
    try {
      const updated = await refill(m.type, m.externalId!);
      if (updated) {
        ok++;
        console.log(
          `✓ [${m.type}] ${m.title} → ${updated.genres.join(", ") || "(brak)"}`,
        );
      }
    } catch (e) {
      fail++;
      console.warn(`✗ [${m.type}] ${m.title}: ${(e as Error).message}`);
    }
    await new Promise((res) => setTimeout(res, 250)); // grzecznie wobec limitów API
  }
  console.log(`Gotowe. Uzupełniono ${ok}, błędów ${fail}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
