import { getAnalyticsHistory } from "../src/services/analytics-engine.js";
import { getAllInsights, recordInsight, searchRelevantInsights } from "../src/services/embedding-service.js";

async function main() {
  console.log("1. Verificando Histórico de Analytics...");
  const history = await getAnalyticsHistory();
  console.log(`- Relatórios encontrados: ${history.length}`);

  console.log("\n2. Testando Ingestão de Insight no RAG Vetorial com Gemini...");
  const insight = await recordInsight({
    type: "HOOK_PERFORMANCE",
    title: "Ganchos Diretos vs Perguntas Abertas",
    content: "Ganchos com 'Pare agora' ou 'Como reduzir X%' geram 3x mais retenção do que perguntas genéricas.",
    status: "VALIDATED",
    confidenceScore: 0.95,
  });
  console.log(`- Insight registrado com ID: ${insight.id}`);
  console.log(`- Dimensões do vetor de embedding: ${insight.embedding.length} dimensões`);

  console.log("\n3. Testando Busca Semântica por Similaridade no RAG...");
  const search = await searchRelevantInsights("como fazer um gancho de alto impacto para docker", 2);
  console.log(`- Insights ativos encontrados: ${search.activeInsights.length}`);
  search.activeInsights.forEach((i, idx) => {
    console.log(`  [${idx + 1}] ${i.title} (${i.status}) - Confiança: ${(i.confidenceScore * 100).toFixed(0)}%`);
  });

  console.log("\n✅ Teste do RAG Vetorial Concluído com Sucesso!");
}

main().catch(console.error);
