import { PipelineContext, PipelineStageHandler, StrategyDecisionData } from "../types.js";
import { prisma } from "../../core/database.js";
import { executeStructuredPrompt } from "../../core/gemini.js";
import { buildStrategistPrompt } from "../../prompts/strategist.prompt.js";
import { buildInstagramContext } from "../../integrations/instagram/analytics.js";

export const strategyStage: PipelineStageHandler = {
  id: "strategy",
  name: "Estratégia & Pauta",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (ctx.decision?.topic && ctx.decision?.format) {
      log(`🎯 Pauta direcionada pelo Cronograma Editorial:\n- Formato: ${ctx.decision.format}\n- Tema: ${ctx.decision.topic}\n- Objetivo: ${ctx.decision.objective}\n- Hook: ${ctx.decision.hook || ctx.decision.topic}`, "success");
      return;
    }

    log("Consultando histórico de publicações no PostgreSQL...");

    const recentPosts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { topic: true, format: true, createdAt: true },
    });

    log(`Encontrados ${recentPosts.length} posts no histórico do banco.`);

    const recentTopics = recentPosts.length > 0
      ? recentPosts.map((p) => `- ${p.topic} (${p.format})`).join("\n")
      : "Nenhum post registrado anteriormente.";

    const recentFormats = recentPosts.length > 0
      ? recentPosts.map((p) => p.format).join(", ")
      : "Nenhum formato registrado.";

    log("Analisando dados do perfil e audiência do Instagram...");
    const analyticsContext = await buildInstagramContext();

    const { getBrandInfo } = await import("../../config/brand.js");
    const brand = await getBrandInfo();

    log(`Consultando Content Strategist IA (Gemini) para o perfil ${brand.handle}...`);
    const prompt = buildStrategistPrompt(analyticsContext, recentTopics, recentFormats, brand.handle);

    const decision = await executeStructuredPrompt<StrategyDecisionData>(prompt);

    const { checkTopicDecay } = await import("../../services/topic-decay.js");
    const decayCheck = await checkTopicDecay(decision.topic);
    if (decayCheck.isSaturated) {
      log(`Alerta Anti-Fadiga de Conteudo: ${decayCheck.warningMessage}`, "warning");
    }

    ctx.decision = decision;

    log(`DECISAO DO GESTOR:\n- Formato: ${decision.format}\n- Tema: ${decision.topic}\n- Objetivo: ${decision.objective}\n- Hook: ${decision.hook}`, "success");
  },
};
