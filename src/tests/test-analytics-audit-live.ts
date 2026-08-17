/**
 * @title Auditoria de Analytics Real & PostgreSQL
 * @description Executa a auditoria completa em 2 camadas com dados autênticos da Meta Graph API e persistência no banco.
 * @category Analytics & Métricas
 */

export const testInfo = {
  title: "Auditoria Real de Analytics & Meta Graph API",
  description: "Coleta métricas reais do Instagram, executa auditoria macro e micro post a post via Gemini, alimenta o RAG e salva o relatório no PostgreSQL.",
  category: "Analytics & Métricas",
};

import { runAnalyticsAudit, getAnalyticsHistory } from "../services/analytics-engine.js";

async function run() {
  console.log("1. Executando Auditoria Real conectada à Meta Graph API (7 dias)...");
  const res = await runAnalyticsAudit({ days: 7 });

  if (!res.success || !res.report) {
    throw new Error(res.error || "Falha ao executar auditoria de analytics");
  }

  console.log("\n2. Métricas Reais Consolidadas:");
  console.log(`- Período: ${res.report.periodLabel}`);
  console.log(`- Score Geral da Conta: ${res.report.score}/10`);
  console.log(`- Alcance Real: ${res.report.reachTotal} contas únicas`);
  console.log(`- Interações Reais: ${res.report.interactionsTotal}`);
  console.log(`- Salvamentos Reais: ${res.report.savesCount}`);
  console.log(`- Taxa de Engajamento Real: ${res.report.engagementRate}%`);

  console.log("\n3. Diagnóstico Micro Post a Post:");
  res.report.individualPostsBreakdown?.forEach((p, idx) => {
    console.log(`  [Post ${idx + 1}] "${p.postTopic}" (${p.postFormat}) - Nota: ${p.individualScore}`);
    console.log(`     Por que funcionou: ${p.whyItWorked}`);
    console.log(`     O que prejudicou: ${p.whatHurtIt}`);
  });

  console.log("\n4. Consultando histórico gravado no PostgreSQL...");
  const history = await getAnalyticsHistory();
  console.log(`- Relatórios gravados no PostgreSQL: ${history.length}`);

  console.log("\n✅ Auditoria Real de Analytics & PostgreSQL finalizada com SUCESSO!");
}

run().catch((err) => {
  console.error("❌ Falha na auditoria de analytics:", err);
  process.exit(1);
});
