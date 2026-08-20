/**
 * @title Persistência de Posts no PostgreSQL
 * @description Testa a geração e gravação de um post completo e seus slides no banco de dados via Prisma.
 * @category Pipeline
 */

export const testInfo = {
  title: "Persistência de Posts no PostgreSQL",
  description: "Testa a geração e gravação de um post completo e seus slides no banco de dados via Prisma.",
  category: "Pipeline",
};

import "dotenv/config";
import { decideNextContent } from "../services/content-strategist.js";
import { generatePostContent } from "../services/content-generator.js";
import { saveGeneratedPost } from "../services/post-repository.js";
import { prisma } from "../core/database.js";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  console.log("🧠 Consultando histórico...");
  const recentPosts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { topic: true, format: true },
  });

  const recentTopics = recentPosts.map((post) => post.topic);
  const recentFormats = recentPosts.map((post) => post.format);

  console.log(`📚 ${recentPosts.length} posts encontrados no banco.`);
  console.log("\n🧠 Analisando estratégia...");

  const decision = await decideNextContent(apiKey, {
    recentTopics,
    recentFormats,
  });

  console.log("\n==============================");
  console.log("DECISÃO");
  console.log("==============================");
  console.log(JSON.stringify(decision, null, 2));

  console.log("\n✍️ Gerando conteúdo...");
  const content = await generatePostContent(apiKey, decision);

  console.log("\n💾 Salvando post no PostgreSQL...");
  const saved = await saveGeneratedPost(decision, content);

  console.log(`\n✅ Post salvo com SUCESSO! ID: ${saved.id}`);
  console.log(`- Slides inseridos: ${saved.slides?.length || 0}`);
}

main()
  .catch((error) => {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });