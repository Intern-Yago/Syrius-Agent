import { executeStructuredPrompt } from "../core/gemini.js";
import { getBrandInfo } from "../config/brand.js";

export interface GitHubRepoAnalysis {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  readmeSummary: string;
  coreArchitecture: string;
  whyUsefulForDevs: string;
  recommendedFormat: "CAROUSEL" | "REEL_SCRIPT" | "SINGLE_IMAGE";
  recommendationReason: string;
  suggestedAngles: Array<{
    format: "CAROUSEL" | "REEL_SCRIPT" | "SINGLE_IMAGE";
    title: string;
    hook: string;
    reasoning: string;
    baseCopyPrompt: string;
    baseVisualPrompt: string;
    isRecommended?: boolean;
  }>;
}

/**
 * Extrai owner e repo a partir de uma URL ou slug (ex: "facebook/react" ou "https://github.com/shadcn-ui/ui")
 */
export function parseGitHubUrl(urlOrSlug: string): { owner: string; repo: string } | null {
  const clean = urlOrSlug.trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "");
  const parts = clean.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[0], repo: parts[1] };
  }
  return null;
}

/**
 * Inspeciona um repositório do GitHub e gera propostas de post com IA
 */
export async function inspectGitHubRepository(urlOrSlug: string): Promise<GitHubRepoAnalysis> {
  const parsed = parseGitHubUrl(urlOrSlug);
  if (!parsed) {
    throw new Error("URL ou identificador do GitHub inválido. Use o formato 'usuario/repositorio' ou a URL completa.");
  }

  const { owner, repo } = parsed;
  const brand = await getBrandInfo();

  // 1. Busca metadados do repositório via API pública do GitHub
  let repoData: any = {};
  try {
    const apiRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "User-Agent": "Syrius-Agent-AI",
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!apiRes.ok) {
      if (apiRes.status === 404) {
        throw new Error(`Repositório "${owner}/${repo}" não encontrado ou privado.`);
      }
      throw new Error(`GitHub API retornou status ${apiRes.status}`);
    }

    repoData = await apiRes.json();
  } catch (err: any) {
    console.warn(`[GitHubRepoService] Erro ao consultar API GitHub: ${err.message}. Tentando scraping de README...`);
  }

  const defaultBranch = repoData.default_branch || "main";

  // 2. Busca o conteúdo do README.md
  let readmeText = "";
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/README.md`);
    if (rawRes.ok) {
      readmeText = await rawRes.text();
    } else {
      // Tenta fallback com branch master
      const rawMasterRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`);
      if (rawMasterRes.ok) {
        readmeText = await rawMasterRes.text();
      }
    }
  } catch (err) {
    console.warn("[GitHubRepoService] Não foi possível obter o README.md completo.");
  }

  // Trunca README para caber no contexto de tokens com máxima densidade
  const truncatedReadme = readmeText.slice(0, 7000);

  const prompt = `
Você é o Chief Developer Advocate e Engenheiro de Software Sênior do perfil ${brand.handle}.

Sua missão é dissecar este repositório do GitHub e transformá-lo em CONTEÚDO TÉCNICO DE ALTÍSSIMO VALOR E RETENÇÃO para desenvolvedores no Instagram.

DADOS DO REPOSITÓRIO:
- Repositório: ${owner}/${repo}
- Descrição: ${repoData.description || "Sem descrição oficial"}
- Estrelas (Stars): ${repoData.stargazers_count || 0}
- Linguagem Principal: ${repoData.language || "Tech Geral"}
- Tópicos/Tags: ${(repoData.topics || []).join(", ") || "dev, open-source"}

README.MD (TRECHO TÉCNICO):
${truncatedReadme || "README indisponível. Analise com base no nome e tecnologias do repositório."}

TAREFA:
1. Resuma a essência do projeto e o que ele resolve para engenheiros de software.
2. Explique a arquitetura / diferencial técnico ("Por debaixo dos panos").
3. Crie 3 propostas de post especializadas:
   - Uma proposta de CARROSSEL TÉCNICO (1080x1350)
   - Uma proposta de REELS COM VS CODE ANIMADO (1080x1920)
   - Uma proposta de POST SOLO / SINGLE IMAGE (1080x1350)

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "owner": "${owner}",
  "name": "${repo}",
  "fullName": "${owner}/${repo}",
  "description": "${repoData.description || ""}",
  "stars": ${repoData.stargazers_count || 0},
  "forks": ${repoData.forks_count || 0},
  "language": "${repoData.language || "TypeScript"}",
  "topics": ${JSON.stringify(repoData.topics || ["open-source", "dev"])},
  "readmeSummary": "Resumo objetivo e envolvente do que a biblioteca/ferramenta faz",
  "coreArchitecture": "Explicação técnica de como funciona por debaixo dos panos (performance, patterns, inovação)",
  "whyUsefulForDevs": "Por que todo desenvolvedor deveria conhecer ou usar em seus projetos",
  "recommendedFormat": "CAROUSEL",
  "recommendationReason": "Justificativa estratégica do por que este formato específico gerará o maior impacto de retenção/salvamentos para este repositório",
  "suggestedAngles": [
    {
      "format": "CAROUSEL",
      "title": "Título técnico provocativo do Carrossel",
      "hook": "Gancho do primeiro slide",
      "reasoning": "Por que este carrossel vai reter a audiência e gerar salvamentos",
      "baseCopyPrompt": "Diretriz completa de roteiro slide a slide para o redator",
      "baseVisualPrompt": "Diretriz de arte com estética dark glass e código syntax highlighted",
      "isRecommended": true
    },
    {
      "format": "REEL_SCRIPT",
      "title": "Título provocativo do Reels",
      "hook": "Primeiras palavras faladas no vídeo",
      "reasoning": "Por que este vídeo tem potencial viral de topo de funil",
      "baseCopyPrompt": "ROTEIRO EM 4 CENAS ESPECÍFICAS DE REPOSITÓRIO GITHUB:\\n- Cena 1 [0-5s]: Apresentação do Repositório github.com/${owner}/${repo} (${repoData.stargazers_count || 0} stars) e o problema crítico que ele resolve.\\n- Cena 2 [5-15s]: Leitura da Documentação e Arquitetura: como funciona por debaixo dos panos e qual o diferencial de engenharia.\\n- Cena 3 [15-35s]: Demonstração Prática: instalação e código de exemplo rodando com a funcionalidade em ação.\\n- Cena 4 [35-45s]: Veredito Técnico e CTA de salvamento.",
      "baseVisualPrompt": "Interface híbrida alternando entre cabeçalho do GitHub, trechos da documentação README.md e editor VS Code com código real syntax-highlighted",
      "isRecommended": false
    },
    {
      "format": "SINGLE_IMAGE",
      "title": "Título direto do Post Solo",
      "hook": "Gancho da imagem",
      "reasoning": "Por que este post solo gera compartilhamentos rápidos",
      "baseCopyPrompt": "Legenda aprofundada dissecando o conceito do repositório ${owner}/${repo} com comando de instalação e arquitetura",
      "baseVisualPrompt": "Terminal dark com snippet direto e comparativo de velocidade",
      "isRecommended": false
    }
  ]
}
`.trim();

  const analysis = await executeStructuredPrompt<GitHubRepoAnalysis>(prompt);
  return {
    ...analysis,
    owner,
    name: repo,
    fullName: `${owner}/${repo}`,
    stars: repoData.stargazers_count || analysis.stars || 0,
    forks: repoData.forks_count || analysis.forks || 0,
    language: repoData.language || analysis.language || "TypeScript",
  };
}
