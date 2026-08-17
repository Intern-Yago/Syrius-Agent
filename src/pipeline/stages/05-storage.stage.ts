import { PipelineContext, PipelineStageHandler } from "../types.js";
import { prisma } from "../../core/database.js";
import { uploadImageBuffer } from "../../core/storage.js";

export const storageStage: PipelineStageHandler = {
  id: "storage",
  name: "Armazenamento MinIO",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (!ctx.postId) {
      throw new Error("ID da publicação não encontrado para vincular as imagens no storage.");
    }

    if (!ctx.imageBuffers || ctx.imageBuffers.size === 0) {
      throw new Error("Nenhum buffer de imagem disponível para upload.");
    }

    log(`Iniciando upload de ${ctx.imageBuffers.size} imagens no MinIO Object Storage...`);

    const post = await prisma.post.findUnique({
      where: { id: ctx.postId },
      include: { slides: { orderBy: { number: "asc" } } },
    });

    if (!post) {
      throw new Error(`Post ID ${ctx.postId} não encontrado no banco de dados.`);
    }

    for (const slide of post.slides) {
      const buffer = ctx.imageBuffers.get(slide.number);
      if (!buffer) {
        throw new Error(`Buffer da imagem do slide ${slide.number} não encontrado.`);
      }

      const objectKey = `posts/${post.id}/slide-${slide.number}.png`;
      await uploadImageBuffer(buffer, objectKey, "image/png");

      await prisma.slide.update({
        where: { id: slide.id },
        data: { imagePath: objectKey },
      });

      log(`Slide ${slide.number} salvo no MinIO: "${objectKey}".`);
    }

    log(`Upload concluído com sucesso. Todos os caminhos de imagens foram salvos no PostgreSQL.`, "success");
  },
};
