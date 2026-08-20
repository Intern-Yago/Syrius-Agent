/**
 * @title Quality Control (QC Reviewer)
 * @description Audita criticamente o conteúdo gerado (precisão técnica, hook, engajamento e pontuação mínima 8.5/10).
 * @category Quality Control
 */

export const testInfo = {
  title: "Quality Control (QC Reviewer)",
  description: "Audita criticamente o conteúdo gerado (precisão técnica, hook, engajamento e pontuação mínima 8.5/10).",
  category: "Quality Control",
};

import "dotenv/config";
import { prisma } from "../core/database.js";
import { reviewPostContent } from "../services/content-reviewer.js";
import { saveContentReview, updatePostReviewStatus } from "../services/review-storage.js";

async function main() {
  console.log("=================================");
  console.log("🔎 CONTENT QUALITY CONTROL");
  console.log("=================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }

  console.log("📚 Consultando último post gerado...");
  const post = await prisma.post.findFirst({
    where: {
      format: "CAROUSEL",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      slides: {
        orderBy: {
          number: "asc",
        },
      },
    },
  });

  if (!post || !post.slides || post.slides.length === 0) {
    console.log("⚠️ Nenhum post com slides encontrado no banco para auditar.");
    console.log("Simulando auditoria de QC com dados sintéticos...");
    
    const mockSlides = [
      { number: 1, title: "Docker Multi-stage Builds", text: "Como reduzir imagens Docker em 80%", visualDirection: "Terminal escuro" },
      { number: 2, title: "O Problema", text: "Imagens pesadas atrasam deploy e aumentam custos", visualDirection: "Gráfico de lentidão" },
    ];
    
    const reviewResult = await reviewPostContent(apiKey, {
      id: "sim-post-1",
      topic: "Docker Multi-stage Builds",
      caption: "Aprenda a otimizar seus containers com Docker multi-stage builds. #dev #docker",
      slides: mockSlides as any,
    } as any);

    console.log("\n==============================");
    console.log("RESULTADO DO QC (SIMULADO)");
    console.log("==============================");
    console.log(`Status: ${reviewResult.status}`);
    console.log(`Score Técnico: ${reviewResult.technicalAccuracy}/10`);
    console.log(`Score Engajamento: ${reviewResult.engagementPotential}/10`);
    console.log(`Score Final: ${reviewResult.score}/10`);
    console.log(`Aprovado: ${reviewResult.status === "APPROVED" ? "SIM ✅" : "NÃO ❌"}`);
    console.log(`Resumo: ${reviewResult.summary}`);
    console.log("\n✅ Teste de Quality Control concluído com sucesso!");
    return;
  }

  console.log(`ID: ${post.id}`);
  console.log(`Tema: ${post.topic}`);
  console.log(`Slides: ${post.slides.length}`);

  const reviewResult = await reviewPostContent(apiKey, post as any);

  console.log("\n==============================");
  console.log("RESULTADO DO QC");
  console.log("==============================");
  console.log(`Status: ${reviewResult.status}`);
  console.log(`Score Técnico: ${reviewResult.technicalAccuracy}/10`);
  console.log(`Score Engajamento: ${reviewResult.engagementPotential}/10`);
  console.log(`Score Final: ${reviewResult.score}/10`);
  console.log(`Aprovado: ${reviewResult.status === "APPROVED" ? "SIM ✅" : "NÃO ❌"}`);
  console.log(`Resumo: ${reviewResult.summary}`);

  console.log("\n✅ Teste de Quality Control finalizado com sucesso!");
}

main()
  .catch((error) => {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
