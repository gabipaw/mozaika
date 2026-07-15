-- Czat: udostępnianie tytułu (mediaId), zdjęcia (imageUrl), edycja (editedAt), reakcje.
-- Zmiany ADDYTYWNE: nowe kolumny/tabela. text dostaje default '' (było NOT NULL bez default).
ALTER TABLE "Message" ALTER COLUMN "text" SET DEFAULT '';
ALTER TABLE "Message" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "mediaId" INTEGER;

CREATE INDEX "Message_mediaId_idx" ON "Message"("mediaId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_mediaId_fkey"
    FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MessageReaction" (
    "id" SERIAL NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageReaction_messageId_userId_key" ON "MessageReaction"("messageId", "userId");
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey"
    FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: publiczne API Supabase zablokowane (aplikacja łączy się rolą postgres = BYPASSRLS).
ALTER TABLE "MessageReaction" ENABLE ROW LEVEL SECURITY;
