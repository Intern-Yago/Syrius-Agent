import { GoogleGenAI } from "@google/genai";
import { getInstagramAnalytics } from "./instagram-analytics.js";

export type ContentFormat =
  | "CAROUSEL"
  | "REEL"
  | "SINGLE_IMAGE";

export interface ContentDecision {
  format: ContentFormat;
  topic: string;
  objective: string;
  reasoning: string;
  hook: string;
}

interface StrategyInput {
  recentTopics?: string[];
  recentFormats?: string[];
}

export function getStrategistModel(): string {
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
}

const MAX_OUTPUT_TOKENS = 4096;

const MAX_RETRIES = 2;

/*
 * ==========================================
 * DEBUG
 * ==========================================
 */

function printRawAIResponse(
  text: string | undefined
): void {
  console.error("");

  console.error(
    "================================="
  );

  console.error(
    "🤖 RESPOSTA BRUTA DA IA"
  );

  console.error(
    "================================="
  );

  console.error("");

  if (!text) {
    console.error(
      "[RESPOSTA VAZIA]"
    );
  } else {
    console.error(text);
  }

  console.error("");

  console.error(
    "================================="
  );
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

  console.error(
    "================================="
  );

  console.error(
    "🔍 DIAGNÓSTICO DA RESPOSTA"
  );

  console.error(
    "================================="
  );

  if (!text) {
    console.error(
      "Caracteres recebidos: 0"
    );

    console.error(
      "Resposta vazia: SIM"
    );
  } else {
    const trimmed =
      text.trim();

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
      `Termina com "]": ${trimmed.endsWith("]")}`
    );

    console.error(
      `Quantidade de "{": ${
        (trimmed.match(/{/g) || [])
          .length
      }`
    );

    console.error(
      `Quantidade de "}": ${
        (trimmed.match(/}/g) || [])
          .length
      }`
    );

    console.error(
      `Quantidade de "[": ${
        (trimmed.match(/\[/g) || [])
          .length
      }`
    );

    console.error(
      `Quantidade de "]": ${
        (trimmed.match(/\]/g) || [])
          .length
      }`
    );
  }

  if (
    response &&
    typeof response === "object"
  ) {
    const responseObject =
      response as Record<
        string,
        unknown
      >;

    console.error("");

    console.error(
      "📦 METADADOS DA RESPOSTA:"
    );

    if (
      "responseId" in responseObject
    ) {
      console.error(
        `responseId: ${String(
          responseObject.responseId
        )}`
      );
    }

    if (
      "usageMetadata" in
      responseObject
    ) {
      console.error(
        "\nusageMetadata:"
      );

      try {
        console.error(
          JSON.stringify(
            responseObject
              .usageMetadata,
            null,
            2
          )
        );
      } catch {
        console.error(
          responseObject
            .usageMetadata
        );
      }
    }

    if (
      "candidates" in
      responseObject
    ) {
      console.error(
        "\ncandidates:"
      );

      try {
        console.error(
          JSON.stringify(
            responseObject
              .candidates,
            null,
            2
          )
        );
      } catch {
        console.error(
          responseObject
            .candidates
        );
      }
    }
  }

  console.error("");

  console.error(
    "Possíveis causas:"
  );

  console.error(
    "- JSON malformado pelo modelo"
  );

  console.error(
    "- resposta interrompida"
  );

  console.error(
    "- limite de saída"
  );

  console.error(
    "- problema temporário do modelo"
  );

  console.error(
    "- resposta incompatível com o schema solicitado"
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

  if (
    firstBrace === -1
  ) {
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
    const char =
      cleaned[i];

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

    if (
      char === '"'
    ) {
      insideString =
        !insideString;

      continue;
    }

    if (insideString) {
      continue;
    }

    if (
      char === "{"
    ) {
      depth++;
    }

    if (
      char === "}"
    ) {
      depth--;

      if (
        depth === 0
      ) {
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
 * PROMPT
 * ==========================================
 */

function buildPrompt(
  analyticsContext: string,
  recentTopics: string,
  recentFormats: string
): string {
  return `
Você é o estrategista de conteúdo de um perfil profissional de tecnologia no Instagram.

Sua função é decidir a próxima publicação.

PÚBLICO:
- Desenvolvedores
- Programadores
- Estudantes de tecnologia
- Profissionais de TI
- Pessoas interessadas em tecnologia

FORMATOS DISPONÍVEIS:
CAROUSEL
REEL
SINGLE_IMAGE

O pipeline de produção completo atualmente existe apenas para CAROUSEL.

Se escolher CAROUSEL, o conteúdo poderá ser produzido imediatamente.

DADOS DO INSTAGRAM:
${analyticsContext}

TEMAS RECENTES:
${recentTopics}

FORMATOS RECENTES:
${recentFormats}

REGRAS:

1. Não invente métricas.
2. Não invente desempenho.
3. Se a conta for nova ou possuir poucos dados, reconheça essa limitação.
4. Evite repetir temas recentes.
5. O tema deve ser específico e tecnicamente útil.
6. Priorize autoridade, educação e valor real.
7. Não escreva o post.
8. Não crie slides.
9. Não crie legenda.
10. O hook deve ser chamativo sem clickbait enganoso.
11. Use CAROUSEL quando for a melhor opção para execução imediata.
12. Reasoning deve explicar brevemente a decisão.

OBJETIVOS POSSÍVEIS:

EDUCATION
AUTHORITY
ENGAGEMENT
AWARENESS
COMMUNITY

RESPONDA SOMENTE COM ESTE JSON:

{
  "format": "CAROUSEL",
  "topic": "tema específico",
  "objective": "EDUCATION",
  "reasoning": "explicação curta",
  "hook": "gancho principal"
}

IMPORTANTE:

- JSON válido.
- Não use Markdown.
- Não use \`\`\`.
- Não escreva nada antes do JSON.
- Não escreva nada depois do JSON.
- Feche todas as chaves.
- Não adicione campos extras.
`;
}

/*
 * ==========================================
 * CHAMADA GEMINI
 * ==========================================
 */

async function requestStrategy(
  ai: GoogleGenAI,
  prompt: string,
  attempt: number
) {
  console.log("");

  console.log(
    `🤖 Gerando decisão com Gemini... tentativa ${attempt}/${MAX_RETRIES + 1}`
  );

  const modelToUse = getStrategistModel();

  console.log(
    `🤖 Modelo do Strategist: ${modelToUse}`
  );

  console.log(
    `🧠 Limite de saída: ${MAX_OUTPUT_TOKENS} tokens`
  );

  try {
    const response =
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

    console.log(
      "📦 Resposta recebida do Gemini."
    );

    const text =
      response.text?.trim();

    if (!text) {
      console.error(
        "\n❌ Gemini não retornou texto."
      );

      inspectAIResponse(
        text,
        response
      );

      printRawAIResponse(
        text
      );

      throw new Error(
        "A IA não retornou uma decisão de conteúdo."
      );
    }

    console.log(
      `📄 Tamanho da resposta: ${text.length} caracteres.`
    );

    return {
      response,
      text,
    };
  } catch (error) {
    console.error("");

    console.error(
      "❌ ERRO NA CHAMADA DO GEMINI"
    );

    console.error("");

    console.error(
      error
    );

    throw error;
  }
}

/*
 * ==========================================
 * GERAR DECISÃO
 * ==========================================
 */

export async function decideNextContent(
  apiKey: string,
  input: StrategyInput = {}
): Promise<ContentDecision> {
  if (!apiKey) {
    throw new Error(
      "API key não fornecida para o Content Strategist."
    );
  }

  console.log(
    "🧠 Iniciando Content Strategist..."
  );

  const ai =
    new GoogleGenAI({
      apiKey,
    });

  /*
   * ==========================================
   * 1. INSTAGRAM
   * ==========================================
   */

  console.log(
    "\n📊 Consultando dados atuais do Instagram..."
  );

  const instagramAnalytics =
    await getInstagramAnalytics();

  const analyticsContext =
    JSON.stringify(
      instagramAnalytics,
      null,
      2
    );

  /*
   * ==========================================
   * 2. HISTÓRICO
   * ==========================================
   */

  const recentTopics =
    input.recentTopics?.length
      ? input.recentTopics
          .join("\n- ")
      : "Nenhum conteúdo anterior registrado.";

  const recentFormats =
    input.recentFormats?.length
      ? input.recentFormats.join(
          ", "
        )
      : "Nenhum formato anterior registrado.";

  /*
   * ==========================================
   * 3. PROMPT
   * ==========================================
   */

  const prompt =
    buildPrompt(
      analyticsContext,
      recentTopics,
      recentFormats
    );

  /*
   * ==========================================
   * 4. TENTATIVAS
   * ==========================================
   */

  let lastError:
    unknown = null;

  for (
    let attempt = 1;
    attempt <=
      MAX_RETRIES + 1;
    attempt++
  ) {
    try {
      /*
       * A partir da segunda tentativa,
       * reforçamos que o problema anterior
       * foi JSON incompleto.
       */

      let currentPrompt =
        prompt;

      if (
        attempt > 1
      ) {
        currentPrompt += `

ATENÇÃO:

A tentativa anterior retornou um JSON incompleto.

Nesta tentativa:
- responda SOMENTE o objeto JSON;
- certifique-se de fechar a última chave com "}";
- não adicione explicações;
- mantenha a resposta extremamente curta.
`;
      }

      const {
        response,
        text,
      } =
        await requestStrategy(
          ai,
          currentPrompt,
          attempt
        );

      /*
       * ==========================================
       * DEBUG
       * ==========================================
       */

      console.log(
        "\n================================="
      );

      console.log(
        "🤖 RESPOSTA DO STRATEGIST"
      );

      console.log(
        "================================="
      );

      console.log(
        text
      );

      /*
       * ==========================================
       * EXTRAIR JSON
       * ==========================================
       */

      let jsonText:
        string;

      try {
        jsonText =
          extractJsonObject(
            text
          );
      } catch (error) {
        console.error("");

        console.error(
          "❌ NÃO FOI POSSÍVEL EXTRAIR O JSON DO STRATEGIST"
        );

        printRawAIResponse(
          text
        );

        inspectAIResponse(
          text,
          response
        );

        console.error("");

        console.error(
          "🔍 ERRO:"
        );

        console.error(
          error
        );

        lastError =
          error;

        if (
          attempt <=
          MAX_RETRIES
        ) {
          console.error("");

          console.error(
            `🔄 Tentando novamente... (${attempt + 1}/${MAX_RETRIES + 1})`
          );

          continue;
        }

        throw error;
      }

      /*
       * ==========================================
       * PARSE
       * ==========================================
       */

      let decision:
        ContentDecision;

      try {
        decision =
          JSON.parse(
            jsonText
          ) as ContentDecision;
      } catch (error) {
        console.error("");

        console.error(
          "❌ JSON RETORNADO PELA IA É INVÁLIDO"
        );

        printRawAIResponse(
          text
        );

        console.error("");

        console.error(
          "📦 JSON EXTRAÍDO:"
        );

        console.error(
          jsonText
        );

        console.error("");

        console.error(
          "🔍 ERRO DO JSON:"
        );

        console.error(
          error
        );

        lastError =
          error;

        if (
          attempt <=
          MAX_RETRIES
        ) {
          console.error("");

          console.error(
            `🔄 Tentando novamente... (${attempt + 1}/${MAX_RETRIES + 1})`
          );

          continue;
        }

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
       * VALIDAR
       * ==========================================
       */

      try {
        validateDecision(
          decision
        );
      } catch (error) {
        console.error("");

        console.error(
          "❌ DECISÃO NÃO PASSOU NA VALIDAÇÃO"
        );

        printRawAIResponse(
          text
        );

        console.error("");

        console.error(
          "🔍 ERRO DE VALIDAÇÃO:"
        );

        console.error(
          error
        );

        lastError =
          error;

        if (
          attempt <=
          MAX_RETRIES
        ) {
          console.error("");

          console.error(
            `🔄 Tentando novamente... (${attempt + 1}/${MAX_RETRIES + 1})`
          );

          continue;
        }

        throw error;
      }

      /*
       * ==========================================
       * SUCESSO
       * ==========================================
       */

      console.log("");

      console.log(
        "================================="
      );

      console.log(
        "✅ CONTENT STRATEGIST CONCLUÍDO"
      );

      console.log(
        "================================="
      );

      return decision;
    } catch (error) {
      lastError =
        error;

      /*
       * Se o erro veio da própria chamada
       * da API, não tentamos novamente aqui.
       * A chamada já possui seu próprio tratamento.
       */

      if (
        attempt >
        MAX_RETRIES
      ) {
        throw error;
      }

      /*
       * Se for erro de parsing/validação,
       * o fluxo acima já continua.
       */

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        message.includes(
          "JSON"
        ) ||
        message.includes(
          "decisão"
        ) ||
        message.includes(
          "Formato"
        ) ||
        message.includes(
          "topic"
        )
      ) {
        continue;
      }

      throw error;
    }
  }

  throw (
    lastError instanceof Error
      ? lastError
      : new Error(
          "Não foi possível gerar a decisão."
        )
  );
}

/*
 * ==========================================
 * VALIDAÇÃO
 * ==========================================
 */

function validateDecision(
  decision: ContentDecision
): void {
  if (!decision) {
    throw new Error(
      "A decisão do Content Strategist está vazia."
    );
  }

  const validFormats:
    ContentFormat[] = [
      "CAROUSEL",
      "REEL",
      "SINGLE_IMAGE",
    ];

  if (
    !validFormats.includes(
      decision.format
    )
  ) {
    throw new Error(
      `Formato inválido: ${decision.format}`
    );
  }

  if (
    !decision.topic?.trim()
  ) {
    throw new Error(
      "A decisão não possui um topic válido."
    );
  }

  if (
    !decision.objective?.trim()
  ) {
    throw new Error(
      "A decisão não possui um objective válido."
    );
  }

  if (
    !decision.reasoning?.trim()
  ) {
    throw new Error(
      "A decisão não possui reasoning."
    );
  }

  if (
    !decision.hook?.trim()
  ) {
    throw new Error(
      "A decisão não possui hook."
    );
  }
}