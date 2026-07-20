-- Tokeny do odzyskiwania hasła („nie pamiętam hasła").
-- Zmiana ADDYTYWNA: nowa tabela, żadna istniejąca nie jest ruszana.
--
-- `tokenHash` trzyma SHA-256 tokenu z linku, nie sam token — wyciek bazy nie daje
-- wtedy możliwości przejęcia konta. UNIQUE, bo po hashu szukamy przy resecie.
-- `usedAt` NULL = token jeszcze nieużyty; ustawienie daty go zużywa (działa raz).
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- Skasowanie konta kasuje jego tokeny (nie ma po co trzymać sierot).
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS jak na każdej innej tabeli: Supabase wystawia publiczne Data API, a ta tabela
-- jest wyjątkowo wrażliwa (kto ma token, ten przejmuje konto). Bez polityk rola
-- `anon` nie widzi nic; Prisma łączy się rolą z BYPASSRLS, więc aplikacja działa.
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
