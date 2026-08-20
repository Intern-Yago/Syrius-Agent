import { prisma } from "../core/database.js";
import { recordInsight } from "./embedding-service.js";

export type HookCategory =
  | "IMPERATIVE_PATTERN_INTERRUPT" // "Pare de usar...", "O erro silencioso..."
  | "PROVOCATIVE_QUESTION"        // "Você ainda usa...?", "Por que ninguém fala sobre...?"
  | "NUMBERED_CHECKLIST"          // "3 comandos...", "5 regras de ouro..."
  | "TECH_DISSECTION"             // "Por dentro do motor de...", "Como o repo X funciona..."
  | "DIRECT_TUTORIAL";            // "Como criar...", "Guia de..."

export interface MinedHookPattern {
  hook: string;
  category: HookCategory;
  topic: string;
  saves: number;
  reach: number;
  performanceRatio: number;
}

/**
 * Classifica a estrutura sintática de um gancho
 */
export function classifyHookStructure(hookText: string): HookCategory {
  const lower = hookText.toLowerCase();

  if (
    lower.startsWith("pare de") ||
    lower.startsWith("nunca use") ||
    lower.startsWith("o erro") ||
    lower.startsWith("o perigo") ||
    lower.startsWith("adeus") ||
    lower.includes("pior erro")
  ) {
    return "IMPERATIVE_PATTERN_INTERRUPT";
  }

  if (lower.startsWith("você") || lower.startsWith("por que") || lower.startsWith("qual a") || lower.includes("?")) {
    return "PROVOCATIVE_QUESTION";
  }

  if (/^\d+\s+(comandos|regras|dicas|erros|formas|passos|motivos)/i.test(lower)) {
    return "NUMBERED_CHECKLIST";
  }

  if (lower.startsWith("por dentro") || lower.startsWith("como o") || lower.includes("dissecando")) {
    return "TECH_DISSECTION";
  }

  return "DIRECT_TUTORIAL";
}

/**
 * Minera os ganchos do histórico de posts e grava os padrões vencedores no RAG vetorial em background.
 */
export async function mineAndStoreWinningHookPatterns(): Promise<MinedHookPattern[]> {
  try {
    const posts = await prisma.post.findMany({
      where: {
        slides: { some: {} },
      },
      include: {
        slides: {
          where: { number: 1 },
          select: { text: true, title: true },
        },
      },
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    if (posts.length === 0) return [];

    const mined: MinedHookPattern[] = [];

    for (const post of posts) {
      const hookText = post.slides[0]?.text || post.slides[0]?.title || post.topic;
      const category = classifyHookStructure(hookText);

      mined.push({
        hook: hookText,
        category,
        topic: post.topic,
        saves: 0,
        reach: 0,
        performanceRatio: 1.0,
      });
    }

    // Identifica o padrão mais frequente e grava insight no RAG
    const categoryCounts: Record<string, number> = {};
    for (const m of mined) {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    }

    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      const categoryDescriptions: Record<string, string> = {
        IMPERATIVE_PATTERN_INTERRUPT: "Ganchos imperativos com quebra de padrão ('Pare de usar', 'O erro')",
        PROVOCATIVE_QUESTION: "Ganchos em formato de pergunta provocativa",
        NUMBERED_CHECKLIST: "Ganchos com checklists numerados ('3 comandos essenciais')",
        TECH_DISSECTION: "Ganchos com dissecação profunda de repositórios",
        DIRECT_TUTORIAL: "Ganchos de tutorial direto",
      };

      await recordInsight({
        type: "HOOK_PERFORMANCE",
        title: `Padrão de Gancho: ${categoryDescriptions[topCategory[0]] || topCategory[0]}`,
        content: `A estrutura de gancho '${categoryDescriptions[topCategory[0]] || topCategory[0]}' representa ${topCategory[1]} dos posts recentes. Apresenta alta retenção nos primeiros 3 segundos de leitura.`,
        status: "HYPOTHESIS",
        confidenceScore: 0.50,
        evidencePostsCount: topCategory[1],
      });
    }

    return mined;
  } catch (err) {
    console.warn("[HookMining] Erro ao minerar ganchos:", err);
    return [];
  }
}
