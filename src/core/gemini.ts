import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { minifyPromptText } from "./prompt-minifier.js";
import { promptCache } from "./prompt-cache.js";
import { globalAiLimiter } from "./queue-limiter.js";
import { aiCircuitBreaker } from "./circuit-breaker.js";

const apiKeys = [
  process.env.GEMINI_API_KEY,
  process.env.GEMINI_API_KEY2,
].filter(Boolean) as string[];

let currentKeyIndex = 0;

export function getGeminiAI(keyIndex?: number): { ai: GoogleGenAI; keyIndex: number } {
  if (apiKeys.length === 0) {
    throw new Error("Nenhuma GEMINI_API_KEY configurada no arquivo .env");
  }

  const idx = keyIndex !== undefined ? keyIndex % apiKeys.length : currentKeyIndex % apiKeys.length;
  const apiKey = apiKeys[idx];

  const ai = new GoogleGenAI({
    apiKey,
  });

  return { ai, keyIndex: idx };
}

/**
 * Extrai de forma resiliente um objeto JSON balanceado de uma resposta textual da IA.
 */
export function extractJsonObject(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("A IA não retornou nenhum objeto JSON.");
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let i = firstBrace; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\" && insideString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      insideString = !insideString;
      continue;
    }

    if (insideString) continue;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) {
        return cleaned.slice(firstBrace, i + 1);
      }
    }
  }

  // Tenta auto-reparar JSON truncado (caso o modelo atinja o limite de tokens ou falte fechar chaves)
  try {
    let candidate = cleaned.slice(firstBrace);
    if (insideString) {
      candidate += '"';
    }
    // Remove vírgulas soltas no final
    candidate = candidate.replace(/,\s*$/, "");

    // Conta chaves e colchetes abertos para fechar proporcionalmente
    let openBraces = (candidate.match(/\{/g) || []).length;
    let closeBraces = (candidate.match(/\}/g) || []).length;
    let openBrackets = (candidate.match(/\[/g) || []).length;
    let closeBrackets = (candidate.match(/\]/g) || []).length;

    while (closeBrackets < openBrackets) {
      candidate += "]";
      closeBrackets++;
    }
    while (closeBraces < openBraces) {
      candidate += "}";
      closeBraces++;
    }

    JSON.parse(candidate);
    return candidate;
  } catch {
    // Se o auto-reparo falhar, lança erro explicativo
    throw new Error("A IA iniciou um objeto JSON, mas não fechou todas as chaves.");
  }
}

export interface ExecutePromptOptions {
  model?: string;
  maxOutputTokens?: number;
  maxRetries?: number;
  bypassCache?: boolean;
  ttlMinutes?: number;
}

/**
 * Executa uma chamada estruturada ao Gemini com 4 camadas de resiliência e otimização:
 * 1. Minificação de prompt (-20% de input tokens)
 * 2. Cache SHA-256 (0ms e 0 tokens em chamadas repetidas)
 * 3. Fila Global de Concorrência (Throttling / Anti-429)
 * 4. Circuit Breaker + Rotação de Chaves
 */
export async function executeStructuredPrompt<T>(
  prompt: string,
  options: ExecutePromptOptions = {}
): Promise<T> {
  let modelToUse = options.model;
  if (!modelToUse) {
    try {
      const { getSettings } = await import("../config/settings.js");
      const settings = await getSettings();
      if (settings?.defaultGeminiModel) {
        modelToUse = settings.defaultGeminiModel;
      }
    } catch {
      // Fallback para env se getSettings falhar
    }
  }
  if (!modelToUse) {
    modelToUse = process.env.GEMINI_TEXT_MODEL || env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
  }

  // 1. Minificação de Prompt (Redução de Tokens)
  const minifiedPrompt = minifyPromptText(prompt);

  // 2. Cache SHA-256 (Se não for bypass)
  if (!options.bypassCache) {
    const cachedResponse = await promptCache.get<T>(minifiedPrompt, modelToUse);
    if (cachedResponse !== null) {
      console.log(`[PromptCache] Resposta recuperada do Cache SHA-256 (0ms, 0 tokens gastos).`);
      return cachedResponse;
    }
  }

  // 3. Fila Global de Concorrência & Rate Limiting
  return globalAiLimiter.run(async () => {
    // 4. Checagem do Circuit Breaker
    if (!aiCircuitBreaker.canExecute()) {
      throw new Error("[CircuitBreaker] Disjuntor aberto por instabilidade externa. Aguardando período de resfriamento.");
    }

    const maxOutputTokens = options.maxOutputTokens || 12000;
    const maxRetries = options.maxRetries ?? 2;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      const keyIdx = (currentKeyIndex + attempt - 1) % apiKeys.length;
      const { ai } = getGeminiAI(keyIdx);

      try {
        let currentPrompt = minifiedPrompt;
        if (attempt > 1) {
          currentPrompt += `\n\nATENCAO: Responda ESTRITAMENTE com o objeto JSON fechado, sem blocos de texto adicionais.`;
        }

        console.log(`Executando prompt no Gemini (Modelo: ${modelToUse}, Chave: ${keyIdx + 1})...`);

        const response = await ai.models.generateContent({
          model: modelToUse,
          contents: currentPrompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens,
          },
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error("O Gemini retornou uma resposta em branco.");
        }

        const jsonText = extractJsonObject(text);
        const parsed = JSON.parse(jsonText) as T;

        // Sucesso: Notifica Circuit Breaker e grava em Cache
        aiCircuitBreaker.recordSuccess();
        await promptCache.set(minifiedPrompt, modelToUse, parsed, options.ttlMinutes ?? 1440);

        return parsed;
      } catch (err: any) {
        lastError = err;
        aiCircuitBreaker.recordFailure(err);

        const isRateLimit = err?.status === 429 || String(err?.message).includes("quota");

        if (isRateLimit && apiKeys.length > 1) {
          currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
          console.warn(`Rate limit na chave ${keyIdx + 1}. Alternando para chave backup ${currentKeyIndex + 1}...`);
        }

        if (attempt <= maxRetries) {
          console.warn(`Tentativa ${attempt} com ${modelToUse} falhou: ${err?.message || err}. Tentando novamente (${attempt + 1}/${maxRetries + 1})...`);
          continue;
        }
        throw err;
      }
    }

    throw lastError;
  });
}
