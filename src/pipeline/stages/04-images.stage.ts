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

    const isVertical = format === "STORY_PHOTO" || format === "STORIES" || format === "REEL_SCRIPT" || format === "REEL";
    const targetWidth = 1080;
    const targetHeight = isVertical ? 1920 : 1350;

    // Para REEL_SCRIPT, geramos a Capa Oficial Vertical (9:16) no Slide 1 (Gancho/Capa),
    // enquanto as cenas 2..N são o roteiro técnico com minutagem e teleprompter.
    const isReel = format === "REEL_SCRIPT" || format === "REEL";
    const slidesToRender = isReel ? slides.slice(0, 1) : slides;

    for (let i = 0; i < slidesToRender.length; i++) {
      const slide = slidesToRender[i];
      const progressText = `${i + 1}/${slidesToRender.length}`;
      log(
        isReel
          ? `Renderizando Capa Oficial Vertical do Reel (9:16 - 1080x1920): "${slide.title}"...`
          : `Renderizando elemento ${slide.number} (${progressText}): "${slide.title}"...`
      );

      const promptData = buildImagePrompt(slide, slides.length, format);
      const buffer = await generateCloudflareImage({
        prompt: promptData.prompt,
        width: targetWidth,
        height: targetHeight,
      });

      imageBuffers.set(slide.number, buffer);
      log(`Arte ${slide.number} renderizada e ajustada no Sharp (${targetWidth}x${targetHeight}) com sucesso. (${progressText})`);
    }

    if (isReel && slides.length > 1) {
      log(`🎬 Roteiro de Reels: Capa 9:16 gerada no Slide 1. As cenas 2 a ${slides.length} foram estruturadas como teleprompter técnico.`, "success");
    }

    ctx.imageBuffers = imageBuffers;

    log(`Geração visual finalizada: ${imageBuffers.size} arte(s) renderizada(s).`, "success");
  },
};
