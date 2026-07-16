-- Powiadomienie o premierze nie ma sprawcy — wychodzi od systemu, nie od człowieka.
-- Dotąd każde powiadomienie wymagało `actorId` (follow/like/watchlist_rated zawsze
-- kogoś mają), więc kolumna była NOT NULL. Premiera się w to nie mieści.
--
-- Zmiana BEZPIECZNA: zdjęcie NOT NULL nie rusza istniejących wierszy ani FK —
-- wszystkie dotychczasowe powiadomienia mają actorId i zachowują się bez zmian.
ALTER TABLE "Notification" ALTER COLUMN "actorId" DROP NOT NULL;
