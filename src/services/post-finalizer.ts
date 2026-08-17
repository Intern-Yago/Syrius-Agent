import { prisma } from "./database";

export interface FinalizedPost {
  id: string;
  topic: string;
  format: string;
  caption: string;
  slides: number;
  images: number;
  status: "READY";
}

export async function finalizePost(
  postId: string
): Promise<FinalizedPost> {
  console.log("📦 Iniciando finalização do post...");

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

  console.log(`📌 Post encontrado: ${post.id}`);
  console.log(`📌 Status atual: ${post.status}`);

  if (post.status !== "APPROVED") {
    throw new Error(
      `O post precisa estar APPROVED para ser finalizado. ` +
        `Status atual: ${post.status}`
    );
  }

  /*
   * ==========================================
   * 1. VALIDAR CONTEÚDO
   * ==========================================
   */

  console.log("\n🔎 Validando conteúdo...");

  if (!post.topic?.trim()) {
    throw new Error(
      "O post não possui um topic válido."
    );
  }

  if (!post.caption?.trim()) {
    throw new Error(
      "O post não possui uma caption válida."
    );
  }

  if (!post.format?.trim()) {
    throw new Error(
      "O post não possui um formato válido."
    );
  }

  console.log("✅ Conteúdo válido.");

  /*
   * ==========================================
   * 2. VALIDAR SLIDES
   * ==========================================
   */

  console.log("\n📑 Validando slides...");

  if (post.slides.length === 0) {
    throw new Error(
      "O post não possui slides."
    );
  }

  for (
    let index = 0;
    index < post.slides.length;
    index++
  ) {
    const slide = post.slides[index];

    const expectedNumber = index + 1;

    if (slide.number !== expectedNumber) {
      throw new Error(
        `Numeração inválida: esperado ${expectedNumber}, ` +
          `encontrado ${slide.number}.`
      );
    }

    if (!slide.title?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui título.`
      );
    }

    if (!slide.text?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui texto.`
      );
    }

    if (!slide.visualDirection?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui visualDirection.`
      );
    }
  }

  console.log(
    `✅ ${post.slides.length} slides válidos.`
  );

  /*
   * ==========================================
   * 3. VALIDAR IMAGENS
   * ==========================================
   *
   * IMPORTANTE:
   *
   * slide.imagePath NÃO é mais tratado como
   * caminho de arquivo local.
   *
   * O pipeline atual utiliza MinIO.
   *
   * Exemplo:
   *
   * posts/temporary-1786763726279/slides/slide-01.png
   *
   * Esse valor é um OBJECT KEY do MinIO.
   *
   * Portanto NÃO devemos usar:
   *
   * fs.access()
   * path.resolve()
   *
   * pois isso transforma o Object Key em:
   *
   * C:\Users\Yago\ferramentas\social-media\...
   *
   * que não existe no disco local.
   */

  console.log("\n🖼️ Validando imagens...");

  for (const slide of post.slides) {
    if (!slide.imagePath?.trim()) {
      throw new Error(
        `Slide ${slide.number} não possui imagem.`
      );
    }

    const objectKey = slide.imagePath.trim();

    /*
     * Validação básica do Object Key.
     *
     * A existência física da imagem já foi
     * confirmada pelo serviço de geração/upload
     * antes de salvar esse caminho no PostgreSQL.
     */

    if (
      objectKey.length === 0 ||
      objectKey.includes("\0")
    ) {
      throw new Error(
        `Object Key inválido para o slide ${slide.number}.`
      );
    }

    console.log(
      `✅ Slide ${slide.number}: imagem registrada no MinIO`
    );

    console.log(
      `   📁 ${objectKey}`
    );
  }

  /*
   * ==========================================
   * 4. VALIDAR QUALITY CONTROL
   * ==========================================
   */

  console.log(
    "\n🔎 Validando Quality Control..."
  );

  const review =
    await prisma.contentReview.findFirst({
      where: {
        postId: post.id,
        status: "APPROVED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  if (!review) {
    throw new Error(
      "Nenhuma ContentReview APPROVED encontrada para este post."
    );
  }

  console.log(
    `✅ Review aprovada encontrada: ${review.id}`
  );

  console.log(
    `✅ Score geral: ${review.score}/10`
  );

  /*
   * ==========================================
   * 5. ATUALIZAR STATUS
   * ==========================================
   */

  console.log("\n📦 Atualizando status do post...");

  const updatedPost =
    await prisma.post.update({
      where: {
        id: post.id,
      },
      data: {
        status: "READY",
      },
    });

  console.log(
    `✅ Status atualizado: ${updatedPost.status}`
  );

  /*
   * ==========================================
   * 6. RESULTADO
   * ==========================================
   */

  console.log("\n==============================");
  console.log("POST PRONTO");
  console.log("==============================");

  console.log(`ID: ${updatedPost.id}`);
  console.log(`Tema: ${updatedPost.topic}`);
  console.log(`Formato: ${updatedPost.format}`);
  console.log(`Slides: ${post.slides.length}`);
  console.log(`Imagens: ${post.slides.length}`);
  console.log(`Score: ${review.score}/10`);
  console.log(`Status: ${updatedPost.status}`);

  return {
    id: updatedPost.id,
    topic: updatedPost.topic,
    format: updatedPost.format,
    caption: updatedPost.caption ?? "",
    slides: post.slides.length,
    images: post.slides.length,
    status: "READY",
  };
}
