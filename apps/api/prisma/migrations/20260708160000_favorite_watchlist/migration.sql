-- AlterTable: ulubione (TOP 4)
ALTER TABLE "Review" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: lista do obejrzenia/zagrania
CREATE TABLE "WatchlistItem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WatchlistItem_userId_mediaId_key" ON "WatchlistItem"("userId", "mediaId");

ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
