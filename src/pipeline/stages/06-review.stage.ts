import { PipelineContext, PipelineStageHandler, QualityReviewResult } from "../types.js";
import { prisma } from "../../core/database.js";
import { executeStructuredPrompt } from "../../core/gemini.js";
import { buildReviewerPrompt } from "../../prompts/reviewer.prompt.js";

export const reviewStage: PipelineStageHandler = {
  id: "review",
  name: "Quality Control (QC)",
  async execute(ctx: PipelineContext, log): Promise<void> {
    if (!ctx.postId) {
      throw new Error("ID do post não encontrado para auditoria.");
    }

    const post = await prisma.post.findUnique({
      where: { id: ctx.postId },
      include: { slides: { orderBy: { number: "asc" } } },
    });

    if (!post) {
      throw new Error(`Post ID ${ctx.postId} não encontrado para auditoria.`);
    }

    log("Enviando conteúdo para avaliação do Content Reviewer IA...");

    const serializedContent = JSON.stringify(
      {
        topic: post.topic,
        format: post.format,
        caption: post.caption,
        hashtags: post.hashtags,
        slides: post.slides.map((s) => ({
          number: s.number,
          title: s.title,
          text: s.text,
          visualDirection: s.visualDirection,
        })),
      },
      null,
      2
    );

    const prompt = buildReviewerPrompt(serializedContent);
    const reviewResult = await executeStructuredPrompt<QualityReviewResult>(prompt);

    ctx.reviewResult = reviewResult;

    log(`RESULTADO DA REVISÃO:\n- Status: ${reviewResult.status}\n- Score geral: ${reviewResult.score}/10\n- Precisão técnica: ${reviewResult.technicalAccuracy}/10\n- Hook: ${reviewResult.hookQuality}/10\n- Resumo: ${reviewResult.summary}`);

    log("Salvando avaliação no PostgreSQL...");

    const createdReview = await prisma.contentReview.create({
      data: {
        postId: post.id,
        status: reviewResult.status,
        score: reviewResult.score,
        technicalAccuracy: reviewResult.technicalAccuracy,
        hookQuality: reviewResult.hookQuality,
        structureQuality: reviewResult.structureQuality,
        educationalValue: reviewResult.educationalValue,
        engagementPotential: reviewResult.engagementPotential,
        visualConsistency: reviewResult.visualConsistency,
        strengths: reviewResult.strengths,
        problems: reviewResult.problems,
        suggestions: reviewResult.suggestions,
        summary: reviewResult.summary,
      },
    });

    log(`Review salva no banco com ID: ${createdReview.id}`);

    if (reviewResult.status === "APPROVED") {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "APPROVED" },
      });
      log(`Post atualizado: APPROVED com score ${reviewResult.score}/10.`, "success");
    } else {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: "FAILED" },
      });
      throw new Error(`Post não atingiu a pontuação mínima de aprovação (Score: ${reviewResult.score}/10). Motivos: ${reviewResult.problems.join(", ")}`);
    }
  },
};
