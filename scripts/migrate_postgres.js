import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Conectando ao PostgreSQL...");

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PostAnalyticsAudit" ADD COLUMN IF NOT EXISTS "repostsCount" INTEGER NOT NULL DEFAULT 0;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PostAnalyticsAudit" ADD COLUMN IF NOT EXISTS "trafficSources" JSONB;
  `);

  console.log("Tabelas e colunas atualizadas com sucesso no PostgreSQL!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Erro na migracao:", err);
  process.exit(1);
});
