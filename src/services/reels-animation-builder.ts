import { executeStructuredPrompt } from "../core/gemini.js";

export type SceneLayoutType = "CODE_EDITOR" | "BROWSER_MOCKUP" | "TERMINAL_CLI" | "TECH_NEWS" | "OUTPUT_SHOWCASE";

export interface ReelsCodeScene {
  layout?: SceneLayoutType;
  badge: string;
  badge_color: string;
  file_name?: string;
  header_title?: string;
  headline?: string;
  tag?: string;
  metrics?: { label: string; value: string }[];
  lines: string[];
}

export interface ReelsScenesResponse {
  scenes: ReelsCodeScene[];
}

/**
 * Gera 4 cenas dinâmicas (Código, Notícia, Terminal ou Navegador) para o renderizador de Reels.
 */
export async function generateReelsCodeScenes(params: {
  topic: string;
  caption?: string;
  slides: { number: number; title: string; text: string }[];
}): Promise<ReelsCodeScene[]> {
  const { topic, caption, slides } = params;

  const prompt = `
Você é o Diretor Criativo e Engenheiro de Software Sênior do perfil de tecnologia @syrius_tech.

Sua missão é gerar 4 CENAS VISUAIS DINÂMICAS PARA UM VÍDEO VERTICAL DE REELS (1080x1920).

TEMA DO VÍDEO:
"${topic}"

ROTEIRO DAS CENAS:
${slides.map((s) => `CENA ${s.number}: ${s.title} - ${s.text}`).join("\n")}

${caption ? `LEGENDA:\n${caption}` : ""}

SISTEMA DE MULTI-LAYOUTS VISUAIS (ESCOLHA O LAYOUT IDEAL PARA CADA CENA):
Você tem 5 tipos de layout disponíveis:
1. "CODE_EDITOR": Janela VS Code escura com código syntax-highlighted (Ideal para tutoriais e refatoração).
2. "BROWSER_MOCKUP": Janela de navegador com URL da ferramenta, botões e visual de WebUI/Doc (Ideal para ferramentas, docs e anúncios).
3. "TERMINAL_CLI": Janela de terminal com comandos ($ npx, $ docker), logs coloridos e progresso (Ideal para DevOps, CLI e instalação).
4. "TECH_NEWS": Cartão de Notícia Tech com manchete impactante, métricas grandes e destaques (Ideal para lançamentos, notícias e quebras de segurança).
5. "OUTPUT_SHOWCASE": Tela de resultado prático gerado pela ferramenta ou benchmark comparativo.

REGRAS DE CONTEÚDO:
1. NÃO use emojis nas linhas de código nem nos títulos.
2. Cada linha de texto/código DEVE TER NO MÁXIMO 40 CARACTERES.
3. Cada cena deve ter entre 4 e 7 linhas informativas ou de código.

RETORNE EXCLUSIVAMENTE NO FORMATO JSON ABAIXO:
{
  "scenes": [
    {
      "layout": "TECH_NEWS",
      "badge": "LANCAMENTO OFICIAL",
      "badge_color": "#38bdf8",
      "header_title": "tech.news / release",
      "headline": "Título curto e provocativo da notícia",
      "tag": "NEWS_ALERT",
      "metrics": [
        { "label": "Impacto", "value": "70% mais rapido" }
      ],
      "lines": [
        "Lancamento oficial da nova release",
        "Reducao drastica de latencia",
        "Suporte nativo a novas arquiteturas",
        "Disponivel para todos os desenvolvedores"
      ]
    },
    {
      "layout": "BROWSER_MOCKUP",
      "badge": "ARQUITETURA E DOC",
      "badge_color": "#a855f7",
      "header_title": "https://github.com/projeto/repo",
      "headline": "Por debaixo dos panos",
      "tag": "DOCS",
      "lines": [
        "// Documentacao Oficial",
        "Engine reconstruida do zero",
        "Execucao assincrona com zero-copy",
        "Compatibilidade total com TypeScript"
      ]
    },
    {
      "layout": "TERMINAL_CLI",
      "badge": "INSTALACAO RAPIDA",
      "badge_color": "#10b981",
      "header_title": "bash - dev terminal",
      "headline": "Como rodar hoje",
      "tag": "CLI_DEMO",
      "lines": [
        "$ npx create-turbo-app@latest",
        "[+] Download de pacotes concluido",
        "[+] Build concluido em 420ms",
        "[✓] Servidor rodando em localhost:3000"
      ]
    },
    {
      "layout": "OUTPUT_SHOWCASE",
      "badge": "VEREDITO SENIOR",
      "badge_color": "#38bdf8",
      "header_title": "verdict.log",
      "headline": "Conclusao tecnica",
      "tag": "VERDICT",
      "lines": [
        "Vale a pena migrar em projetos novos",
        "Performance comprovada em producao",
        "Link oficial do repo na legenda",
        "Salve este Reel para testar depois"
      ]
    }
  ]
}
`.trim();

  try {
    const res = await executeStructuredPrompt<ReelsScenesResponse>(prompt);
    if (res?.scenes && Array.isArray(res.scenes) && res.scenes.length >= 2) {
      return res.scenes.map((s) => ({
        layout: s.layout || "CODE_EDITOR",
        badge: s.badge || "DEV INSIGHT",
        badge_color: s.badge_color || "#38bdf8",
        file_name: s.file_name || s.header_title || "main.ts",
        header_title: s.header_title || s.file_name || "https://syrius.dev",
        headline: s.headline,
        tag: s.tag || "CODE",
        metrics: s.metrics || [],
        lines: s.lines.flatMap((line) => {
          if (line.length <= 42) return [line];
          const words = line.split(" ");
          const wrapped: string[] = [];
          let cur = "";
          for (const w of words) {
            if (!cur) {
              cur = w;
            } else if (cur.length + 1 + w.length <= 40) {
              cur += " " + w;
            } else {
              wrapped.push(cur);
              cur = "  " + w;
            }
          }
          if (cur) wrapped.push(cur);
          return wrapped;
        }),
      }));
    }
  } catch (err) {
    console.error("[generateReelsCodeScenes] Falha ao gerar cenas com IA:", err);
  }

  // Fallback estruturado
  return [
    {
      layout: "TECH_NEWS",
      badge: "ALERTA TECH",
      badge_color: "#38bdf8",
      header_title: "syrius.dev / news",
      headline: topic.slice(0, 38),
      lines: [
        `Assunto: ${topic.slice(0, 36)}`,
        "Impacto direto na arquitetura de software",
        "Mudanca de paradigma para desenvolvedores",
        "Acompanhe os detalhes da implementacao",
      ],
    },
    {
      layout: "BROWSER_MOCKUP",
      badge: "ARQUITETURA",
      badge_color: "#a855f7",
      header_title: "https://docs.dev/architecture",
      lines: [
        "// Analise da Documentacao",
        "Isolamento de memoria e alta concorrencia",
        "Zero dependencias desnecessarias",
        "Padrao recomendado para 2026",
      ],
    },
    {
      layout: "TERMINAL_CLI",
      badge: "COMO EXECUTAR",
      badge_color: "#10b981",
      header_title: "terminal - bash",
      lines: [
        "$ npm install @core/engine",
        "[+] Dependencias instaladas",
        "[✓] Testes executados com sucesso",
      ],
    },
    {
      layout: "OUTPUT_SHOWCASE",
      badge: "VEREDITO",
      badge_color: "#38bdf8",
      header_title: "verdict.log",
      lines: [
        "Excelente opcao para alta performance",
        "Consulte os detalhes na legenda",
        "Salve para nao esquecer",
      ],
    },
  ];
}
