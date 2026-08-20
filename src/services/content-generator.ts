import { GoogleGenAI } from "@google/genai";
import type { ContentDecision } from "./content-strategist";

export function getGeneratorModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
}

const MAX_OUTPUT_TOKENS = 12000;

export interface GeneratedSlide {
  number: number;
  title: string;
  text: string;
  visualDirection: string;
}

export interface GeneratedPostContent {
  topic: string;
  format: "CAROUSEL";
  objective: string;
  hook: string;

  /**
   * Legenda principal.
   *
   * NÃO contém hashtags.
   */
  caption: string;

  /**
   * Hashtags geradas pela IA.
   */
  hashtags: string[];

  slides: GeneratedSlide[];
}

/*
 * ==========================================
 * DEBUG
 * ==========================================
 */

function printRawAIResponse(
  text: string | undefined
): void {
  console.error("");
  console.error("=================================");
  console.error("🤖 RESPOSTA BRUTA DA IA");
  console.error("=================================");
  console.error("");

  if (!text) {
    console.error("[RESPOSTA VAZIA]");
  } else {
    console.error(text);
  }

  console.error("");

  console.error("=================================");
}

/*
 * ==========================================
 * DIAGNÓSTICO
 * ==========================================
 */

function inspectAIResponse(
  text: string | undefined,
  response: unknown
): void {
  console.error("");
  console.error("=================================");
  console.error("🔍 DIAGNÓSTICO DA RESPOSTA");
  console.error("=================================");

  if (!text) {
    console.error("Caracteres recebidos: 0");
    console.error("Resposta vazia: SIM");
  } else {
    const trimmed = text.trim();

    console.error(
      `Caracteres recebidos: ${trimmed.length}`
    );

    console.error(
      `Começa com "{": ${trimmed.startsWith("{")}`
    );

    console.error(
      `Termina com "}": ${trimmed.endsWith("}")}`
    );

    console.error(
      `Quantidade de "{": ${
        (trimmed.match(/{/g) || []).length
      }`
    );

    console.error(
      `Quantidade de "}": ${
        (trimmed.match(/}/g) || []).length
      }`
    );

    console.error(
      `Quantidade de "[": ${
        (trimmed.match(/\[/g) || []).length
      }`
    );

    console.error(
      `Quantidade de "]": ${
        (trimmed.match(/\]/g) || []).length
      }`
    );
  }

  if (
    response &&
    typeof response === "object"
  ) {
    const responseObject =
      response as Record<string, unknown>;

    console.error("");

    if ("responseId" in responseObject) {
      console.error(
        `responseId: ${String(
          responseObject.responseId
        )}`
      );
    }

    if ("usageMetadata" in responseObject) {
      console.error(
        "usageMetadata:"
      );

      try {
        console.error(
          JSON.stringify(
            responseObject.usageMetadata,
            null,
            2
          )
        );
      } catch {
        console.error(
          responseObject.usageMetadata
        );
      }
    }

    if ("candidates" in responseObject) {
      console.error(
        "candidates:"
      );

      try {
        console.error(
          JSON.stringify(
            responseObject.candidates,
            null,
            2
          )
        );
      } catch {
        console.error(
          responseObject.candidates
        );
      }
    }
  }

  console.error("");
  console.error(
    "Possíveis causas:"
  );

  console.error(
    "- resposta truncada pelo limite de saída"
  );

  console.error(
    "- limite/quota da API"
  );

  console.error(
    "- resposta bloqueada por segurança"
  );

  console.error(
    "- erro temporário da API"
  );

  console.error(
    "- JSON gerado incorretamente pelo modelo"
  );

  console.error("");
}

/*
 * ==========================================
 * EXTRAÇÃO DO JSON
 * ==========================================
 */

function extractJsonObject(
  text: string
): string {
  const cleaned =
    text
      .trim()
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/i,
        ""
      )
      .replace(
        /\s*```$/i,
        ""
      )
      .trim();

  const firstBrace =
    cleaned.indexOf("{");

  if (firstBrace === -1) {
    throw new Error(
      "A IA não retornou nenhum objeto JSON."
    );
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (
    let i = firstBrace;
    i < cleaned.length;
    i++
  ) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (
      char === "\\" &&
      insideString
    ) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      insideString =
        !insideString;

      continue;
    }

    if (insideString) {
      continue;
    }

    if (char === "{") {
      depth++;
    }

    if (char === "}") {
      depth--;

      if (depth === 0) {
        return cleaned.slice(
          firstBrace,
          i + 1
        );
      }
    }
  }

  throw new Error(
    "A IA iniciou um objeto JSON, mas não fechou corretamente."
  );
}

/*
 * ==========================================
 * NORMALIZA HASHTAGS
 * ==========================================
 */

function normalizeHashtags(
  hashtags: unknown
): string[] {
  if (!Array.isArray(hashtags)) {
    return [];
  }

  return hashtags
    .filter(
      (hashtag): hashtag is string =>
        typeof hashtag === "string"
    )
    .map((hashtag) =>
      hashtag.trim()
    )
    .filter(Boolean)
    .map((hashtag) => {
      if (
        hashtag.startsWith("#")
      ) {
        return hashtag;
      }

      return `#${hashtag}`;
    })
    .filter(
      (hashtag) =>
        /^#[\p{L}\p{N}_]+$/u.test(
          hashtag
        )
    )
    .slice(0, 6);
}

