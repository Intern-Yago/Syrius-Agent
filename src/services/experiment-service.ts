import { prisma } from "../core/database.js";
import { executeStructuredPrompt } from "../core/gemini.js";

export interface VariantABResult {
  topic: string;
  targetVariable: "HOOK" | "VISUAL_DESIGN" | "CTA_SAVES" | "BODY_DENSITY";
  hypothesis: string;
  variantA: {
    name: string;
    hook: string;
    visualDirection: string;
    rationale: string;
  };
  variantB: {
    name: string;
    hook: string;
    visualDirection: string;
    rationale: string;
  };
}

/**
 * Lista todos os experimentos de conteúdo cadastrados
 */
export async function listContentExperiments() {
  return await prisma.contentExperiment.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Gera duas variantes A/B inteligentes com Gemini para testar capas, ganchos ou chamadas de ação
 */
export async function generateContentExperimentVariants(
  topic: string,
  format: string = "CAROUSEL",
  targetVariable: "HOOK" | "VISUAL_DESIGN" | "CTA_SAVES" | "BODY_DENSITY" = "HOOK"
): Promise<VariantABResult> {
  const prompt = `
Você é um cientista de dados e estrategista sênior de crescimento para criadores de conteúdo tech no Instagram.

Gere um TESTE A/B CIENTÍFICO para o tema: "${topic}" (${format}).
Variável de teste: ${targetVariable}

OBJETIVO:
Criar duas hipóteses contrastantes para descobrir qual gera maior taxa de retenção ou conversão:
- VARIANTE A (Ângulo Direto & Técnico Sênior): Focado em autoridade, precisão, código e pragmatismo.
- VARIANTE B (Ângulo Provocativo & Impacto Viral): Focado em quebra de crença comum, curiosidade e dor urgente em produção.

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "topic": "${topic}",
  "targetVariable": "${targetVariable}",
  "hypothesis": "Hipótese clara: se usarmos [Variante B], esperamos maior taxa de [salvamentos/cliques] porque [motivo]",
  "variantA": {
    "name": "Variante A (Técnica & Direta)",
    "hook": "Gancho da Variante A",
    "visualDirection": "Direção visual de capa/arte da Variante A",
    "rationale": "Por que esta abordagem atrai desenvolvedores sêniores"
  },
  "variantB": {
    "name": "Variante B (Provocativa & Quebra de Padrão)",
    "hook": "Gancho da Variante B",
    "visualDirection": "Direção visual de capa/arte da Variante B",
    "rationale": "Por que esta abordagem retém a atenção no scroll rápido"
  }
}
`.trim();

  return await executeStructuredPrompt<VariantABResult>(prompt);
}

/**
 * Salva um novo experimento no banco
 */
export async function saveContentExperiment(data: {
  topic: string;
  format: string;
  targetVariable: string;
  hypothesis: string;
  plannedPromptDiff?: string;
  originalPostId?: string;
  recommendedRecycleDays?: number;
}) {
  const recycleDate = new Date();
  recycleDate.setDate(recycleDate.getDate() + (data.recommendedRecycleDays || 14));

  return await prisma.contentExperiment.create({
    data: {
      topic: data.topic,
      format: data.format,
      targetVariable: data.targetVariable,
      hypothesis: data.hypothesis,
      plannedPromptDiff: data.plannedPromptDiff,
      originalPostId: data.originalPostId,
      recommendedRecycleAt: recycleDate,
      status: "HYPOTHESIS",
    },
  });
}

/**
 * Atualiza o status do experimento
 */
export async function updateExperimentStatus(id: string, status: string) {
  return await prisma.contentExperiment.update({
    where: { id },
    data: { status },
  });
}

/**
 * Remove um experimento
 */
export async function deleteContentExperiment(id: string) {
  return await prisma.contentExperiment.delete({
    where: { id },
  });
}
