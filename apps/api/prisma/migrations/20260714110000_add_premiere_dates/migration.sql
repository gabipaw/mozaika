-- Powiadomienia o premierach tytułów z watchlisty.
-- Data premiery tytułu (z TMDB/AniList/RAWG) + znacznik ostatniego sprawdzenia,
-- żeby nie pytać zewnętrznych API o to samo codziennie.
ALTER TABLE "Media" ADD COLUMN "releaseDate" TIMESTAMP(3);
ALTER TABLE "Media" ADD COLUMN "releaseCheckedAt" TIMESTAMP(3);

-- Czy push o premierze tego tytułu został już rozstrzygnięty (wysłany albo pominięty).
-- NULL = wciąż czekamy na premierę.
ALTER TABLE "WatchlistItem" ADD COLUMN "premiereNotifiedAt" TIMESTAMP(3);
