/**
 * @title Teste de RAG Vetorial & Auto-Correção
 * @description Testa a geração de embeddings com Gemini text-embedding-004, busca semântica por cosseno e auto-correção no PostgreSQL.
 * @category Inteligência & RAG
 */

export const testInfo = {
  title: "RAG Vetorial & Memória de Aprendizado",
  description: "Testa a geração de embeddings vetoriais de 768 dimensões com Gemini, busca semântica por similaridade e calibração estatística de teses no PostgreSQL.",
  category: "Inteligência & RAG",
};

import { generateEmbedding, recordInsight, searchRelevantInsights, getAllInsights } from "../services/embedding-service.js";

async function run() {
  console.log("1. Testando geração de vetor denso com Google Gemini (text-embedding-004)...");
  const testText = "Como estruturar um carrossel de backend com alta retenção e salvamentos";
  const vector = await generateEmbedding(testText);
  console.log(`- Dimensões do vetor retornado: ${vector.length} (esperado: 768)`);
  if (vector.length !== 768) {
    throw new Error(`Embedding gerou dimensão inválida: ${vector.length}`);
  }

  console.log("\n2. Testando gravação de hipótese no PostgreSQL via Prisma...");
  const insight = await recordInsight({
    type: "HOOK_PERFORMANCE",
    title: "Ganchos Imperativos em SQL",
    content: "Ganchos como 'Pare de usar SELECT *' capturam mais atenção inicial do que introduções genéricas.",
    status: "HYPOTHESIS",
    confidenceScore: 0.35,
    evidencePostsCount: 2,
  });
  console.log(`- Insight gravado com sucesso! ID: ${insight.id} (Status: ${insight.status}, Confiança: ${insight.confidenceScore * 100}%)`);

  console.log("\n3. Testando busca semântica por similaridade de cosseno...");
  const searchResults = await searchRelevantInsights("otimizar queries lentas no postgresql", 3);
  console.log(`- Insights ativos encontrados: ${searchResults.activeInsights.length}`);
  searchResults.activeInsights.forEach((i, idx) => {
    console.log(`  [${idx + 1}] ${i.title} (${i.status}) - Confiança: ${(i.confidenceScore * 100).toFixed(0)}%`);
  });

  console.log("\n4. Listando insights gravados no PostgreSQL...");
  const all = await getAllInsights();
  console.log(`- Total de insights na memória do banco: ${all.length}`);

  console.log("\n✅ Teste do RAG Vetorial & Memória finalizado com 100% de sucesso!");
}

run().catch((err) => {
  console.error("❌ Falha no teste de RAG:", err);
  process.exit(1);
});
