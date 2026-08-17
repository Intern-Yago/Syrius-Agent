-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('APPROVED', 'NEEDS_REVISION');

-- CreateTable
CREATE TABLE "ContentReview" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "technicalAccuracy" DOUBLE PRECISION NOT NULL,
    "hookQuality" DOUBLE PRECISION NOT NULL,
    "structureQuality" DOUBLE PRECISION NOT NULL,
    "educationalValue" DOUBLE PRECISION NOT NULL,
    "engagementPotential" DOUBLE PRECISION NOT NULL,
    "visualConsistency" DOUBLE PRECISION NOT NULL,
    "strengths" JSONB NOT NULL,
    "problems" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentReview_postId_idx" ON "ContentReview"("postId");

-- CreateIndex
CREATE INDEX "ContentReview_status_idx" ON "ContentReview"("status");

-- CreateIndex
CREATE INDEX "ContentReview_createdAt_idx" ON "ContentReview"("createdAt");

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
