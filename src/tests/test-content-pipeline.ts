/**
 * @title Pipeline End-to-End Test
 * @description Executa a sequência completa de criação, redação, persistência e validação editorial.
 * @category Pipeline
 */
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

  console.log("=================================");
  console.log("🧠 SOCIAL MEDIA AGENT");
  console.log("=================================\n");

  // ==========================================
  // 1. BUSCAR HISTÓRICO
  // ==========================================

  console.log("📚 Consultando histórico...");

  const recentPosts = await prisma.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    select: {
      topic: true,
      format: true,
    },
  });

  const recentTopics = recentPosts.map(
    (post) => post.topic
  );

  const recentFormats = recentPosts.map(
    (post) => post.format
  );

  console.log(
    `Encontrados ${recentPosts.length} posts no histórico.`
  );

  // ==========================================
  // 2. ESTRATEGISTA
  // ==========================================

  console.log("\n🧠 Analisando próxima publicação...\n");

  const decision = await decideNextContent(
    apiKey,
    {
      recentTopics,
      recentFormats,
    }
  );

  console.log("==============================");
  console.log("DECISÃO DO GESTOR");
  console.log("==============================");

  console.log(
    JSON.stringify(
      decision,
      null,
      2
    )
  );

  // ==========================================
  // 3. GERADOR DE CONTEÚDO
  // ==========================================

  console.log("\n✍️ Gerando conteúdo...\n");

  const content = await generatePostContent(
    apiKey,
    decision
  );

  console.log("==============================");
  console.log("CONTEÚDO GERADO");
  console.log("==============================");

  console.log(
    JSON.stringify(
      content,
      null,
      2
    )
  );

  // ==========================================
  // 4. SALVAR NO BANCO
  // ==========================================

  console.log("\n💾 Salvando no PostgreSQL...\n");

  const post = await saveGeneratedPost(
    decision,
    content
  );

  console.log("==============================");
  console.log("POST SALVO");
  console.log("==============================");

  console.log(`ID: ${post.id}`);
  console.log(`Tema: ${post.topic}`);
  console.log(`Formato: ${post.format}`);
  console.log(`Status: ${post.status}`);
  console.log(`Slides: ${post.slides.length}`);

  console.log("\n==============================");
  console.log("SLIDES");
  console.log("==============================");

  for (const slide of post.slides) {
    console.log(
      `\n${slide.number}. ${slide.title}`
    );

    console.log(slide.text);
  }

  console.log("\n");
  console.log("✅ Pipeline executado com sucesso!");
}

main()
  .catch(async (error) => {
    console.error("\n❌ Erro no pipeline:");
    console.error(error);

    await prisma.$disconnect();

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });