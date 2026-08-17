import { PipelineContext, PipelineStageHandler } from "../types.js";
import { prisma } from "../../core/database.js";

export const databaseStage: PipelineStageHandler = {
  id: "database",
  name: "Persistência PostgreSQL",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (!ctx.content) {
      throw new Error("Não há conteúdo gerado no contexto para salvar no banco.");
    }

    log("Salvando no PostgreSQL via Prisma...");

    const savedPost = await prisma.post.create({
      data: {
        topic: ctx.content.topic,
        format: ctx.content.format,
        caption: ctx.content.caption,
        hashtags: ctx.content.hashtags,
        status: "DRAFT",
        slides: {
          create: ctx.content.slides.map((slide) => ({
            number: slide.number,
            title: slide.title,
            text: slide.text,
            visualDirection: slide.visualDirection,
          })),
        },
      },
      include: {
        slides: {
          orderBy: { number: "asc" },
        },
      },
    });

    ctx.postId = savedPost.id;

    log(`POST SALVO: ${savedPost.id} com ${savedPost.slides.length} slides registrados no banco.`, "success");
  },
};
