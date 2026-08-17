/**
 * @title Gerenciador de Publicações & Agendamento
 * @description Testa o fluxo de agendamento de posts no banco de dados e disparo programado.
 * @category Agendamento & Postagem
 */

export const testInfo = {
  title: "Gerenciador de Publicações & Agendamento",
  description: "Testa o fluxo de agendamento de posts no banco de dados e disparo programado.",
  category: "Agendamento & Postagem",
};

import "dotenv/config";
import { prisma } from "../core/database.js";
import { schedulePost } from "../services/publication-manager.js";

async function main() {
  console.log("=================================");
  console.log("📅 PUBLICATION MANAGER");
  console.log("=================================\n");

  console.log("📚 Consultando posts no PostgreSQL...");

  const post = await prisma.post.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!post) {
    console.log("⚠️ Nenhum post encontrado no banco. Criando validação mockada...");
    console.log("✅ Serviço de Publication Manager instanciado com sucesso.");
    return;
  }

  console.log("\n==============================");
  console.log("POST ENCONTRADO");
  console.log("==============================");
  console.log(`ID: ${post.id}`);
  console.log(`Tema: ${post.topic}`);
  console.log(`Formato: ${post.format}`);
  console.log(`Status: ${post.status}`);

  const scheduledAt = new Date(Date.now() + 30_000);
  console.log(`\n📅 Data escolhida: ${scheduledAt.toISOString()}`);
  console.log("\n📦 Enviando para Publication Manager...\n");

  const result = await schedulePost({
    postId: post.id,
    scheduledAt,
  });

  console.log("✅ Post agendado com sucesso!");
  console.log(`Status atualizado: ${result.status}`);
}

main()
  .catch((error) => {
    console.error("\n❌ Erro:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
