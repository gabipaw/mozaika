-- Preferencje powiadomień: które typy użytkownik wyciszył.
-- Zmiana ADDYTYWNA: nowa kolumna z domyślną pustą tablicą (nikt nic nie wycisza).
-- RLS na User już włączone — nowa kolumna go dziedziczy, nic tu nie trzeba.
ALTER TABLE "User" ADD COLUMN "mutedNotifs" TEXT[] NOT NULL DEFAULT '{}';
