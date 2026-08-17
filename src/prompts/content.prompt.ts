export interface StrategyDecisionInput {
  format: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | string;
  topic: string;
  objective: string;
  hook: string;
  reasoning: string;
  suggestedSlot?: string;
  handle?: string;
  ragInsights?: string;
}

export function buildContentGeneratorPrompt(decision: StrategyDecisionInput): string {
  const format = decision.format?.toUpperCase() || "CAROUSEL";
  const handle = decision.handle || "@tech_creator";
  const ragSection = decision.ragInsights ? `\nMEMÓRIA RAG (DIRETRIZES & O QUE EVITAR):\n${decision.ragInsights}\n` : "";

  if (format === "STORY_PHOTO") {
    return `
Você é um estrategista de engajamento e criador de conteúdo sênior no Instagram (${handle}).

Crie um STORY VISUAL DE ALTO IMPACTO E ENGAJAMENTO (EXATAMENTE 1 SLIDE VERTICAL 1080x1920) sobre "${decision.topic}".

DECISÃO DO ESTRATEGISTA:
- Tema: ${decision.topic}
- Objetivo: ${decision.objective}
- Hook: ${decision.hook}
- Raciocínio: ${decision.reasoning}
${ragSection}

ESTRUTURA DO STORY FOTO (1 SLIDE ÚNICO):
1. O Story tem EXATAMENTE 1 SLIDE (formato vertical 9:16 - 1080x1920).
2. O conteúdo deve ser altamente interativo: Caixa de Perguntas temática, Enquete técnica de código ("Qual saída deste código?"), Bastidores/Setup ou Quiz rápido.
3. Texto curto, visual limpo, com espaço central reservado para a caixinha de pergunta ou enquete interativa.
4. Direção visual clara para gerar uma arte vertical escura com tipografia de alta legibilidade.

FORMATO OBRIGATÓRIO (JSON):
{
  "topic": "${decision.topic}",
  "format": "STORY_PHOTO",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "texto do story / instrução para a audiência",
  "hashtags": ["#dev", "#tecnologia", "#programacao"],
  "slides": [
    {
      "number": 1,
      "title": "Título Chamativo do Story",
      "text": "Pergunta central ou tema da enquete para engajar a audiência",
      "visualDirection": "Dark minimalist 9:16 vertical story background (1080x1920) with clean dev aesthetic, code typography and central interactive focus area"
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

ESTRUTURA DO POST SOLO:
1. O post tem exatamente 1 slide/arte visual.
2. A arte deve ser limpa, direta e marcante (ex: terminal com código, comparativo 'certo vs errado', diagrama em bloco ou checklist técnico).
3. A LEGENDA (caption) deve ser aprofundada, explicando o conceito com clareza e convidando ao debate/comentário nos últimos parágrafos.
4. Hashtags técnicas específicas (3 a 5).

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
Você é um roteirista técnico especializado em vídeos curtos e dinâmicos para Reels/TikTok (${handle}).

Crie um ROTEIRO COMPLETO DE REELS (vídeo vertical de 30 a 50 segundos) sobre "${decision.topic}".

DECISÃO DO ESTRATEGISTA:
- Tema: ${decision.topic}
- Objetivo: ${decision.objective}
- Hook de abertura: ${decision.hook}
- Raciocínio: ${decision.reasoning}
${ragSection}

ESTRUTURA OBRIGATÓRIA DO ROTEIRO (CENA A CENA):
- Cena 1 (0-4s): Gancho falado de alto impacto visual e verbal.
- Cena 2 (4-15s): O problema real ou a armadilha comum que programadores cometem.
- Cena 3 (15-35s): A solução técnica prática, o comando ou o código demonstrado.
- Cena 4 (35-45s): Conclusão e CTA direto (ex: "Salva para não esquecer e me segue para mais dicas de dev").

Para compatibilidade estrutural, mapeie as 4 cenas nos slides (cada slide representa uma cena do vídeo com narração falada e direção visual).

FORMATO OBRIGATÓRIO (JSON):
{
  "topic": "${decision.topic}",
  "format": "REEL_SCRIPT",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "legenda do Reels explicando o contexto do vídeo sem hashtags",
  "hashtags": ["#reelsdev", "#programacao", "#tecnologia"],
  "slides": [
    {
      "number": 1,
      "title": "CENA 1 [0-4s]: GANCHO",
      "text": "Narração falada exata da abertura",
      "visualDirection": "O que aparece na tela (ex: terminal piscando, desenvolvedor apontando pro código, texto na tela)"
    },
    {
      "number": 2,
      "title": "CENA 2 [4-15s]: O PROBLEMA",
      "text": "Narração falada explicando a dor/problema",
      "visualDirection": "Direção de câmera e elementos visuais da tela"
    },
    {
      "number": 3,
      "title": "CENA 3 [15-35s]: A SOLUÇÃO",
      "text": "Narração falada mostrando a técnica/código",
      "visualDirection": "Gravação de tela com o código ou terminal executando"
    },
    {
      "number": 4,
      "title": "CENA 4 [35-45s]: CTA FINAL",
      "text": "Narração de encerramento e chamada para ação",
      "visualDirection": "Card final com logotipo ${handle} e chamada para seguir"
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
