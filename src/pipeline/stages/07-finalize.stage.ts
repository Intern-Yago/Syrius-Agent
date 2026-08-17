import { PipelineContext, PipelineStageHandler } from "../types.js";
import { prisma } from "../../core/database.js";

export const finalizeStage: PipelineStageHandler = {
  id: "finalize",
  name: "Finalização & Pronto",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (!ctx.postId) {
      throw new Error("ID do post não encontrado para finalização.");
    }

    log("Iniciando validação e finalização da publicação...");

    const post = await prisma.post.findUnique({
      where: { id: ctx.postId },
      include: {
        slides: { orderBy: { number: "asc" } },
        reviews: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!post) {
      throw new Error(`Post ID ${ctx.postId} não encontrado para finalização.`);
    }

    if (post.status !== "APPROVED") {
      throw new Error(`O post está com status "${post.status}" e não pode ser finalizado.`);
    }

    if (post.format === "CAROUSEL" || post.format === "SINGLE_IMAGE") {
      const missingImages = post.slides.filter((s) => !s.imagePath);
      if (missingImages.length > 0) {
        throw new Error(`Existem ${missingImages.length} elementos visuais sem imagem vinculada.`);
      }
    }

    const finalizedPost = await prisma.post.update({
      where: { id: post.id },
      data: { status: "READY" },
    });

    // Atualiza o slot correspondente no Cronograma Editorial para "READY" e vincula o postId
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const scheduleFilePath = path.resolve(currentDir, "..", "..", "..", "output", "editorial-schedule.json");

      const fileContent = await fs.readFile(scheduleFilePath, "utf-8");
      const slots = JSON.parse(fileContent);

      if (Array.isArray(slots)) {
        let updated = false;
        for (const slot of slots) {
          const matchById = ctx.slotId && slot.id === ctx.slotId;
          const matchByTopic = slot.topic && (
            slot.topic.trim().toLowerCase() === finalizedPost.topic.trim().toLowerCase() ||
            finalizedPost.topic.toLowerCase().includes(slot.topic.toLowerCase()) ||
            slot.topic.toLowerCase().includes(finalizedPost.topic.toLowerCase())
          );

          if (matchById || matchByTopic) {
            slot.status = "READY";
            slot.postId = finalizedPost.id;
            updated = true;
            break;
          }
        }

        if (updated) {
          await fs.writeFile(scheduleFilePath, JSON.stringify(slots, null, 2), "utf-8");
          log(`📅 Cronograma Editorial atualizado: Slot marcado como "Pronto & Agendado" e vinculado ao post ${finalizedPost.id}!`, "success");
        }
      }
    } catch (schedErr) {
      console.warn("⚠️ Não foi possível sincronizar o status no editorial-schedule.json:", schedErr);
    }

    log(`PUBLICACÃO PRONTA PARA AGENDAMENTO:\n- ID: ${finalizedPost.id}\n- Formato: [${finalizedPost.format}]\n- Tema: ${finalizedPost.topic}\n- Status: ${finalizedPost.status}\n- Elementos: ${post.slides.length}`, "success");
    log("Pipeline concluído com sucesso total!", "success");
  },
};
