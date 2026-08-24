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
  narrativeAngle?: string | null; // "BEFORE_AFTER", "HOT_TAKE", "MIGRATION_GUIDE", "SENIOR_REVIEW", "BREAKING_NEWS", "DEEP_DIVE", "COMMUNITY_PULSE", "TLDR_SUMMARY", "STEP_BY_STEP_TUTORIAL"
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
  category?: string;
  summary: string;
  whyTrending: string;
  suggestedAngle: string;
  narrativeAngle?: string;
  suggestedFormat: string;
  hookIdea: string;
  baseCopyPrompt: string;
  baseVisualPrompt: string;
  sourceLinks?: string[];
  repoUrl?: string;
  relevanceScore: number;
}

interface GeminiTrendingResponse {
  generalTopics?: RawGeminiTrendingTopic[];
  trendingRepositories?: RawGeminiTrendingTopic[];
  techNews?: RawGeminiTrendingTopic[];
  topics?: RawGeminiTrendingTopic[];
}

/**
 * Retorna os tópicos em alta ativos salvos no PostgreSQL.
 * Realiza apenas leitura do banco de dados para evitar chamadas desnecessárias de IA.
 */
export async function getActiveTrendingTopics(): Promise<TrendingTopicItem[]> {
  const now = new Date();

  // Busca todos os tópicos ativos salvos no PostgreSQL (até 40)
  let activeTopics = await prisma.trendingTopic.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: [
      { createdAt: "desc" },
      { relevanceScore: "desc" },
    ],
    take: 50,
  });

  // Se não houver tópicos ativos OU se todos os tópicos ativos expiraram pelo calendário
  const isExpired = activeTopics.length > 0 && activeTopics.every((t) => t.expiresAt.getTime() < now.getTime());
  if (activeTopics.length === 0 || isExpired) {
    console.log(`[TrendingService] 🔄 Tendências expiradas ou ausentes no banco. Executando renovação automática com IA...`);
    try {
      return await refreshTrendingTopics(true);
    } catch (err) {
      console.warn("[TrendingService] Aviso ao renovar automaticamente tendências expiradas:", err);
    }
  }

  return activeTopics.map((t) => ({
    ...t,
    status: t.status as TrendingTopicItem["status"],
    expiresAt: t.expiresAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
}

/**
 * Coleta repositórios open-source reais em alta no GitHub via API pública de busca
 */
async function fetchRealGitHubTrending(): Promise<Array<{ name: string; url: string; description: string; stars: number; language: string }>> {
  const dateStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=created:>${dateStr}+stars:>100&sort=stars&order=desc&per_page=15`,
      {
        headers: {
          "User-Agent": "Syrius-Agent-AI-Trends",
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (res.ok) {
      const data: any = await res.json();
      if (data.items && data.items.length > 0) {
        return data.items.map((item: any) => ({
          name: item.full_name,
          url: item.html_url,
          description: item.description || "Sem descrição oficial",
          stars: item.stargazers_count,
          language: item.language || "TypeScript / Python / Rust / Go",
        }));
      }
    }
  } catch (err) {
    console.warn("[TrendingService] Aviso ao buscar repositórios via GitHub Search API:", err);
  }

  // Fallback: repositórios populares atualizados recentemente
  try {
    const pushedDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const res2 = await fetch(
      `https://api.github.com/search/repositories?q=stars:>1000+pushed:>${pushedDate}&sort=updated&order=desc&per_page=12`,
      {
        headers: {
          "User-Agent": "Syrius-Agent-AI-Trends",
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    if (res2.ok) {
      const data2: any = await res2.json();
      if (data2.items && data2.items.length > 0) {
        return data2.items.map((item: any) => ({
          name: item.full_name,
          url: item.html_url,
          description: item.description || "Sem descrição oficial",
          stars: item.stargazers_count,
          language: item.language || "Tech Geral",
        }));
      }
    }
  } catch {}

  return [];
}

/**
 * Coleta notícias e manchetes de tecnologia em tempo real através de 5 fontes nacionais e globais
 */
async function fetchRealTechNews(): Promise<Array<{ title: string; link: string; source: string }>> {
  const newsList: Array<{ title: string; link: string; source: string }> = [];

  function parseRssItems(xml: string, sourceName: string, maxItems = 5) {
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/gi;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < maxItems) {
      const rawTitle = match[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      const link = match[2].trim();
      if (rawTitle && link && !rawTitle.toLowerCase().includes("patrocinado")) {
        newsList.push({
          title: rawTitle,
          link,
          source: sourceName,
        });
        count++;
      }
    }
  }

  // Executa todas as 5 fontes em paralelo com tolerância a falhas individuais
  await Promise.allSettled([
    // 1. Hacker News API (Global / Vale do Silício & Open Source)
    (async () => {
      try {
        const hnRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
        if (hnRes.ok) {
          const storyIds: number[] = await hnRes.json();
          const topIds = storyIds.slice(0, 8);
          const stories = await Promise.all(
            topIds.map(async (id) => {
              try {
                const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                if (itemRes.ok) return await itemRes.json();
              } catch {}
              return null;
            })
          );
          for (const s of stories) {
            if (s && s.title && s.url) {
              newsList.push({
                title: s.title,
                link: s.url,
                source: "Hacker News (Global)",
              });
            }
          }
        }
      } catch (err) {
        console.warn("[TrendingService] Aviso ao buscar Hacker News:", err);
      }
    })(),

    // 2. Dev.to RSS (Global / Comunidade de Desenvolvedores)
    (async () => {
      try {
        const res = await fetch("https://dev.to/feed", {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (res.ok) {
          const xml = await res.text();
          parseRssItems(xml, "Dev.to Community (Global)", 5);
        }
      } catch (err) {
        console.warn("[TrendingService] Aviso ao buscar Dev.to RSS:", err);
      }
    })(),

    // 3. InfoQ News RSS (Global / Arquitetura, Cloud & DevOps)
    (async () => {
      try {
        const res = await fetch("https://feed.infoq.com/", {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (res.ok) {
          const xml = await res.text();
          parseRssItems(xml, "InfoQ Architecture (Global)", 5);
        }
      } catch (err) {
        console.warn("[TrendingService] Aviso ao buscar InfoQ RSS:", err);
      }
    })(),

    // 4. Canaltech / TecMundo Tech RSS (Nacional / Brasil)
    (async () => {
      try {
        const res = await fetch("https://rss.tecmundo.com.br/feed", {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (res.ok) {
          const xml = await res.text();
          parseRssItems(xml, "TecMundo Tech (Nacional)", 5);
        }
      } catch (err) {
        console.warn("[TrendingService] Aviso ao buscar TecMundo RSS:", err);
      }
    })(),

    // 5. Google News Tech Brasil & Global RSS (Agregador Multi-Fonte)
    (async () => {
      try {
        const rssUrl = "https://news.google.com/rss/search?q=tecnologia+programacao+software+inteligencia+artificial+when:5d&hl=pt-BR&gl=BR&ceid=BR:pt-419";
        const res = await fetch(rssUrl, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        if (res.ok) {
          const xml = await res.text();
          parseRssItems(xml, "Google News Tech (Brasil & Global)", 6);
        }
      } catch (err) {
        console.warn("[TrendingService] Aviso ao buscar Google News RSS:", err);
      }
    })(),
  ]);

  return newsList;
}

/**
 * Renova a lista de tendências tech utilizando IA e salva no PostgreSQL.
 * Alimenta a IA com dados de scraping ao vivo do GitHub e Google News RSS.
 */
export async function refreshTrendingTopics(force = false): Promise<TrendingTopicItem[]> {
  const settings = await getSettings();
  const brand = await getBrandInfo();
  const intervalDays = settings.trendingRefreshIntervalDays || 7;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  // 1. Scraping e coleta de dados ao vivo em paralelo
  console.log("[TrendingService] 📡 Coletando dados ao vivo do GitHub Trending e Google News RSS...");
  const [liveGitHubRepos, liveTechNews] = await Promise.all([
    fetchRealGitHubTrending(),
    fetchRealTechNews(),
  ]);
  console.log(`[TrendingService] ✅ Coletados ${liveGitHubRepos.length} repositórios GitHub e ${liveTechNews.length} manchetes de notícias reais.`);

  // 2. Busca posts publicados recentemente no PostgreSQL para cooldown de 30 dias (subtração)
  const recentPosts = await prisma.post.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    select: { topic: true, format: true },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  // Busca tópicos recentes de tendências para evitar repetições
  const recentTopics = await prisma.trendingTopic.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
    select: { title: true, category: true, sourceLinks: true },
  });
  const recentTitles = recentTopics.map((t) => t.title);

  const prompt = `
Você é o Chief Technology Officer e Trend Hunter sênior do perfil de tecnologia ${brand.handle} no Instagram.

Sua missão é realizar uma VARREDURA DE ALTO NÍVEL DAS MAIORES TENDÊNCIAS EM ALTA NO ECOSSISTEMA TECH E DEV NESTA SEMANA, UTILIZANDO OS DADOS REAIS COLETADOS AO VIVO ABAIXO.

=== DADOS REAIS COLETADOS AO VIVO VIA SCRAPING / APIS ===

--- REPOSITÓRIOS EM ALTA NO GITHUB (AO VIVO) ---
${liveGitHubRepos.length > 0
  ? liveGitHubRepos.map((r) => `- [${r.language}] ${r.name} (${r.stars} ⭐): ${r.description} (URL: ${r.url})`).join("\n")
  : "- Repositórios populares: shadcn-ui/ui, drizzle-team/drizzle-orm, oven-sh/bun, langchain-ai/langchain, supabase/supabase"}

--- NOTÍCIAS E LANÇAMENTOS TECH EM TEMPO REAL (GOOGLE NEWS & HACKER NEWS) ---
${liveTechNews.length > 0
  ? liveTechNews.map((n) => `- [${n.source}] ${n.title} (Link: ${n.link})`).join("\n")
  : "- Lançamentos recentes no ecossistema de software, cloud e inteligência artificial."}

=======================================================

VOCÊ DEVE GERAR OBRIGATORIAMENTE 3 SEÇÕES DISTINTAS E COMPLETAS (TOTAL DE 20 ITENS):

1. **generalTopics (EXATAMENTE 10 TEMAS GERAIS & ARQUITETURA)**:
   - Divida entre as categorias:
     * "Backend & Arquitetura" (Node.js, TypeScript, Go, Rust, PostgreSQL, Microsserviços, Clean Architecture, Filas, Caching)
     * "DevOps & Cloud" (Docker, Kubernetes, CI/CD, AWS, Terraform, Cloudflare, Linux)
     * "Frontend & UI" (React 19, Next.js, Vite, Tailwind, Performance Web, Estado)
     * "Inteligência Artificial & Agentes" (LLMs locais, RAG, MCP, Agentes autônomos, OpenAI, Anthropic, Gemini)
     * "Segurança & Performance" (Vulnerabilidades críticas, Secrets leak, Benchmarks, Otimização de I/O)
     * "Carreira Dev & Boas Práticas" (Senioridade real, System Design, Code Review, Refatoração)

2. **trendingRepositories (EXATAMENTE 5 REPOSITÓRIOS EM ALTA NO GITHUB)**:
   - SELECIONE 5 DOS REPOSITÓRIOS REAIS LISTADOS ACIMA (ou ferramentas open-source reais do ecossistema dev).
   - "category": "Repositório GitHub"
   - "repoUrl": URL oficial do GitHub
   - "sourceLinks": [URL oficial do GitHub]
   - "title": "owner/repo: O que a ferramenta faz em poucas palavras"
   - "whyTrending": "Destaque a tração real no GitHub (estrelas reais, novidade técnica ou problema que resolve)"

3. **techNews (EXATAMENTE 5 NOTÍCIAS & LANÇAMENTOS TECH)**:
   - SELECIONE 5 DAS NOTÍCIAS E RELEASES REAIS LISTADAS ACIMA (ou lançamentos recentes de tecnologia).
   - "category": "Notícias & Lançamentos Tech"
   - "narrativeAngle": "BREAKING_NEWS"

DIRETRIZ CRÍTICA DE SUBTRAÇÃO E COOLDOWN (ANTI-REPETIÇÃO):
- Analise os posts recentes publicados abaixo. Se algum repositório ou assunto já foi publicado nos últimos 30 dias, **SUBTRAIA-O OBRIGATORIAMENTE** e traga opções 100% inéditas!

POSTS PUBLICADOS RECENTEMENTE NO PERFIL (RESPEITE O COOLDOWN E SUBTRAIA):
${recentPosts.length > 0 ? recentPosts.map((p) => `- [${p.format}] ${p.topic}`).join("\n") : "Nenhum post recente no histórico."}

TÓPICOS JÁ GERADOS RECENTEMENTE NO RADAR:
${recentTitles.length > 0 ? recentTitles.slice(0, 15).map((t) => `- ${t}`).join("\n") : "Nenhum histórico recente."}

RESPONDA SOMENTE COM ESTE JSON VÁLIDO CONTENDO AS 3 SEÇÕES:
{
  "generalTopics": [
    {
      "title": "Migração de Monólitos para Arquitetura Modular em Node.js com TypeScript",
      "category": "Backend & Arquitetura",
      "summary": "Como times modernos estão adotando Monólitos Modulares com isolamento por domínios.",
      "whyTrending": "Artigos de engenharia mostram o custo de rede de microsserviços prematuros.",
      "suggestedAngle": "Demonstrar boundaries claras em TypeScript sem dezenas de repositórios.",
      "narrativeAngle": "BEFORE_AFTER",
      "suggestedFormat": "CAROUSEL",
      "hookIdea": "Pare de criar microsserviços antes de 1 milhão de requisições.",
      "baseCopyPrompt": "Carrossel técnico detalhando a estrutura de pastas e inversão de dependência.",
      "baseVisualPrompt": "Dark terminal theme diagram showing modular monolith structure.",
      "sourceLinks": [],
      "relevanceScore": 96
    }
  ],
  "trendingRepositories": [
    {
      "title": "shadcn-ui/ui: Novos blocos e componentes acessíveis com Tailwind CSS",
      "category": "Repositório GitHub",
      "summary": "Coleção de componentes reutilizáveis para copiar e colar diretamente no app.",
      "whyTrending": "Mais de 70k stars no GitHub e atualização recente com novos blocos.",
      "suggestedAngle": "Por que copiar código superou bibliotecas pesadas de componentes.",
      "narrativeAngle": "SENIOR_REVIEW",
      "suggestedFormat": "CAROUSEL",
      "hookIdea": "Por que devs React seniores abandonaram pacotes tradicionais de UI.",
      "baseCopyPrompt": "Carrossel dissecando o design system do shadcn/ui.",
      "baseVisualPrompt": "Dark code editor mockup showing clean React component structure.",
      "repoUrl": "https://github.com/shadcn-ui/ui",
      "sourceLinks": ["https://github.com/shadcn-ui/ui"],
      "relevanceScore": 98
    }
  ],
  "techNews": [
    {
      "title": "Node.js 22 LTS: Suporte Nativo a TypeScript e Novo Compilador V8",
      "category": "Notícias & Lançamentos Tech",
      "summary": "Nova versão LTS traz execução nativa de arquivos .ts sem necessidade de ts-node.",
      "whyTrending": "Adoção maciça em produção com ganho de velocidade e fim de builds lentos.",
      "suggestedAngle": "O que muda na prática para o fluxo de trabalho de desenvolvedores backend.",
      "narrativeAngle": "BREAKING_NEWS",
      "suggestedFormat": "CAROUSEL",
      "hookIdea": "TypeScript nativo no Node.js finalmente chegou: o que você precisa saber.",
      "baseCopyPrompt": "Carrossel cobrindo as 4 principais mudanças do Node 22.",
      "baseVisualPrompt": "Breaking news badge with dark Node.js green neon aesthetics.",
      "sourceLinks": [],
      "relevanceScore": 97
    }
  ]
}
`.trim();

  try {
    const aiResponse = await executeStructuredPrompt<GeminiTrendingResponse>(prompt);
    
    // Combina as 3 seções garantindo tipagem, categorias e fallback automático
    const rawGeneral = aiResponse.generalTopics || [];
    const rawRepos = aiResponse.trendingRepositories || [];
    const rawNews = aiResponse.techNews || [];
    const rawFallback = aiResponse.topics || [];

    const allRawTopics: Array<RawGeminiTrendingTopic & { finalCategory: string; finalAngle?: string }> = [];

    // 1. Processa Temas Gerais & Arquitetura (Garante 10)
    rawGeneral.slice(0, 10).forEach((t) => {
      allRawTopics.push({ ...t, finalCategory: t.category || "Backend & Arquitetura" });
    });

    // 2. Processa Repositórios em Alta no GitHub (Garante 5)
    rawRepos.forEach((t) => {
      const repoUrl = t.repoUrl || (t.sourceLinks && t.sourceLinks[0]) || "";
      const sourceLinks = repoUrl ? [repoUrl] : (t.sourceLinks || []);
      allRawTopics.push({ ...t, finalCategory: "Repositório GitHub", sourceLinks });
    });

    // Se a IA retornou menos de 5 repositórios, complementa automaticamente com os repositórios reais do scraping
    if (allRawTopics.filter((x) => x.finalCategory === "Repositório GitHub").length < 5 && liveGitHubRepos.length > 0) {
      for (const r of liveGitHubRepos) {
        if (allRawTopics.filter((x) => x.finalCategory === "Repositório GitHub").length >= 5) break;
        const alreadyExists = allRawTopics.some((x) => x.title.toLowerCase().includes(r.name.toLowerCase()));
        if (!alreadyExists) {
          allRawTopics.push({
            title: `${r.name}: ${r.description.slice(0, 80)}`,
            category: "Repositório GitHub",
            finalCategory: "Repositório GitHub",
            summary: r.description || "Biblioteca open-source de alto impacto para desenvolvedores.",
            whyTrending: `${r.stars} estrelas no GitHub com grande tração e crescimento na comunidade.`,
            suggestedAngle: `Dissecar a arquitetura de ${r.name}, por baixo dos panos e como usar em produção.`,
            narrativeAngle: "SENIOR_REVIEW",
            suggestedFormat: "CAROUSEL",
            hookIdea: `Por que este repositório (${r.name}) está ganhando centenas de estrelas no GitHub?`,
            baseCopyPrompt: `Carrossel dissecando o repositório ${r.name} (${r.url}). OBRIGATÓRIO: link na legenda e no último slide.`,
            baseVisualPrompt: `Dark minimalist interface showing GitHub repository header with ${r.stars} stars and syntax highlighted code.`,
            sourceLinks: [r.url],
            repoUrl: r.url,
            relevanceScore: Math.min(99, 92 + Math.floor(Math.random() * 7)),
          });
        }
      }
    }

    // 3. Processa Notícias & Lançamentos Tech (Garante entre 5 a 10)
    rawNews.forEach((t) => {
      allRawTopics.push({
        ...t,
        finalCategory: "Notícias & Lançamentos Tech",
        finalAngle: t.narrativeAngle || "BREAKING_NEWS",
      });
    });

    // Se a IA retornou menos de 5 notícias, complementa automaticamente com as notícias reais do compilador
    if (allRawTopics.filter((x) => x.finalCategory === "Notícias & Lançamentos Tech").length < 5 && liveTechNews.length > 0) {
      for (const n of liveTechNews) {
        if (allRawTopics.filter((x) => x.finalCategory === "Notícias & Lançamentos Tech").length >= 8) break;
        const alreadyExists = allRawTopics.some((x) => x.title.toLowerCase().includes(n.title.toLowerCase().slice(0, 25)));
        if (!alreadyExists) {
          allRawTopics.push({
            title: n.title,
            category: "Notícias & Lançamentos Tech",
            finalCategory: "Notícias & Lançamentos Tech",
            summary: `Notícia e lançamento tech reportado por ${n.source}.`,
            whyTrending: `Destaque e repercussão no ecossistema e fóruns globais de desenvolvimento.`,
            suggestedAngle: `O que muda na prática para o desenvolvedor e o impacto no mercado de software.`,
            narrativeAngle: "BREAKING_NEWS",
            suggestedFormat: "CAROUSEL",
            hookIdea: `O que mudou no ecossistema tech esta semana e por que você precisa saber.`,
            baseCopyPrompt: `Publicação cobrindo a notícia: ${n.title} (Fonte: ${n.source}).`,
            baseVisualPrompt: `Breaking news badge with dark glowing neon aesthetic and tech source citation.`,
            sourceLinks: [n.link],
            relevanceScore: Math.min(98, 88 + Math.floor(Math.random() * 10)),
          });
        }
      }
    }

    // Se a IA respondeu no formato antigo fallback
    if (allRawTopics.length === 0 && rawFallback.length > 0) {
      rawFallback.forEach((t) => {
        allRawTopics.push({ ...t, finalCategory: t.category || "Backend & Arquitetura" });
      });
    }

    if (allRawTopics.length === 0) {
      throw new Error("A IA não retornou tendências nas seções solicitadas.");
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

    for (let i = 0; i < allRawTopics.length; i++) {
      const rt = allRawTopics[i];
      const sourceLinks = Array.isArray(rt.sourceLinks) ? rt.sourceLinks : [];

      const created = await prisma.trendingTopic.create({
        data: {
          id: `trend-${Date.now()}-${i}`,
          title: rt.title,
          category: rt.finalCategory,
          summary: rt.summary,
          whyTrending: rt.whyTrending,
          suggestedAngle: rt.suggestedAngle,
          narrativeAngle: rt.finalAngle || rt.narrativeAngle || "BEFORE_AFTER",
          suggestedFormat: rt.suggestedFormat || "CAROUSEL",
          hookIdea: rt.hookIdea,
          baseCopyPrompt: rt.baseCopyPrompt,
          baseVisualPrompt: rt.baseVisualPrompt,
          sourceLinks,
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

    // Atualiza timestamp nas configurações
    try {
      const { saveSettings } = await import("../config/settings.js");
      await saveSettings({ lastTrendingRefreshedAt: now.toISOString() });
    } catch {}

    console.log(`[TrendingService] ${savedTopics.length} novas tendências salvas (Gerais: ${rawGeneral.length}, Repos: ${rawRepos.length}, Notícias: ${rawNews.length})!`);
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
