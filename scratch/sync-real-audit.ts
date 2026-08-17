import { prisma } from "../src/core/database.js";
import { runAnalyticsAudit, getAnalyticsHistory } from "../src/services/analytics-engine.js";
import { getAllInsights } from "../src/services/embedding-service.js";

async function main() {
  console.log("1. Limpando dados antigos de teste no PostgreSQL...");
  await prisma.learningInsightEmbedding.deleteMany({});
  await prisma.postAnalyticsAudit.deleteMany({});
  await prisma.globalAnalyticsReport.deleteMany({});
  console.log("PostgreSQL limpo com sucesso!");

  console.log("\n2. Executando Auditoria Real conectada na Meta Graph API...");
  const res = await runAnalyticsAudit({ days: 7 });

  if (!res.success || !res.report) {
    console.error("Erro na auditoria:", res.error);
    return;
  }

  console.log("\n3. Resultados da Auditoria com Métricas 100% Reais:");
  console.log(`- Score Geral: ${res.report.score}/10`);
  console.log(`- Alcance Total Real: ${res.report.reachTotal} contas`);
  console.log(`- Interações Totais Reais: ${res.report.interactionsTotal}`);
  console.log(`- Salvamentos Reais: ${res.report.savesCount}`);
  console.log(`- Taxa de Engajamento Real: ${res.report.engagementRate}%`);

  console.log("\n4. Diagnósticos Micro Post a Post:");
  res.report.individualPostsBreakdown?.forEach((p, idx) => {
    console.log(`  [Post ${idx + 1}] "${p.postTopic}" (${p.postFormat}) - Nota: ${p.individualScore}`);
    console.log(`     Por que funcionou: ${p.whyItWorked}`);
    console.log(`     O que prejudicou: ${p.whatHurtIt}`);
  });

  console.log("\n5. Memória RAG no PostgreSQL:");
  const insights = await getAllInsights();
  insights.forEach((i, idx) => {
    console.log(`  [Card ${idx + 1}] ${i.title} (${i.status}) - Confiança: ${(i.confidenceScore * 100).toFixed(0)}% [${i.evidencePostsCount} posts analisados]`);
  });

  console.log("\n✅ Sincronização e Validação Real Concluída com Sucesso!");
}

main().catch(console.error);
