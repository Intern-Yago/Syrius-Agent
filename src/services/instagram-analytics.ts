import {
  getInstagramProfile,
  getInstagramMedia,
  getInstagramAudience,
} from "./instagram.js";

export interface InstagramAnalytics {
  profile: {
    username: string;
    followers: number;
    mediaCount: number;
  };

  content: {
    totalPosts: number;
    formats: Record<string, number>;
    recentPosts: Array<{
      id: string;
      caption: string;
      mediaType: string;
      timestamp: string;
      permalink?: string;
    }>;
  };

  audience: {
    available: boolean;
    metrics: Record<string, unknown>;
  };

  insights: {
    accountStage:
      | "NEW_ACCOUNT"
      | "GROWING_ACCOUNT"
      | "ESTABLISHED_ACCOUNT";

    dataQuality:
      | "INSUFFICIENT"
      | "LIMITED"
      | "GOOD";

    recommendations: string[];
  };
}

export async function getInstagramAnalytics(): Promise<InstagramAnalytics> {
  console.log("📊 Iniciando análise do Instagram...");

  /*
   * ==========================================
   * 1. PERFIL
   * ==========================================
   */

  console.log("👤 Consultando perfil...");

  const profile = await getInstagramProfile();

  /*
   * ==========================================
   * 2. PUBLICAÇÕES
   * ==========================================
   */

  console.log("📚 Consultando publicações...");

  const media = await getInstagramMedia();

  /*
   * ==========================================
   * 3. AUDIÊNCIA
   * ==========================================
   */

  console.log("📈 Consultando audiência...");

  let audienceData: any[] = [];

  try {
    audienceData = await getInstagramAudience();
  } catch (error) {
    console.warn(
      "⚠️ Não foi possível obter dados completos de audiência."
    );

    console.warn(error);
  }

  /*
   * ==========================================
   * 4. ANALISAR FORMATOS
   * ==========================================
   */

  const formats: Record<string, number> = {};

  for (const post of media) {
    const type = post.media_type;

    formats[type] = (formats[type] ?? 0) + 1;
  }

  /*
   * ==========================================
   * 5. DETERMINAR ESTÁGIO DA CONTA
   * ==========================================
   */

  let accountStage:
    | "NEW_ACCOUNT"
    | "GROWING_ACCOUNT"
    | "ESTABLISHED_ACCOUNT";

  if (media.length < 5) {
    accountStage = "NEW_ACCOUNT";
  } else if (media.length < 30) {
    accountStage = "GROWING_ACCOUNT";
  } else {
    accountStage = "ESTABLISHED_ACCOUNT";
  }

  /*
   * ==========================================
   * 6. QUALIDADE DOS DADOS
   * ==========================================
   */

  let dataQuality:
    | "INSUFFICIENT"
    | "LIMITED"
    | "GOOD";

  if (media.length === 0) {
    dataQuality = "INSUFFICIENT";
  } else if (media.length < 10) {
    dataQuality = "LIMITED";
  } else {
    dataQuality = "GOOD";
  }

  /*
   * ==========================================
   * 7. RECOMENDAÇÕES
   * ==========================================
   */

  const recommendations: string[] = [];

  if (media.length === 0) {
    recommendations.push(
      "A conta ainda não possui publicações suficientes para identificar padrões reais de conteúdo."
    );

    recommendations.push(
      "Priorizar a construção de um histórico inicial de conteúdos antes de tirar conclusões estatísticas."
    );
  }

  if (media.length < 10) {
    recommendations.push(
      "Evitar conclusões definitivas sobre melhor formato, melhor horário ou melhor dia com base nos dados atuais."
    );
  }

  if (audienceData.length === 0) {
    recommendations.push(
      "Os dados de audiência disponíveis ainda são insuficientes para determinar o melhor horário de publicação."
    );
  }

  /*
   * ==========================================
   * 8. RESULTADO
   * ==========================================
   */

  const analytics: InstagramAnalytics = {
    profile: {
      username: profile.username ?? "",
      followers: profile.followers_count ?? 0,
      mediaCount: profile.media_count ?? 0,
    },

    content: {
      totalPosts: media.length,
      formats,
      recentPosts: media.map((post) => ({
        id: post.id,
        caption: post.caption,
        mediaType: post.media_type,
        timestamp: post.timestamp,
        permalink: post.permalink,
      })),
    },

    audience: {
      available: audienceData.length > 0,
      metrics: Object.fromEntries(
        audienceData.map((metric) => [
          metric.name,
          metric,
        ])
      ),
    },

    insights: {
      accountStage,
      dataQuality,
      recommendations,
    },
  };

  console.log("\n==============================");
  console.log("📊 INSTAGRAM ANALYTICS");
  console.log("==============================");

  console.log(
    `Perfil: @${analytics.profile.username}`
  );

  console.log(
    `Seguidores: ${analytics.profile.followers}`
  );

  console.log(
    `Publicações: ${analytics.content.totalPosts}`
  );

  console.log(
    `Estágio: ${analytics.insights.accountStage}`
  );

  console.log(
    `Qualidade dos dados: ${analytics.insights.dataQuality}`
  );

  console.log(
    `Dados de audiência: ${
      analytics.audience.available
        ? "disponíveis"
        : "indisponíveis"
    }`
  );

  return analytics;
}