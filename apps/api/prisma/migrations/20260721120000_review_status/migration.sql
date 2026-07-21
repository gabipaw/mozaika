-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'DONE';
