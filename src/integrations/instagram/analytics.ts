import { getInstagramProfile, getInstagramMedia, InstagramProfile, InstagramMedia } from "./client.js";

export interface AccountStageInfo {
  stage: "COLD_START" | "EARLY_GROWTH" | "ESTABLISHED";
  description: string;
  focus: string;
}

export function evaluateAccountStage(profile: InstagramProfile, posts: InstagramMedia[]): AccountStageInfo {
  const followers = profile.followers_count ?? 0;
  const postCount = posts.length;

  if (followers < 100 || postCount < 5) {
    return {
      stage: "COLD_START",
      description: "Conta em estágio inicial de aquecimento e posicionamento.",
      focus: "Priorizar autoridade técnica, carrosséis salváveis e clareza de nicho.",
    };
  }

  if (followers < 1000) {
    return {
      stage: "EARLY_GROWTH",
      description: "Conta em crescimento inicial com base qualificada.",
      focus: "Misturar conteúdo educacional aprofundado e posts de debate/comunidade.",
    };
  }

  return {
    stage: "ESTABLISHED",
    description: "Conta estabelecida.",
    focus: "Consolidar autoridade, liderança técnica e diversificação de formatos.",
  };
}

import { getAnalyticsHistory } from "../../services/analytics-engine.js";

export async function buildInstagramContext(): Promise<string> {
  try {
    const profile = await getInstagramProfile();
    const media = await getInstagramMedia();
    const stage = evaluateAccountStage(profile, media);
    const history = await getAnalyticsHistory();
    const latestAudit = history[0];

    let analyticsRagSection = "";
    if (latestAudit) {
      analyticsRagSection = `
MEMÓRIA DE INTELIGÊNCIA & AUDITORIA ANALYTICS RECENTE:
- Score da Conta: ${latestAudit.score.toFixed(1)}/10 | Engajamento Médio: ${latestAudit.engagementRate}%
- Alcance Total: ${latestAudit.reachTotal} | Impressões: ${latestAudit.impressionsTotal} | Novos Seguidores: +${latestAudit.followersGained}
- Post Destaque: "${latestAudit.bestPerformingTopic}"
- O que funcionou muito bem: ${latestAudit.qualitativeStrengths.join("; ")}
- Gargalos a evitar/corrigir: ${latestAudit.qualitativeWeaknesses.join("; ")}
- Diretrizes estratégicas para seguir: ${latestAudit.strategicDirectives.join("; ")}
`.trim();
    }

    return `
DADOS DO PERFIL INSTAGRAM (@${profile.username}):
- Seguidores: ${profile.followers_count ?? "N/D"}
- Total de Publicações: ${profile.media_count ?? media.length}
- Estágio da Conta: ${stage.stage} (${stage.description})
- Foco Estratégico: ${stage.focus}
- Últimos posts analisados: ${media.length} publicações

${analyticsRagSection}
`.trim();
  } catch (err) {
    return `AVISO: Dados do Instagram indisponíveis no momento (${err instanceof Error ? err.message : "sem conexão"}). Prosseguindo com estratégia editorial padrão baseada em histórico interno.`;
  }
}
