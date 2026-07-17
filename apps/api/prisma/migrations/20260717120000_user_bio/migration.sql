-- Krótkie „o mnie" na profilu użytkownika.
-- Zmiana ADDYTYWNA: kolumna NULL-owalna, bez domyślnej wartości — istniejące konta
-- po prostu nie mają bio i nic się dla nich nie zmienia.
-- RLS na User już włączone — nowa kolumna go dziedziczy, nic tu nie trzeba.
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
