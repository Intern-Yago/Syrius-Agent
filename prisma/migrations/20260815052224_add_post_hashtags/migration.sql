-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[];
