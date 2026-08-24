import { PipelineContext, PipelineStageHandler, GeneratedContentData } from "../types.js";
import { executeStructuredPrompt } from "../../core/gemini.js";
import { buildContentGeneratorPrompt } from "../../prompts/content.prompt.js";

export const contentStage: PipelineStageHandler = {
  id: "content",
  name: "Redação de Conteúdo",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (!ctx.decision) {
      throw new Error("Não há decisão estratégica no contexto para gerar o conteúdo.");
    }

    const format = ctx.decision.format?.toUpperCase() || "CAROUSEL";
    const { getBrandInfo } = await import("../../config/brand.js");
    const brand = await getBrandInfo();

    log(`Consultando Memória RAG para aprendizados sobre "${ctx.decision.topic}"...`);
    const { searchRelevantInsights } = await import("../../services/embedding-service.js");
    const { activeInsights, refutedInsights } = await searchRelevantInsights(ctx.decision.topic, 3);

    let ragInsightsStr = "";
    if (activeInsights.length > 0) {
      ragInsightsStr += "DIRETRIZES VALIDADAS PELO RAG:\n" + activeInsights.map((i) => `- ${i.title}: ${i.content}`).join("\n");
    }
    if (refutedInsights.length > 0) {
      ragInsightsStr += "\nO QUE NÃO FAZER (PREMISSAS REFUTADAS):\n" + refutedInsights.map((i) => `- Evitar: ${i.content}`).join("\n");
    }

    if (ragInsightsStr) {
      log(`RAG recuperou ${activeInsights.length} diretrizes validadas e ${refutedInsights.length} premissas refutadas.`, "info");
    }

    // Recupera diretrizes estratégicas ativas do último relatório de Analytics
    let globalDirectives: string[] = [];
    try {
      const { getAnalyticsHistory } = await import("../../services/analytics-engine.js");
      const history = await getAnalyticsHistory();
      if (history[0]?.strategicDirectives && Array.isArray(history[0].strategicDirectives)) {
        globalDirectives = history[0].strategicDirectives;
        if (globalDirectives.length > 0) {
          log(`Analytics ativo: ${globalDirectives.length} diretrizes estratégicas injetadas na redação.`, "info");
        }
      }
    } catch {}

    log(`Gerando conteúdo técnico (${format}) para ${brand.handle} sobre "${ctx.decision.topic}"...`);

    const prompt = buildContentGeneratorPrompt({
      ...ctx.decision,
      handle: brand.handle,
      ragInsights: ragInsightsStr || undefined,
      globalDirectives: globalDirectives.length > 0 ? globalDirectives : undefined,
    });
    const content = await executeStructuredPrompt<GeneratedContentData>(prompt);

    if (!content.slides || content.slides.length === 0) {
      throw new Error("A IA não gerou os slides/cenas do conteúdo.");
    }

    if (format === "CAROUSEL" && (content.slides.length < 3 || content.slides.length > 10)) {
      log(`Aviso: Carrossel gerado com ${content.slides.length} slides (esperado entre 4 e 8).`, "warning");
    }

    ctx.content = {
      ...content,
      format,
    };

    log(`CONTEÚDO GERADO:\n- Formato: ${format}\n- Tópico: ${content.topic}\n- Slides/Cenas: ${content.slides.length}\n- Hashtags: ${content.hashtags?.join(" ") || "Nenhuma"}`, "success");
  },
};