/*
 * ==========================================
 * GERADOR
 * ==========================================
 */

export async function generatePostContent(
  apiKey: string,
  decision: ContentDecision
): Promise<GeneratedPostContent> {
  if (!decision) {
    throw new Error(
      "generatePostContent recebeu uma decisão inválida."
    );
  }

  if (
    decision.format !==
    "CAROUSEL"
  ) {
    throw new Error(
      `O formato "${decision.format}" ainda não possui gerador de conteúdo implementado. ` +
      `Por enquanto, o pipeline de produção suporta apenas CAROUSEL.`
    );
  }

  if (!apiKey) {
    throw new Error(
      "API Key do Gemini não foi fornecida."
    );
  }

  console.log(
    "✍️ Iniciando Content Generator..."
  );

  const ai =
    new GoogleGenAI({
      apiKey,
    });

  const prompt = `
Você é um redator técnico profissional especializado em conteúdo
para Instagram de tecnologia.

Sua tarefa é transformar uma decisão estratégica em um CARROSSEL
completo e pronto para produção.

DECISÃO DO ESTRATEGISTA:

FORMATO:
${decision.format}

TEMA:
${decision.topic}

OBJETIVO:
${decision.objective}

HOOK:
${decision.hook}

JUSTIFICATIVA ESTRATÉGICA:
${decision.reasoning}

PÚBLICO:

- Desenvolvedores
- Programadores
- Estudantes de programação
- Pessoas interessadas em tecnologia

OBJETIVO DO CONTEÚDO:

Criar um conteúdo realmente útil, tecnicamente correto e interessante.

O leitor deve aprender algo concreto e ter motivo para salvar ou
compartilhar o conteúdo.

ESTRUTURA DO CARROSSEL:

Crie EXATAMENTE 6 slides.

SLIDE 1:
Hook forte.
Deve chamar atenção imediatamente.

SLIDES 2, 3 e 4:
Explique o assunto progressivamente.
Utilize exemplos práticos quando forem úteis.

SLIDE 5:
Apresente uma conclusão ou aplicação prática.

SLIDE 6:
CTA natural relacionado ao conteúdo.

Não utilize CTA genérico como:
"siga para mais".

REGRAS:

1. Não invente informações técnicas.
2. Não use afirmações exageradas.
3. Não seja superficial.
4. Evite textos gigantes nos slides.
5. Cada slide deve transmitir uma ideia principal.
6. O conteúdo deve ser fácil de ler em celular.
7. Utilize exemplos de código somente quando realmente agregarem valor.
8. Não coloque emojis excessivamente.
9. Não mencione que o conteúdo foi gerado por IA.
10. Não coloque hashtags dentro dos slides.
11. Não crie informações que não estejam relacionadas ao tema.
12. Mantenha linguagem profissional, mas natural.
13. O conteúdo deve parecer escrito por um desenvolvedor experiente.
14. O CTA deve ser coerente com o tema.
15. Não repita desnecessariamente o mesmo conteúdo entre slides.
16. Mantenha cada visualDirection detalhado, porém objetivo.
17. Cada visualDirection deve possuir aproximadamente 1 a 3 frases.
18. O JSON deve estar completamente fechado antes de terminar a resposta.
19. NÃO ultrapasse a quantidade solicitada de slides.
20. NÃO adicione campos que não estejam definidos no formato abaixo.

LEGENDA:

Crie uma legenda complementar ao carrossel.

A legenda NÃO deve simplesmente repetir os slides.

Ela deve:

- contextualizar o assunto;
- reforçar o principal aprendizado;
- incentivar interação;
- terminar com uma pergunta relacionada ao tema.

IMPORTANTE:

A legenda NÃO deve conter hashtags.

As hashtags devem ser retornadas separadamente
no campo "hashtags".

HASHTAGS:

Gere de 3 a 6 hashtags relevantes para o conteúdo.

As hashtags devem:

- ser diretamente relacionadas ao tema;
- ser relevantes para programação e tecnologia;
- evitar hashtags extremamente genéricas quando houver opções melhores;
- não repetir hashtags desnecessariamente;
- começar obrigatoriamente com "#";
- conter somente letras, números e underscore;
- NÃO possuir espaços;
- NÃO aparecer dentro de caption;
- NÃO aparecer dentro dos slides.

Exemplo:

"hashtags": [
  "#programacao",
  "#javascript",
  "#desenvolvimento",
  "#git"
]

DIREÇÃO VISUAL:

Para cada slide forneça uma direção visual específica para o
gerador de imagens.

Descreva:

- composição;
- elementos visuais;
- hierarquia;
- possíveis elementos de código;
- estilo;
- relação com o conteúdo.

Não escreva uma descrição genérica como:
"imagem tecnológica".

FORMATO DE RESPOSTA:

RESPONDA SOMENTE COM JSON VÁLIDO.

NÃO UTILIZE MARKDOWN.

NÃO ENVIE \`\`\`json.

NÃO ENVIE TEXTO ANTES DO JSON.

NÃO ENVIE TEXTO DEPOIS DO JSON.

FORMATO OBRIGATÓRIO:

{
  "topic": "${decision.topic}",
  "format": "CAROUSEL",
  "objective": "${decision.objective}",
  "hook": "${decision.hook}",
  "caption": "legenda completa SEM hashtags",
  "hashtags": [
    "#hashtag1",
    "#hashtag2",
    "#hashtag3"
  ],
  "slides": [
    {
      "number": 1,
      "title": "título",
      "text": "texto do slide",
      "visualDirection": "direção visual detalhada"
    },
    {
      "number": 2,
      "title": "título",
      "text": "texto do slide",
      "visualDirection": "direção visual detalhada"
    },
    {
      "number": 3,
      "title": "título",
      "text": "texto do slide",
      "visualDirection": "direção visual detalhada"
    },
    {
      "number": 4,
      "title": "título",
      "text": "texto do slide",
      "visualDirection": "direção visual detalhada"
    },
    {
      "number": 5,
      "title": "título",
      "text": "texto do slide",
      "visualDirection": "direção visual detalhada"
    },
    {
      "number": 6,
      "title": "título",
      "text": "texto do slide",
      "visualDirection": "direção visual detalhada"
    }
  ]
}
`;

  const modelToUse = getGeneratorModel();

  console.log(
    `🤖 Modelo: ${modelToUse}`
  );

  console.log(
    `🧠 Limite de saída: ${MAX_OUTPUT_TOKENS} tokens`
  );

  let response;

  try {
    response =
      await ai.models.generateContent({
        model:
          modelToUse,

        contents:
          prompt,

        config: {
          responseMimeType:
            "application/json",

          maxOutputTokens:
            MAX_OUTPUT_TOKENS,
        },
      });
  } catch (error) {
    console.error("");
    console.error(
      "================================="
    );

    console.error(
      "❌ ERRO NA API DO GEMINI"
    );

    console.error(
      "================================="
    );

    console.error(
      error
    );

    throw error;
  }

  console.log(
    "📦 Resposta recebida do Gemini."
  );

  const text =
    response.text?.trim();

  if (!text) {
    console.error(
      "❌ Gemini não retornou texto."
    );

    inspectAIResponse(
      text,
      response
    );

    printRawAIResponse(
      text
    );

    throw new Error(
      "A IA não retornou conteúdo para o post."
    );
  }

  console.log(
    `📄 Tamanho da resposta: ${text.length} caracteres.`
  );

  let jsonText: string;

  try {
    jsonText =
      extractJsonObject(
        text
      );
  } catch (error) {
    console.error(
      "❌ NÃO FOI POSSÍVEL EXTRAIR O JSON"
    );

    printRawAIResponse(
      text
    );

    inspectAIResponse(
      text,
      response
    );

    console.error(
      error
    );

    throw error;
  }

  let content:
    GeneratedPostContent;

  try {
    content =
      JSON.parse(
        jsonText
      ) as GeneratedPostContent;
  } catch (error) {
    console.error(
      "❌ JSON RETORNADO PELA IA É INVÁLIDO"
    );

    printRawAIResponse(
      text
    );

    console.error(
      "📦 JSON EXTRAÍDO:"
    );

    console.error(
      jsonText
    );

    throw new Error(
      `A IA retornou JSON inválido: ${
        error instanceof Error
          ? error.message
          : String(error)
      }`
    );
  }

  /*
   * ==========================================
   * NORMALIZA HASHTAGS
   * ==========================================
   */

  content.hashtags =
    normalizeHashtags(
      content.hashtags
    );

  /*
   * ==========================================
   * VALIDAÇÃO
   * ==========================================
   */

  try {
    validateGeneratedPost(
      content,
      decision
    );
  } catch (error) {
    console.error(
      "❌ CONTEÚDO GERADO NÃO PASSOU NA VALIDAÇÃO"
    );

    printRawAIResponse(
      text
    );

    console.error(
      "🔍 ERRO DE VALIDAÇÃO:"
    );

    console.error(
      error
    );

    throw error;
  }

  console.log(
    `🏷️ Hashtags geradas: ${content.hashtags.join(" ")}`
  );

  console.log(
    "✅ Content Generator concluiu com sucesso."
  );

  return content;
}

