import { PipelineContext, PipelineStageHandler } from "../types.js";
import { prisma } from "../../core/database.js";
import { buildImagePrompt } from "../../prompts/brand-visual.prompt.js";
import { generateCloudflareImage } from "../../integrations/cloudflare/recraft.js";

export const imagesStage: PipelineStageHandler = {
  id: "images",
  name: "Geração de Artes",
  async execute(ctx: PipelineContext, log): Promise<void> {
    let slides = ctx.content?.slides;
    const format = ctx.content?.format || ctx.decision?.format || "CAROUSEL";

    if (!slides && ctx.postId) {
      const post = await prisma.post.findUnique({
        where: { id: ctx.postId },
        include: { slides: { orderBy: { number: "asc" } } },
      });
      if (post) {
        slides = post.slides.map((s) => ({
          number: s.number,
          title: s.title,
          text: s.text,
          visualDirection: s.visualDirection,
          imagePath: s.imagePath ?? undefined,
        }));
      }
    }

    if (!slides || slides.length === 0) {
      throw new Error("Nenhum slide/cena encontrado para geração visual.");
    }

    log(`Iniciando geração de artes (${format}) para ${slides.length} elemento(s) via Cloudflare Recraft...`);

    const imageBuffers = new Map<number, Buffer>();

    const isStory = format === "STORY_PHOTO";
    const targetWidth = 1080;
    const targetHeight = isStory ? 1920 : 1350;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const progressText = `${i + 1}/${slides.length}`;
      log(`Renderizando elemento ${slide.number} (${progressText}): "${slide.title}"...`);

      const promptData = buildImagePrompt(slide, slides.length);
      const buffer = await generateCloudflareImage({
        prompt: promptData.prompt,
        width: targetWidth,
        height: targetHeight,
      });

      imageBuffers.set(slide.number, buffer);
      log(`Arte ${slide.number} renderizada e ajustada no Sharp (${targetWidth}x${targetHeight}) com sucesso. (${progressText})`);
    }

    ctx.imageBuffers = imageBuffers;

    log(`Geração visual finalizada: ${imageBuffers.size}/${slides.length} arte(s) gerada(s).`, "success");
  },
};
