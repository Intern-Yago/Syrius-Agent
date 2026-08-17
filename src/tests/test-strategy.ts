/**
 * @title Content Strategist
 * @description Testa a análise de histórico e o raciocínio editorial da IA (Gemini) para definição autônoma de tema e hook.
 * @category Estratégia
 */
import "dotenv/config";
import { prisma } from "../core/database.js";
import { decideNextContent } from "../services/content-strategist.js";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY não configurada."
    );
  }

  console.log(
    "🧠 Consultando histórico do Instagram..."
  );

  const recentPosts = await prisma.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,

    select: {
      id: true,
      topic: true,
      format: true,
      status: true,
      scheduledAt: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  const recentTopics = recentPosts.map(
    (post) => post.topic
  );

  const recentFormats = recentPosts.map(
    (post) => post.format
  );

  console.log("\n==============================");
  console.log("HISTÓRICO ENCONTRADO");
  console.log("==============================");

  if (recentPosts.length === 0) {
    console.log(
      "Nenhum post encontrado no banco."
    );
  } else {
    for (const post of recentPosts) {
      console.log(
        `• ${post.topic} | ${post.format} | ${post.status}`
      );
    }
  }

  console.log("\n🧠 Analisando qual conteúdo deve ser produzido...");

  const decision = await decideNextContent(apiKey, {
    recentTopics,
    recentFormats,
  });

  console.log("\n==============================");
  console.log("DECISÃO DO GESTOR");
  console.log("==============================");

  console.log(
    JSON.stringify(decision, null, 2)
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("\n❌ Erro:");
  console.error(error);

  await prisma.$disconnect();

  process.exit(1);
});