/*
 * ==========================================
 * VALIDAÇÃO
 * ==========================================
 */

function validateGeneratedPost(
  content: GeneratedPostContent,
  decision: ContentDecision
): void {
  if (!content) {
    throw new Error(
      "Conteúdo gerado está vazio."
    );
  }

  if (
    content.format !==
    "CAROUSEL"
  ) {
    throw new Error(
      `Formato inesperado no conteúdo gerado: ${content.format}`
    );
  }

  if (
    !content.topic?.trim()
  ) {
    throw new Error(
      "O conteúdo gerado não possui topic."
    );
  }

  if (
    !content.objective?.trim()
  ) {
    throw new Error(
      "O conteúdo gerado não possui objective."
    );
  }

  if (
    !content.hook?.trim()
  ) {
    throw new Error(
      "O conteúdo gerado não possui hook."
    );
  }

  if (
    !content.caption?.trim()
  ) {
    throw new Error(
      "O conteúdo gerado não possui caption."
    );
  }

  /*
   * HASHTAGS
   */

  if (
    !Array.isArray(
      content.hashtags
    )
  ) {
    throw new Error(
      "O conteúdo gerado não possui um array de hashtags."
    );
  }

  if (
    content.hashtags.length < 3 ||
    content.hashtags.length > 6
  ) {
    throw new Error(
      `A IA gerou ${content.hashtags.length} hashtags. ` +
      `O esperado é entre 3 e 6.`
    );
  }

  const uniqueHashtags =
    new Set(
      content.hashtags.map(
        (hashtag) =>
          hashtag.toLowerCase()
      )
    );

  if (
    uniqueHashtags.size !==
    content.hashtags.length
  ) {
    throw new Error(
      "A IA gerou hashtags duplicadas."
    );
  }

  content.hashtags.forEach(
    (hashtag) => {
      if (
        !/^#[\p{L}\p{N}_]+$/u.test(
          hashtag
        )
      ) {
        throw new Error(
          `Hashtag inválida: ${hashtag}`
        );
      }
    }
  );

  /*
   * SLIDES
   */

  if (
    !Array.isArray(
      content.slides
    )
  ) {
    throw new Error(
      "O conteúdo gerado não possui um array de slides."
    );
  }

  if (
    content.slides.length !==
    6
  ) {
    throw new Error(
      `O carrossel possui ${content.slides.length} slides. ` +
      `O esperado é exatamente 6.`
    );
  }

  content.slides.forEach(
    (
      slide,
      index
    ) => {
      if (
        slide.number !==
        index + 1
      ) {
        throw new Error(
          `Numeração inválida no slide ${index + 1}. ` +
          `Recebido: ${slide.number}.`
        );
      }

      if (
        !slide.title?.trim()
      ) {
        throw new Error(
          `O slide ${slide.number} não possui título.`
        );
      }

      if (
        !slide.text?.trim()
      ) {
        throw new Error(
          `O slide ${slide.number} não possui texto.`
        );
      }

      if (
        !slide.visualDirection?.trim()
      ) {
        throw new Error(
          `O slide ${slide.number} não possui visualDirection.`
        );
      }
    }
  );

  if (
    content.topic.trim() !==
    decision.topic.trim()
  ) {
    console.warn(
      "⚠️ O topic retornado pela IA é diferente do topic decidido pelo estrategista."
    );
  }

  if (
    content.format !==
    decision.format
  ) {
    console.warn(
      "⚠️ O formato retornado pela IA é diferente do formato decidido pelo estrategista."
    );
  }

  if (
    content.objective.trim() !==
    decision.objective.trim()
  ) {
    console.warn(
      "⚠️ O objective retornado pela IA é diferente do objective decidido pelo estrategista."
    );
  }
}