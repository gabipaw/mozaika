-- Blokowanie użytkowników + komentarze pod recenzjami.
-- Zmiana ADDYTYWNA: dwie nowe tabele, nic istniejącego nie ruszamy.

-- === Block: kto kogo zablokował ===
CREATE TABLE "Block" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockerId" INTEGER NOT NULL,
    "blockedId" INTEGER NOT NULL,
    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Block_blockerId_blockedId_key" ON "Block"("blockerId", "blockedId");
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey"
    FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedId_fkey"
    FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- === ReviewComment: komentarze pod recenzjami (parentId = odpowiedź) ===
CREATE TABLE "ReviewComment" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "parentId" INTEGER,
    CONSTRAINT "ReviewComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReviewComment_reviewId_idx" ON "ReviewComment"("reviewId");
CREATE INDEX "ReviewComment_parentId_idx" ON "ReviewComment"("parentId");
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "ReviewComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: publiczne API Supabase zablokowane (aplikacja łączy się rolą postgres = BYPASSRLS).
ALTER TABLE "Block" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReviewComment" ENABLE ROW LEVEL SECURITY;
