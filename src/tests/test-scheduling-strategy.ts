/**
 * @title Estratégia de Horário de Publicação
 * @description Testa o cálculo autônomo do melhor horário e dia para publicação com base no público-alvo.
 * @category Agendamento & Postagem
 */

export const testInfo = {
  title: "Estratégia de Horário de Publicação",
  description: "Testa o cálculo autônomo do melhor horário e dia para publicação com base no público-alvo.",
  category: "Agendamento & Postagem",
};

import "dotenv/config";
import { prisma } from "../core/database.js";
import { decidePublicationTime } from "../services/scheduling-strategy.js";

async function main() {
  console.log("=================================");
  console.log("🧠 SCHEDULING STRATEGY");
  console.log("=================================\n");

  console.log("📚 Consultando post READY no PostgreSQL...");

  let post = await prisma.post.findFirst({
    where: { status: "READY" },
    orderBy: { createdAt: "desc" },
  });

  let createdTemp = false;

  if (!post) {
    console.log("Criando post temporário READY para teste da inteligência de agendamento...");
    post = await prisma.post.create({
      data: {
        topic: "Otimização de Índices B-Tree no PostgreSQL",
        format: "CAROUSEL",
        status: "READY",
        caption: "Aprenda a acelerar queries com índices no Postgres. #dev #database",
      },
    });
    createdTemp = true;
  }

  console.log(`📌 Post em teste: ${post.id} ("${post.topic}")`);

  console.log("\n🧠 Calculando melhor horário com a IA...");
  const decision = await decidePublicationTime(post.id);

  console.log("\n==============================");
  console.log("RESULTADO DA ESTRATÉGIA");
  console.log("==============================");
  console.log(`Data escolhida: ${decision.scheduledAt.toISOString()}`);
  console.log(`Motivo da IA: ${decision.reasoning}`);

  if (createdTemp) {
    await prisma.post.delete({ where: { id: post.id } });
    console.log("🧹 Post temporário de teste removido.");
  }

  console.log("\n✅ ESTRATÉGIA DE AGENDAMENTO CONCLUÍDA COM 100% DE SUCESSO!");
}

main()
  .catch((error) => {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });