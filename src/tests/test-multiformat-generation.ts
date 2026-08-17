/**
 * @title Multi-Format Content Generation
 * @description Testa a inteligência de geração dos 3 formatos editoriais (Carrossel 6 slides, Post Solo 1 arte e Roteiro de Reels).
 * @category Multi-Formatos
 */
import "dotenv/config";
import { executeStructuredPrompt } from "../core/gemini.js";
import { buildContentGeneratorPrompt } from "../prompts/content.prompt.js";
import { GeneratedContentData } from "../pipeline/types.js";

async function main() {
  console.log("=========================================");
  console.log("🎭 TESTE DE GERAÇÃO MULTI-FORMATO");
  console.log("=========================================\n");

  // 1. Teste de Post Solo (SINGLE_IMAGE)
  console.log("📸 [1/3] Testando geração de POST SOLO (SINGLE_IMAGE)...");
  const singleImagePrompt = buildContentGeneratorPrompt({
    format: "SINGLE_IMAGE",
    topic: "Docker Multi-stage Builds em Produção",
    objective: "AUTHORITY",
    hook: "Como reduzi uma imagem Docker de 1.2GB para 48MB",
    reasoning: "Dica visual direta com alto valor prático para compartilhamentos.",
  });

  const singleResult = await executeStructuredPrompt<GeneratedContentData>(singleImagePrompt);
  console.log(`✅ Post Solo gerado:`);
  console.log(`   - Formato: ${singleResult.format}`);
  console.log(`   - Slides/Artes: ${singleResult.slides.length}`);
  console.log(`   - Título da Arte: "${singleResult.slides[0]?.title}"`);
  console.log(`   - Hashtags: ${singleResult.hashtags?.join(" ")}`);

  // 2. Teste de Roteiro de Reels (REEL_SCRIPT)
  console.log("\n🎬 [2/3] Testando geração de ROTEIRO DE REELS (REEL_SCRIPT)...");
  const reelsPrompt = buildContentGeneratorPrompt({
    format: "REEL_SCRIPT",
    topic: "3 Erros Críticos com Async/Await no Node.js",
    objective: "VIRALITY",
    hook: "Você provavelmente está travando o Event Loop do seu Node.js sem saber!",
    reasoning: "Gancho forte para público dev de topo de funil.",
  });

  const reelsResult = await executeStructuredPrompt<GeneratedContentData>(reelsPrompt);
  console.log(`✅ Roteiro de Reels gerado:`);
  console.log(`   - Formato: ${reelsResult.format}`);
  console.log(`   - Cenas estruturadas: ${reelsResult.slides.length}`);
  reelsResult.slides.forEach((s) => {
    console.log(`     * ${s.title}: "${s.text.slice(0, 60)}..."`);
  });

  // 3. Teste de Carrossel (CAROUSEL)
  console.log("\n📚 [3/3] Testando geração de CARROSSEL (CAROUSEL)...");
  const carouselPrompt = buildContentGeneratorPrompt({
    format: "CAROUSEL",
    topic: "Guia Definitivo de Indexação no PostgreSQL",
    objective: "EDUCATION",
    hook: "Como índices B-Tree e GIN aceleram suas queries em 100x",
    reasoning: "Guia profundo focado em retenção e salvamentos.",
  });

  const carouselResult = await executeStructuredPrompt<GeneratedContentData>(carouselPrompt);
  console.log(`✅ Carrossel gerado:`);
  console.log(`   - Formato: ${carouselResult.format}`);
  console.log(`   - Slides: ${carouselResult.slides.length}/6`);
  console.log(`   - Legenda: "${carouselResult.caption.slice(0, 80)}..."`);

  console.log("\n=========================================");
  console.log("✅ TESTE MULTI-FORMATO CONCLUÍDO COM SUCESSO!");
  console.log("=========================================");
}

main().catch((err) => {
  console.error("\n❌ ERRO NO TESTE MULTI-FORMATO:", err);
  process.exit(1);
});
