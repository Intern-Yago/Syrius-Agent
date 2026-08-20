export interface StrategyDecisionInput {
  format: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | string;
  topic: string;
  objective: string;
  hook: string;
  reasoning: string;
  suggestedSlot?: string;
  handle?: string;
  ragInsights?: string;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
}

export function buildContentGeneratorPrompt(decision: StrategyDecisionInput): string {
  const format = decision.format?.toUpperCase() || "CAROUSEL";
  const handle = decision.handle || "@tech_creator";
  const ragSection = decision.ragInsights ? `\nMEMÓRIA RAG (DIRETRIZES & O QUE EVITAR):\n${decision.ragInsights}\n` : "";
  const basePromptsSection = (decision.baseCopyPrompt || decision.baseVisualPrompt) ? `
DIRETRIZES ESTRATÉGICAS BASE (SUGERIDAS PELO ANALYTICS / GESTOR IA):
${decision.baseCopyPrompt ? `- ROTEIRO & DIRETRIZ BASE DE CONTEÚDO: "${decision.baseCopyPrompt}"` : ""}
${decision.baseVisualPrompt ? `- DIRETRIZ VISUAL & ESTÉTICA BASE: "${decision.baseVisualPrompt}"` : ""}
(Utilize estas diretrizes base como ponto de partida sólido, aprofundando os detalhes técnicos, aperfeiçoando o gancho e garantindo máxima densidade prática!)
` : "";

  if (format === "STORY_PHOTO" || format === "STORY" || format === "STORIES") {
    return `
Você é um estrategista sênior de engajamento e retenção no Instagram (${handle}).

Crie um STORY VERTICAL DE ALTO ENGAJAMENTO (1080x1920 - Proporção 9:16) sobre "${decision.topic}".

DECISÃO DO ESTRATEGISTA:
- Tema: ${decision.topic}
- Objetivo: ${decision.objective}
- Hook: ${decision.hook}
- Raciocínio: ${decision.reasoning}
${ragSection}
${basePromptsSection}

DIRETRIZES DE FORMATO DO STORY (BAIXÍSSIMA FRICÇÃO & MÁXIMA INTERAÇÃO):
1. O Story deve focar em interação instantânea de 1 toque ou consumo rápido de código:
   * **Quiz Técnico de Código (1 clique):** Ex: "Qual a saída deste código em TypeScript/Node?" com opções [A], [B], [C] claramente visíveis na arte para o usuário votar.
   * **Enquete Técnica Binária:** Ex: "Você usa Monólito Modular ou Microsserviços em 2026?" com pergunta provocativa no topo e espaço para sticker de enquete [Sim/Não] ou [Opção A / Opção B].
   * **Bastidores & Terminal Dev:** Print estético de código, erro de compilação ou dica de terminal rápida.
   * **Pílula Rápida de Dev:** Dica em 1 tela objetiva com snippet de código limpo.
   * **Ponte de Conteúdo:** Conexão chamando a audiência para aprofundar no post do Feed/Reel do dia.
   * **Caixa de Perguntas Contextualizada:** Apenas se o tema exigir debate aberto profundo.
2. Layout vertical 9:16 (1080x1920) escuro, com tipografia legível e espaço bem distribuído para stickers de interação.

FORMATO OBRIGATÓRIO (JSON):
{
  "topic": "${decision.topic}",
  "format": "STORY_PHOTO",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "texto de apoio e instrução para sticker",
  "hashtags": ["#dev", "#tecnologia", "#programacao"],
  "slides": [
    {
      "number": 1,
      "title": "Título Chamativo ou Pergunta do Quiz",
      "text": "Código ou conteúdo do desafio com opções de resposta claras",
      "visualDirection": "Dark minimalist 9:16 vertical background (1080x1920), crisp syntax highlighted code card, professional dev aesthetic with dedicated bottom area for interactive sticker"
    }
  ]
}
`.trim();
  }

  if (format === "SINGLE_IMAGE") {
    return `
Você é um redator técnico e criador de conteúdo sênior no Instagram (${handle}).

Crie uma publicação de POST SOLO (SINGLE IMAGE 1080x1350) de alto impacto sobre "${decision.topic}".

DECISÃO DO ESTRATEGISTA:
- Tema: ${decision.topic}
- Objetivo: ${decision.objective}
- Hook: ${decision.hook}
- Raciocínio: ${decision.reasoning}
${ragSection}
${basePromptsSection}

ESTRUTURA DO POST SOLO:
1. O post tem exatamente 1 slide/arte visual.
2. A arte deve ser limpa, direta e marcante (ex: terminal com código, comparativo 'certo vs errado', diagrama em bloco ou checklist técnico).
3. A LEGENDA (caption) deve ser aprofundada, explicando o conceito com clareza e convidando ao debate/comentário nos últimos parágrafos.
4. Hashtags técnicas específicas (3 a 5).
5. PROIBIDO emojis no texto gerado, legendas, títulos ou slides.

FORMATO OBRIGATÓRIO (JSON):
{
  "topic": "${decision.topic}",
  "format": "SINGLE_IMAGE",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "legenda completa e densa sem hashtags",
  "hashtags": ["#programacao", "#tecnologia", "#desenvolvimento"],
  "slides": [
    {
      "number": 1,
      "title": "título principal da arte",
      "text": "conteúdo central ou código que deve aparecer na imagem",
      "visualDirection": "descrição visual detalhada para o gerador de imagem (composição, diagrama, cores e elementos técnicos)"
    }
  ]
}
`.trim();
  }

  if (format === "REEL_SCRIPT") {
    return `
Você é um roteirista técnico sênior e estrategista de viralidade para Instagram Reels e TikTok (${handle}).

Crie um ROTEIRO DE REELS DE ALTO IMPACTO (vídeo vertical de 30 a 50 segundos) com LEGENDA EDITORIAL DENSA sobre "${decision.topic}".

DECISÃO DO ESTRATEGISTA:
- Tema: ${decision.topic}
- Objetivo: ${decision.objective}
- Hook de abertura: ${decision.hook}
- Raciocínio: ${decision.reasoning}
${ragSection}
${basePromptsSection}

ESTRUTURA OBRIGATÓRIA DO ROTEIRO (CENA A CENA):
- Cena 1 (0-4s): Gancho falado magnético (primeiras palavras decisivas para reter o scroll nos 3 primeiros segundos).
- Cena 2 (4-15s): O problema real, a dor do desenvolvedor ou a armadilha comum que quebra em produção.
- Cena 3 (15-35s): A solução técnica prática, o comando ou o código demonstrado na tela do VS Code.
- Cena 4 (35-45s): Conclusão com moral técnica e CTA direto.

DIRETRIZES DE LOCUÇÃO HUMANA (VOZ NATURAL E EXPRESSIVA):
1. O campo "text" será lido diretamente pela IA de voz neural. Escreva EXATAMENTE como um desenvolvedor sênior conversa amigavelmente com outro.
2. PROIBIDO termos mecânicos como "P-O-V", "C-T-A" ou "Hook". Substitua por frases naturais como "Sabe quando você...", "Se liga nisso aqui...", "Olha o que acontece se você fizer isso...".
3. Use pontuação para respiração: inclua reticências (...) para pausas naturais e ritmo envolvente.
4. Mantenha energia alta, sem enrolação e focado na prática.

DIRETRIZES DE LEGENDA DO REELS (CAPTION DE ALTA RETENÇÃO E SALVAMENTOS):
A legenda do Reels NÃO deve ser genérica! O algoritmo do Instagram valoriza Reels com legendas completas que fazem o usuário pausar o vídeo para ler:
1. Linha 1: Gancho magnético provocativo.
2. Parágrafo 1: O contexto do problema e por que a maioria erra nisso.
3. Bloco de Código / Passo a Passo: Coloque os comandos ou código exato na legenda para que o usuário copie facilmente.
4. Pro-Tip de Engenharia: Uma dica bônus exclusiva de bastidores.
5. CTA forte: "Salve para consultar no seu próximo deploy | Compartilhe com quem programa com você | Siga ${handle} para dominar engenharia de software na prática".
6. IMPORTANTE: NÃO use emojis no texto gerado nem na legenda. Mantenha estilo limpo e profissional.

FORMATO OBRIGATÓRIO (JSON):
{
  "topic": "${decision.topic}",
  "format": "REEL_SCRIPT",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "Gancho da legenda em 1 linha\\n\\nContexto do problema explicado com clareza técnica...\\n\\nComo aplicar:\\n1. Primeiro passo ou comando\\n2. Segundo passo ou configuração\\n\\nPro-Tip de Engenharia:\\nInsight sênior de produção.\\n\\nSalve este Reel para não esquecer na hora de codar e siga ${handle}!",
  "hashtags": ["#programacao", "#desenvolvimento", "#dev", "#softwareengineer", "#tecnologia"],
  "slides": [
    {
      "number": 1,
      "title": "CENA 1 [0-4s]: GANCHO",
      "text": "Narração falada da abertura provocativa",
      "visualDirection": "VS Code dark minimalista com erro no terminal ou código em destaque"
    },
    {
      "number": 2,
      "title": "CENA 2 [4-15s]: O PROBLEMA",
      "text": "Narração falada explicando a dor real do dev",
      "visualDirection": "Digitação do teste ou cenário problemático no editor de código"
    },
    {
      "number": 3,
      "title": "CENA 3 [15-35s]: A SOLUÇÃO",
      "text": "Narração falada demonstrando a refatoração e boas práticas",
      "visualDirection": "Refatoração limpa sendo digitada e testes passando em verde no terminal"
    },
    {
      "number": 4,
      "title": "CENA 4 [35-45s]: CTA FINAL",
      "text": "Narração de fechamento convidando a salvar e seguir",
      "visualDirection": "Terminal com build bem-sucedido e branding oficial ${handle}"
    }
  ]
}
`.trim();
  }

  // Padrão: CAROUSEL (Dinâmico: 4 a 8 Slides conforme profundidade técnica)
  return `
Você é um redator técnico sênior especializado em criar carrosséis de alto valor para desenvolvedores no Instagram (${handle}).

Transforme a decisão estratégica em um CARROSSEL técnico com a QUANTIDADE IDEAL DE SLIDES (entre 4 e 8 slides, a seu critério técnico baseado na densidade do tema).

DECISÃO DO ESTRATEGISTA:
- Tema: ${decision.topic}
- Objetivo: ${decision.objective}
- Hook: ${decision.hook}
- Raciocínio: ${decision.reasoning}
${ragSection}
${basePromptsSection}

DIRETRIZES DE ESTRUTURA DO CARROSSEL:
- Slide 1: Hook direto e instigante. Apresenta o problema ou benefício real.
- Slides Intermediários (Slide 2 até N-1): Desenvolvimento progressivo, didático e prático com exemplos de código, comparações 'certo vs errado' ou boas práticas.
- Slide Final (Slide N): Conclusão, resumo prático e CTA técnico de alto valor.

REGRAS:
1. Escolha a quantidade de slides (4, 5, 6, 7 ou 8) ideal para cobrir o assunto sem enrolação.
2. Precisão técnica máxima em comandos e conceitos.
3. visualDirection em cada slide detalhando a composição visual e elementos de tela.
4. Legenda (caption) complementar que contextualiza o assunto.
5. NÃO coloque hashtags na legenda nem nos slides.
6. Hashtags separadas (3 a 6 hashtags técnicas).
7. PROIBIDO emojis no texto gerado, legendas, títulos ou slides. Mantenha tom técnico e minimalista.

FORMATO OBRIGATÓRIO (JSON):
{
  "topic": "${decision.topic}",
  "format": "CAROUSEL",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "legenda completa e contextualizada sem hashtags",
  "hashtags": ["#programacao", "#tecnologia", "#desenvolvimento"],
  "slides": [
    {
      "number": 1,
      "title": "título do slide 1",
      "text": "texto explicativo do slide 1",
      "visualDirection": "descrição visual detalhada para a arte"
    },
    {
      "number": 2,
      "title": "título do slide 2",
      "text": "texto explicativo do slide 2",
      "visualDirection": "descrição visual detalhada para a arte"
    }
  ]
}
`.trim();
}
