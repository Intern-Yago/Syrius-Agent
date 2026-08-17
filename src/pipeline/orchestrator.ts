import { PipelineContext, PipelineStageHandler, PipelineStageId } from "./types.js";
import { strategyStage } from "./stages/01-strategy.stage.js";
import { contentStage } from "./stages/02-content.stage.js";
import { databaseStage } from "./stages/03-database.stage.js";
import { imagesStage } from "./stages/04-images.stage.js";
import { storageStage } from "./stages/05-storage.stage.js";
import { reviewStage } from "./stages/06-review.stage.js";
import { finalizeStage } from "./stages/07-finalize.stage.js";
import { prisma } from "../core/database.js";

export const PIPELINE_STAGES: PipelineStageHandler[] = [
  strategyStage,
  contentStage,
  databaseStage,
  imagesStage,
  storageStage,
  reviewStage,
  finalizeStage,
];

export interface RunPipelineOptions {
  fromStage?: string;
  slot?: {
    topic: string;
    format: string;
    objective: string;
    reasoning?: string;
    hook?: string;
  };
  onLog?: (message: string, type: "info" | "success" | "warning" | "error") => void;
}

export interface RunPipelineResult {
  success: boolean;
  message?: string;
  postId?: string;
  topic?: string;
  score?: number;
}

export async function runPipeline(options: RunPipelineOptions = {}): Promise<RunPipelineResult> {
  const { fromStage, slot, onLog } = options;

  function log(message: string, type: "info" | "success" | "warning" | "error" = "info") {
    if (type === "error") {
      console.error(message);
    } else {
      console.log(message);
    }
    if (onLog) {
      onLog(message, type);
    }
  }

  log(`========================================`);
  log(`🤖 SOCIAL MEDIA AUTONOMOUS PIPELINE`);
  log(`========================================`);

  const ctx: PipelineContext = {};

  if (slot) {
    ctx.slotId = (slot as any).id;
    ctx.decision = {
      topic: slot.topic,
      format: slot.format,
      objective: slot.objective,
      reasoning: slot.reasoning || "Slot planejado pelo cronograma editorial.",
      hook: slot.hook || slot.topic,
    };
  }

  // Se estiver reiniciando de uma etapa específica, recupera o último post em DRAFT/NEEDS_REVISION
  let startIndex = 0;
  if (fromStage) {
    const stageIndex = PIPELINE_STAGES.findIndex((s) => s.id === fromStage);
    if (stageIndex !== -1) {
      startIndex = stageIndex;
      log(`🔄 Recomeçando a execução a partir da etapa: "${PIPELINE_STAGES[stageIndex].name}"...`);

      if (stageIndex >= 2) {
        const lastPost = await prisma.post.findFirst({
          orderBy: { createdAt: "desc" },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        if (lastPost) {
          ctx.postId = lastPost.id;
          ctx.content = {
            topic: lastPost.topic,
            format: lastPost.format,
            objective: "AUTHORITY",
            hook: lastPost.slides[0]?.title || lastPost.topic,
            caption: lastPost.caption || "",
            hashtags: lastPost.hashtags || [],
            slides: (lastPost.slides || []).map((s) => ({
              number: s.number,
              title: s.title,
              text: s.text,
              visualDirection: s.visualDirection,
              imagePath: s.imagePath ?? undefined,
            })),
          };
          ctx.decision = {
            topic: lastPost.topic,
            format: lastPost.format,
            objective: "AUTHORITY",
            hook: lastPost.slides[0]?.title || lastPost.topic,
            reasoning: "Retomado do histórico do banco de dados.",
          };
          log(`Contexto recuperado do banco: Post ID ${lastPost.id} ("${lastPost.topic}" com ${lastPost.slides.length} slides)`);
        }
      }
    }
  }

  try {
    for (let i = startIndex; i < PIPELINE_STAGES.length; i++) {
      const stage = PIPELINE_STAGES[i];
      log(`\n--- [Etapa ${i + 1}/${PIPELINE_STAGES.length}: ${stage.name}] ---`);
      await stage.execute(ctx, log);
    }

    return {
      success: true,
      postId: ctx.postId,
      topic: ctx.content?.topic || ctx.decision?.topic,
      score: ctx.reviewResult?.score,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`❌ Erro no pipeline: ${errorMessage}`, "error");
    return {
      success: false,
      message: errorMessage,
      postId: ctx.postId,
    };
  }
}
