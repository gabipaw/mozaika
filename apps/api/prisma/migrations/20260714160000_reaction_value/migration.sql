-- Kciuk w dół obok serca: reakcja dostaje wartość (1 = serce, -1 = kciuk w dół).
-- Zmiana ADDYTYWNA: nowa kolumna z DEFAULT 1, więc istniejące wiersze (same polubienia)
-- automatycznie stają się sercami. Nazwa tabeli zostaje — model w Prismie mapuje się
-- na nią przez @@map, a zmiana nazwy dałaby tylko okno błędów w trakcie deployu.
ALTER TABLE "ReviewLike" ADD COLUMN "value" INTEGER NOT NULL DEFAULT 1;
