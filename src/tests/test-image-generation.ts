/**
 * @title Cloudflare Recraft AI + Sharp
 * @description Testa a geração de imagens dos slides com Recraft v4 via Cloudflare AI Gateway e redimensionamento 1080x1350 com Sharp.
 * @category Imagens & Visual
 */
import "dotenv/config";
import { prisma } from "../core/database.js";
import { generatePostImages } from "../services/image-generator.js";

async function main() {
  console.log("=================================");
  console.log("🎨 IMAGE GENERATION TEST");
  console.log("=================================\n");

  console.log(
    "📚 Consultando último post no PostgreSQL..."
  );

  const post = await prisma.post.findFirst({
    where: {
      status: "GENERATED",
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

  if (!post) {
    throw new Error(
      "Nenhum post GENERATED encontrado no PostgreSQL."
    );
  }

  console.log("\n==============================");
  console.log("POST ENCONTRADO");
  console.log("==============================");

  console.log(`ID: ${post.id}`);
  console.log(`Tema: ${post.topic}`);
  console.log(`Formato: ${post.format}`);
  console.log(`Status: ${post.status}`);
  console.log(`Slides: ${post.slides.length}`);

  console.log(
    "\n🎨 Iniciando geração das imagens...\n"
  );

  const images = await generatePostImages(
    "",

    {
      format: post.format,

      topic: post.topic,

      slides: post.slides.map(
        (slide) => ({
          number: slide.number,
          title: slide.title,
          text: slide.text,
          visualDirection:
            slide.visualDirection,
        })
      ),
    }
  );

  console.log("\n==============================");
  console.log("RESULTADO DA GERAÇÃO");
  console.log("==============================");

  console.log(
    `Imagens geradas: ${images.length}/${post.slides.length}`
  );

  if (images.length === 0) {
    console.log(
      "❌ Nenhuma imagem foi gerada."
    );

    return;
  }

  for (const image of images) {
    console.log(
      `\n🖼️ Slide ${image.slideNumber}`
    );

    console.log(
      `Arquivo: ${image.imagePath}`
    );
  }

  /*
   * =========================================================
   * SALVAR IMAGENS NO POSTGRESQL
   * =========================================================
   *
   * Cada imagem é associada ao seu respectivo Slide.
   *
   * Nosso schema possui:
   *
   * @@unique([postId, number])
   *
   * Portanto podemos localizar um slide usando:
   *
   * postId + number
   */

  console.log(
    "\n💾 Salvando caminhos das imagens no PostgreSQL...\n"
  );

  for (const image of images) {
    await prisma.slide.update({
      where: {
        postId_number: {
          postId: post.id,
          number: image.slideNumber,
        },
      },

      data: {
        imagePath: image.imagePath,
      },
    });

    console.log(
      `✅ Slide ${image.slideNumber} atualizado`
    );

    console.log(
      `   ${image.imagePath}`
    );
  }

  /*
   * =========================================================
   * VERIFICAR O POST DEPOIS DA ATUALIZAÇÃO
   * =========================================================
   */

  console.log(
    "\n=============================="
  );

  console.log(
    "BANCO DE DADOS ATUALIZADO"
  );

  console.log(
    "==============================\n"
  );

  const updatedPost =
    await prisma.post.findUnique({
      where: {
        id: post.id,
      },

      include: {
        slides: {
          orderBy: {
            number: "asc",
          },
        },
      },
    });

  if (!updatedPost) {
    throw new Error(
      "Não foi possível recuperar o post atualizado."
    );
  }

  for (const slide of updatedPost.slides) {
    console.log(
      `Slide ${slide.number}:`
    );

    console.log(
      `  ${slide.imagePath ?? "SEM IMAGEM"}`
    );
  }

  /*
   * =========================================================
   * RESUMO
   * =========================================================
   */

  const slidesWithImages =
    updatedPost.slides.filter(
      (slide) =>
        Boolean(slide.imagePath)
    ).length;

  console.log(
    "\n=============================="
  );

  console.log(
    "✅ PIPELINE DE IMAGEM CONCLUÍDO"
  );

  console.log(
    "=============================="
  );

  console.log(
    `Slides com imagem: ${slidesWithImages}/${updatedPost.slides.length}`
  );

  console.log(
    `Post: ${updatedPost.id}`
  );

  console.log(
    "\nAs imagens agora estão vinculadas aos slides no PostgreSQL."
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
