/**
 * @title Post Finalizer
 * @description Valida os requisitos de integridade do post (status APPROVED, 6 slides com artes) e finaliza como READY.
 * @category Pipeline
 */
import "dotenv/config";
import { prisma } from "../core/database.js";
import { finalizePost } from "../services/post-finalizer.js";

async function main() {
  console.log("=================================");
  console.log("📦 POST FINALIZER");
  console.log("=================================\n");

  console.log(
    "📚 Consultando último post APPROVED..."
  );

  const post = await prisma.post.findFirst({
    where: {
      status: "APPROVED",
      format: "CAROUSEL",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!post) {
    throw new Error(
      "Nenhum post APPROVED encontrado no PostgreSQL."
    );
  }

  console.log("\n==============================");
  console.log("POST ENCONTRADO");
  console.log("==============================");

  console.log(`ID: ${post.id}`);
  console.log(`Tema: ${post.topic}`);
  console.log(`Formato: ${post.format}`);
  console.log(`Status: ${post.status}`);

  console.log(
    "\n🔎 Validando e finalizando...\n"
  );

  const result = await finalizePost(
    post.id
  );

  /*
   * Confirmação final diretamente no banco.
   */

  const savedPost =
    await prisma.post.findUnique({
      where: {
        id: post.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

  console.log("\n==============================");
  console.log("RESULTADO FINAL");
  console.log("==============================");

  console.log(`ID: ${result.id}`);
  console.log(`Tema: ${result.topic}`);
  console.log(`Formato: ${result.format}`);
  console.log(`Slides: ${result.slides}`);
  console.log(`Imagens: ${result.images}`);
  console.log(`Status retornado: ${result.status}`);
  console.log(
    `Status no PostgreSQL: ${savedPost?.status}`
  );

  if (savedPost?.status !== "READY") {
    throw new Error(
      "O post não foi persistido como READY no PostgreSQL."
    );
  }

  console.log(
    "\n✅ POST FINALIZADO E PERSISTIDO COM SUCESSO!"
  );
}

main()
  .catch((error) => {
    console.error("\n❌ Erro:");
    console.error(error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
