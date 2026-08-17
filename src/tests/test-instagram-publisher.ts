/**
 * @title Instagram Meta Publisher
 * @description Testa o motor de publicação oficial da Meta Graph API para Carrossel, Post Solo e Story Foto com imagens no Cloudflare R2.
 * @category Instagram
 */
import "dotenv/config";
import { prisma } from "../core/database.js";
import { publishPost } from "../integrations/instagram/publisher.js";

async function main() {
  console.log("=========================================");
  console.log("🚀 TESTE DE PUBLICAÇÃO NO INSTAGRAM");
  console.log("=========================================\n");

  const post = await prisma.post.findFirst({
    where: {
      status: { in: ["READY", "APPROVED", "DRAFT"] },
    },
    orderBy: { createdAt: "desc" },
    include: { slides: true },
  });

  if (!post) {
    console.log("⚠️ Nenhum post encontrado com imagens para teste de publicação.");
    console.log("Gere um post primeiro através do Dashboard ou test-multiformat-generation.ts.");
    return;
  }

  console.log(`📌 Post selecionado para teste de publicação:`);
  console.log(`   - ID: ${post.id}`);
  console.log(`   - Tema: "${post.topic}"`);
  console.log(`   - Formato: ${post.format}`);
  console.log(`   - Slides: ${post.slides.length}`);

  const hasImages = post.slides.some((s) => s.imagePath);
  if (!hasImages) {
    console.log("⚠️ Os slides deste post ainda não possuem imagens no Cloudflare R2.");
    return;
  }

  console.log(`\n📤 Disparando publicação na Meta API (@syrius_tech)...`);
  const result = await publishPost(post.id);

  console.log(`\n=========================================`);
  console.log(`✅ PUBLICAÇÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`   - Media ID no Instagram: ${result.publishedMediaId}`);
  console.log(`=========================================`);
}

main().catch((err) => {
  console.error("\n❌ ERRO NO TESTE DE PUBLICAÇÃO:", err.message);
  process.exit(1);
});
