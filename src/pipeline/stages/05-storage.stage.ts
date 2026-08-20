import { PipelineContext, PipelineStageHandler } from "../types.js";
import { prisma } from "../../core/database.js";
import { saveImageLocally } from "../../core/storage.js";

export const storageStage: PipelineStageHandler = {
  id: "storage",
  name: "Armazenamento Local",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (!ctx.postId) {
      throw new Error("ID da publicação não encontrado para vincular as imagens.");
    }

    if (!ctx.imageBuffers || ctx.imageBuffers.size === 0) {
      throw new Error("Nenhum buffer de imagem disponível.");
    }

    log(`Salvando ${ctx.imageBuffers.size} arte(s) localmente no disco...`);

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
        // Se for cena de roteiro de Reel sem imagem dedicada, pula
        continue;
      }

      const relativeKey = `${post.id}/slide-${slide.number}.png`;
      const localPath = await saveImageLocally(buffer, relativeKey);

      await prisma.slide.update({
        where: { id: slide.id },
        data: { imagePath: localPath },
      });

      log(`Slide ${slide.number} salvo localmente: "${localPath}".`);
    }

    log(`Armazenamento local finalizado com sucesso. (Upload para o R2 ocorrerá apenas na publicação)`, "success");
  },
};
