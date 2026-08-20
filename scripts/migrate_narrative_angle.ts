import { prisma } from "../src/core/database.js";

async function main() {
  console.log("Adicionando coluna narrativeAngle nas tabelas...");
  await prisma.$executeRawUnsafe(`ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "narrativeAngle" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "EditorialScheduleSlot" ADD COLUMN IF NOT EXISTS "narrativeAngle" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "PendingRecommendedTopic" ADD COLUMN IF NOT EXISTS "narrativeAngle" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "TrendingTopic" ADD COLUMN IF NOT EXISTS "narrativeAngle" TEXT;`);
  console.log("Migração de narrativeAngle concluída com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro na migração:", err);
  process.exit(1);
});
