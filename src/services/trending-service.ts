import { prisma } from "../core/database.js";
import { executeStructuredPrompt } from "../core/gemini.js";
import { getBrandInfo } from "../config/brand.js";
import { getSettings } from "../config/settings.js";

export interface TrendingTopicItem {
  id: string;
  title: string;
  category: string; // "DevOps & Cloud", "Backend & Arquitetura", "Frontend & UI", "Inteligência Artificial", "Segurança & Performance", "Carreira Dev"
  summary: string;
  whyTrending: string;
  suggestedAngle: string;
  suggestedFormat: "CAROUSEL" | "REEL_SCRIPT" | "SINGLE_IMAGE" | "STORY_PHOTO" | string;
  hookIdea: string;
  baseCopyPrompt?: string | null;
  baseVisualPrompt?: string | null;
  sourceLinks: string[];
  relevanceScore: number; // 0 a 100
  status: "ACTIVE" | "IGNORED" | "GENERATED";
  generatedPostId?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface RawGeminiTrendingTopic {
  title: string;
  category: string;
  summary: string;
  whyTrending: string;
  suggestedAngle: string;
  suggestedFormat: string;
  hookIdea: string;
  baseCopyPrompt: string;
  baseVisualPrompt: string;
  relevanceScore: number;
}

interface GeminiTrendingResponse {
  topics: RawGeminiTrendingTopic[];
}

/**
 * Retorna os tópicos em alta ativos salvos no PostgreSQL.
 * Se a lista estiver vazia ou expirada, realiza a renovação automática com IA.
 */
export async function getActiveTrendingTopics(): Promise<TrendingTopicItem[]> {
  const settings = await getSettings();
  const maxCount = settings.trendingTopicsCount || 10;
  const now = new Date();

  // 1. Busca tópicos ativos e não expirados no PostgreSQL
  const activeTopics = await prisma.trendingTopic.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { gt: now },
    },
    orderBy: { relevanceScore: "desc" },
    take: maxCount,
  });

  if (activeTopics.length > 0) {
    return activeTopics.map((t) => ({
      ...t,
      status: t.status as TrendingTopicItem["status"],
      expiresAt: t.expiresAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  // 2. Se não houver tópicos ativos válidos, dispara renovação com IA
  console.log("[TrendingService] Nenhum tópico ativo válido encontrado. Realizando varredura de tendências com IA...");
  return refreshTrendingTopics(true);
}

/**
 * Renova a lista de tendências tech utilizando IA e salva no PostgreSQL.
 */
export async function refreshTrendingTopics(force = false): Promise<TrendingTopicItem[]> {
  const settings = await getSettings();
  const brand = await getBrandInfo();
  const maxCount = settings.trendingTopicsCount || 10;
  const intervalDays = settings.trendingRefreshIntervalDays || 1;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  // Busca posts publicados recentemente no PostgreSQL para cooldown de 21 dias
  const recentPosts = await prisma.post.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    select: { topic: true, format: true },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  // Busca tópicos recentes de tendências para evitar repetições
  const recentTopics = await prisma.trendingTopic.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    select: { title: true },
  });
  const recentTitles = recentTopics.map((t) => t.title);

  const prompt = `
Você é o Chief Technology Officer e Trend Hunter sênior do perfil de tecnologia ${brand.handle} no Instagram.

Sua missão é realizar uma VARREDURA DE ALTO NÍVEL DAS MAIORES TENDÊNCIAS EM ALTA NO ECOSSISTEMA TECH E DEV NESTA SEMANA.

DIRETRIZES DE INTELIGÊNCIA EDITORIAL E SISTEMA VIVO:
1. Detecte exatamente ${maxCount} temas em alta profunda e relevante para desenvolvedores, engenheiros de software, arquitetos e profissionais tech.
2. CATEGORIAS DE COBERTURA:
   - "DevOps & Cloud" (Docker, Kubernetes, CI/CD, AWS, Terraform, Cloudflare, Linux)
   - "Backend & Arquitetura" (Node.js, TypeScript, Go, Rust, PostgreSQL, Microsserviços, Clean Architecture, Filas, Caching)
   - "Frontend & UI" (React 19, Next.js, Vite, Tailwind, Performance Web, Estado)
   - "Inteligência Artificial & Agentes" (LLMs locais, RAG, MCP, Agentes autônomos, OpenAI, Anthropic, Gemini)
   - "Segurança & Performance" (Vulnerabilidades críticas, Secrets leak, Benchmarks, Otimização de I/O)
   - "Carreira Dev & Boas Práticas" (Senioridade real, System Design, Code Review, Refatoração)

3. DISCERNIMENTO DE ÂNGULO E INTENÇÃO DA AUDIÊNCIA (REPOSITÓRIO VS CONCEITO/IMPACTO):
   - Se o tema envolve um repositório ou ferramenta open-source (ex: OpenClaw, Supabase, Bun, Drizzle):
     * **Ângulo Repositório & Prática**: Use quando a ferramenta for uma novidade prática que o dev quer ver funcionando em poucas linhas de código ou quer dissecar a doc.
     * **Ângulo Arquitetura & Impacto**: Use quando o debate central for o custo de infraestrutura, benchmark contra concorrentes, ou quando NÃO usar em produção.
     * **Ângulo Provocativo / Quebra de Crença**: Use quando o mercado estiver adotando algo por hype sem entender os gargalos reais.

4. REGRA DE COOLDOWN (ANTI-SATURAÇÃO DE CONTEÚDO):
   - Se um tema ou ferramenta já foi publicado recentemente no perfil, É PROIBIDO repetir a mesma abordagem básica.
   - Só sugira um tema similar se for sob um ângulo 100% INÉDITO e avançado (ex: 'Lições de 6 meses em produção', 'O benchmark oculto', 'A falha de segurança que ninguém viu').

POSTS PUBLICADOS RECENTEMENTE NO PERFIL (RESPEITE O COOLDOWN):
${recentPosts.length > 0 ? recentPosts.map((p) => `- [${p.format}] ${p.topic}`).join("\n") : "Nenhum post recente no histórico."}

TÓPICOS JÁ GERADOS RECENTEMENTE NO RADAR:
${recentTitles.length > 0 ? recentTitles.map((t) => `- ${t}`).join("\n") : "Nenhum histórico recente."}

5. CADA TEMA DEVE CONTER:
   - "title": Título claro, direto e chamativo do assunto.
   - "category": Uma das categorias acima.
   - "summary": Resumo de 2 a 3 linhas explicando a essência técnica do assunto.
   - "whyTrending": Explicação detalhada de POR QUE este assunto está em alta agora (novas releases, discussões na comunidade, artigos virais, quebras de paradigmas).
   - "suggestedAngle": Ângulo contra-intuitivo ou prático para abordar o tema no Instagram.
   - "suggestedFormat": Formato ideal ("CAROUSEL", "REEL_SCRIPT", "SINGLE_IMAGE" ou "STORY_PHOTO").
   - "hookIdea": Gancho provocativo para os primeiros 3 segundos ou capa.
   - "baseCopyPrompt": Diretriz base para a redação do post.
   - "baseVisualPrompt": Diretriz estética para a geração visual da imagem/código.
   - "relevanceScore": Número de 80 a 99 indicando o grau de relevância.

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "topics": [
    {
      "title": "Migração de Monólitos para Arquitetura Modular em Node.js com TypeScript",
      "category": "Backend & Arquitetura",
      "summary": "Como times modernos estão abandonando o excesso de microsserviços para adotar Monólitos Modulares com isolamento por domínios.",
      "whyTrending": "Artigos recentes de engenharia de grandes empresas mostram que a complexidade de rede de microsserviços prematuros custa caro.",
      "suggestedAngle": "Demonstrar como criar boundaries claras em TypeScript sem a dor de cabeça de dezenas de repositórios.",
      "suggestedFormat": "CAROUSEL",
      "hookIdea": "Pare de criar microsserviços antes de atingir 1 milhão de requisições: o guia do Monólito Modular.",
      "baseCopyPrompt": "Carrossel técnico detalhando a estrutura de pastas, inversão de dependência e comunicação interna de eventos.",
      "baseVisualPrompt": "Dark terminal theme diagram showing modular monolith vs messy microservices structure.",
      "relevanceScore": 95
    }
  ]
}
`.trim();

  try {
    const aiResponse = await executeStructuredPrompt<GeminiTrendingResponse>(prompt);
    const rawTopics = aiResponse.topics || [];

    if (rawTopics.length === 0) {
      throw new Error("A IA não retornou temas em alta.");
    }

    // Marca tópicos ativos antigos como expirados se forçado
    if (force) {
      await prisma.trendingTopic.updateMany({
        where: { status: "ACTIVE" },
        data: { status: "IGNORED" },
      });
    }

    // Salva os novos tópicos no PostgreSQL
    const savedTopics: TrendingTopicItem[] = [];

    for (let i = 0; i < rawTopics.length; i++) {
      const rt = rawTopics[i];
      const created = await prisma.trendingTopic.create({
        data: {
          id: `trend-${Date.now()}-${i}`,
          title: rt.title,
          category: rt.category || "Backend & Arquitetura",
          summary: rt.summary,
          whyTrending: rt.whyTrending,
          suggestedAngle: rt.suggestedAngle,
          suggestedFormat: rt.suggestedFormat || "CAROUSEL",
          hookIdea: rt.hookIdea,
          baseCopyPrompt: rt.baseCopyPrompt,
          baseVisualPrompt: rt.baseVisualPrompt,
          relevanceScore: rt.relevanceScore || 90,
          status: "ACTIVE",
          expiresAt,
        },
      });

      savedTopics.push({
        ...created,
        status: created.status as TrendingTopicItem["status"],
        expiresAt: created.expiresAt.toISOString(),
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    }

    console.log(`[TrendingService] ${savedTopics.length} novas tendências tech salvas com sucesso no PostgreSQL!`);
    return savedTopics;
  } catch (err) {
    console.error("[TrendingService] Erro ao buscar tendências com IA:", err);
    throw err;
  }
}

/**
 * Marca um tópico em alta como ignorado/apagado pelo usuário.
 */
export async function ignoreTrendingTopic(id: string): Promise<boolean> {
  try {
    await prisma.trendingTopic.update({
      where: { id },
      data: { status: "IGNORED" },
    });
    return true;
  } catch (err) {
    console.error(`[TrendingService] Erro ao ignorar tendência ${id}:`, err);
    return false;
  }
}

/**
 * Marca um tópico em alta como gerado vinculando ao ID do post criado.
 */
export async function markTrendingAsGenerated(id: string, postId: string): Promise<boolean> {
  try {
    await prisma.trendingTopic.update({
      where: { id },
      data: {
        status: "GENERATED",
        generatedPostId: postId,
      },
    });
    return true;
  } catch (err) {
    console.error(`[TrendingService] Erro ao marcar tendência como gerada ${id}:`, err);
    return false;
  }
}
