import { executeStructuredPrompt } from "../core/gemini.js";

export type SceneLayoutType = "CODE_EDITOR" | "BROWSER_MOCKUP" | "TERMINAL_CLI" | "TECH_NEWS" | "OUTPUT_SHOWCASE" | "ALT_TAB_SWITCHING";

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
 * Agente 05b — Diretor de Storyboard & Screenplay Visual AI.
 * Analisa semanticamente a locução falada e decupa 4 cenas visuais com ritmo cinematográfico.
 */
export async function generateReelsCodeScenes(params: {
  topic: string;
  caption?: string;
  slides: { number: number; title: string; text: string }[];
}): Promise<ReelsCodeScene[]> {
  const { topic, caption, slides } = params;

  const prompt = `
Você é o Diretor Criativo de Storyboard e Motion Design do perfil de tecnologia @syrius_tech.

Sua missão é realizar a DECUPAGEM VISUAL DE CENA para um vídeo vertical de alta retenção no Instagram Reels (1080x1920).
Você NÃO deve agir como um robô que repete a mesma tela estática. Você é um DIRETOR DE CINEMA TECH: cada segundo visual na tela deve ilustrar com perfeição exatamente o que a voz neural está narrando naquele momento.

TEMA DO VÍDEO:
"${topic}"

ROTEIRO DA LOCUÇÃO POR CENA:
${slides.map((s) => `CENA ${s.number} (Áudio): "${s.title} - ${s.text}"`).join("\n")}

${caption ? `LEGENDA COMPLETA:\n${caption}` : ""}

CATÁLOGO DE LAYOUTS VISUAIS DO DIRETOR:
1. "ALT_TAB_SWITCHING": Interface de navegador com abas abertas alternando rapidamente (ChatGPT, Docs, StackOverflow, Editor) e alertas de perda de foco. (OBRIGATÓRIO quando a locução falar de Alt-Tab, perda de contexto, distração com navegador ou troca de janelas).
2. "BROWSER_MOCKUP": Janela de navegador com URL da ferramenta/GitHub e documentação web (Ideal quando a voz apresentar uma ferramenta, site, repositório ou release).
3. "TERMINAL_CLI": Janela de Terminal Zsh/Warp moderna com prompts ($ aider, $ claude, ➜ git), logs e diffs coloridos (Ideal quando a voz falar de comandos, execução rápida, ferramentas CLI ou automação).
4. "CODE_EDITOR": Janela de editor VS Code com código syntax-highlighted e números de linha (Ideal quando a voz falar de código real, sintaxe, refatoração e testes).
5. "TECH_NEWS": Cartão de Notícia Tech com manchete impactante e alertas de quebra de paradigma (Ideal para o gancho inicial ou novidades bombásticas).
6. "OUTPUT_SHOWCASE": Tela de resultado prático gerado pela ferramenta, benchmark comparativo, tempo economizado e veredito sênior com CTA (Ideal para o fechamento da Cena 4).

DIRETRIZES DO DIRETOR DE CENA:
- Faça o CASAMENTO PERFEITO entre o que a voz está dizendo e o que os olhos estão vendo:
  * Exemplo: Se o áudio fala "Você perde tempo dando Alt-Tab pro ChatGPT" -> Cena 1 DEVE SER "ALT_TAB_SWITCHING" com badge "CONTEXT SWITCHING" e alerta visual de perda de foco.
  * Se o áudio em seguida diz "Com essa ferramenta de IA direto no terminal..." -> Cena 2 DEVE TRANSICIONAR para "TERMINAL_CLI" mostrando o prompt $ rodando sem sair da IDE.
  * Se o áudio diz "Ela refatora sua função e roda os testes..." -> Cena 3 DEVE TRANSICIONAR para "CODE_EDITOR" ou "TERMINAL_CLI" com diffs verdes/vermelhos.
  * Se o áudio encerra com "Você economiza 2h por dia, salve pra testar..." -> Cena 4 DEVE SER "OUTPUT_SHOWCASE" com "+2h/dia economizadas" e CTA.
- Cada linha de código ou texto DEVE TER NO MÁXIMO 42 CARACTERES.
- Não use emojis nos blocos de código.
- REGRA OBRIGATÓRIA PARA OUTPUT_SHOWCASE (Última Cena / Veredito):
  * "headline": Deve ser um resumo impactante ESPECÍFICO DO TEMA (ex: "Node.js 22 LTS: O que muda", "Clean Code: Zero Try/Catch Aninhados").
  * "metrics": OBRIGATÓRIO conter 2 cards de métricas/destaques reais do tema (ex: [{"label": "VERSÃO", "value": "v22 LTS"}, {"label": "SUPORTE TS", "value": "100% Nativo"}] ou [{"label": "LEGIBILIDADE", "value": "+85%"}, {"label": "LINHAS DE CÓDIGO", "value": "-40%"}]).
  * "lines": OBRIGATÓRIO conter 3 a 4 bullet points resumindo os maiores aprendizados ou takeaways reais do tema.

RETORNE EXCLUSIVAMENTE NO FORMATO JSON ABAIXO:
{
  "scenes": [
    {
      "layout": "TECH_NEWS | ALT_TAB_SWITCHING | TERMINAL_CLI | CODE_EDITOR | BROWSER_MOCKUP | OUTPUT_SHOWCASE",
      "badge": "BREAKING UPDATE | VEREDITO SYRIUS TECH | GUIA PRÁTICO",
      "badge_color": "#c084fc",
      "header_title": "título curto do cabeçalho",
      "headline": "Manchete impactante específica do tema",
      "tag": "VERDICT",
      "metrics": [
        { "label": "DESTAQUE 1", "value": "v22.0 LTS" },
        { "label": "DESTAQUE 2", "value": "100% Nativo" }
      ],
      "lines": [
        "Primeiro ponto chave do aprendizado",
        "Segundo ponto chave do aprendizado",
        "Terceiro ponto chave do aprendizado"
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
