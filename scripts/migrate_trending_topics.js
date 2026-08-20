import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Executando migracao no PostgreSQL...");

  // 1. Atualizar EditorialScheduleSlot
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "EditorialScheduleSlot" ADD COLUMN IF NOT EXISTS "isStorySlot" BOOLEAN NOT NULL DEFAULT false;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "EditorialScheduleSlot" ADD COLUMN IF NOT EXISTS "interactiveStoryType" TEXT;
  `);

  // 2. Criar tabela TrendingTopic
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TrendingTopic" (
      "id" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "summary" TEXT NOT NULL,
      "whyTrending" TEXT NOT NULL,
      "suggestedAngle" TEXT NOT NULL,
      "suggestedFormat" TEXT NOT NULL,
      "hookIdea" TEXT NOT NULL,
      "baseCopyPrompt" TEXT,
      "baseVisualPrompt" TEXT,
      "sourceLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "relevanceScore" INTEGER NOT NULL DEFAULT 90,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "generatedPostId" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "TrendingTopic_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrendingTopic_status_idx" ON "TrendingTopic"("status");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrendingTopic_category_idx" ON "TrendingTopic"("category");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrendingTopic_expiresAt_idx" ON "TrendingTopic"("expiresAt");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TrendingTopic_relevanceScore_idx" ON "TrendingTopic"("relevanceScore");
  `);

  console.log("Migracao de TrendingTopic e EditorialScheduleSlot executada com sucesso!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Erro na migracao:", err);
  process.exit(1);
});
