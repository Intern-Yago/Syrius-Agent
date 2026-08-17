import "dotenv/config";

import { prisma } from "./database";
import { buildImagePrompt } from "./image-prompt-builder";
import { generatePostImages } from "./image-generator";

export async function generatePostImagesFromDatabase(
  postId: string
) {
  console.log("=================================");
  console.log("🎨 IMAGE PIPELINE");
  console.log("=================================");

  const post = await prisma.post.findUnique({
    where: {
      id: postId,
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
      `Post ${postId} não encontrado no PostgreSQL.`
    );
  }

  if (post.slides.length === 0) {
    throw new Error(
      `O post ${postId} não possui slides.`
    );
  }

  console.log(`Post encontrado: ${post.topic}`);
  console.log(`Slides encontrados: ${post.slides.length}`);

  const generatedSlides = post.slides.map((slide) => ({
    number: slide.number,
    title: slide.title,
    text: slide.text,
    visualDirection: slide.visualDirection,
  }));

  const prompts = generatedSlides.map((slide) =>
    buildImagePrompt(
      slide,
      generatedSlides.length
    )
  );

  console.log("\n🎨 Prompts preparados.");
  console.log(`Total: ${prompts.length}`);

  /*
   * O image-generator atual recebe os slides
   * e gera as imagens através do Recraft.
   */
  const images = await generatePostImages(
    generatedSlides
  );

  if (!images || images.length === 0) {
    throw new Error(
      "Nenhuma imagem foi retornada pelo gerador."
    );
  }

  console.log(
    `\n✅ ${images.length} imagens geradas.`
  );

  for (let i = 0; i < images.length; i++) {
    const slide = post.slides[i];
    const image = images[i];

    if (!slide || !image) {
      continue;
    }

    await prisma.slide.update({
      where: {
        id: slide.id,
      },
      data: {
        imagePath: image,
      },
    });

    console.log(
      `💾 Slide ${slide.number} atualizado.`
    );
  }

  return prisma.post.findUnique({
    where: {
      id: postId,
    },
    include: {
      slides: {
        orderBy: {
          number: "asc",
        },
      },
    },
  });
}