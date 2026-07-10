-- Dodaje gatunki do tytułu (do afinności gustu). Domyślnie pusta tablica.
ALTER TABLE "Media" ADD COLUMN "genres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
