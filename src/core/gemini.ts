import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

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

  throw new Error("A IA iniciou um objeto JSON, mas não fechou todas as chaves.");
}

/**
 * Executa uma chamada estruturada ao Gemini com rotação de chaves.
 */
export async function executeStructuredPrompt<T>(
  prompt: string,
  options: {
    model?: string;
    maxOutputTokens?: number;
    maxRetries?: number;
  } = {}
): Promise<T> {
  const modelToUse = options.model || env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
  const maxOutputTokens = options.maxOutputTokens || 12000;
  const maxRetries = options.maxRetries ?? 2;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const keyIdx = (currentKeyIndex + attempt - 1) % apiKeys.length;
    const { ai } = getGeminiAI(keyIdx);

    try {
      let currentPrompt = prompt;
      if (attempt > 1) {
        currentPrompt += `\n\nATENÇÃO: Responda ESTRITAMENTE com o objeto JSON fechado, sem blocos de texto adicionais.`;
      }

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
      return parsed;
    } catch (err: any) {
      lastError = err;
      const isRateLimit = err?.status === 429 || String(err?.message).includes("quota");

      if (isRateLimit && apiKeys.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
        console.warn(`⚠️ Rate limit na chave ${keyIdx + 1}. Alternando para chave backup ${currentKeyIndex + 1}...`);
      }

      if (attempt <= maxRetries) {
        console.warn(`⚠️ Tentativa ${attempt} falhou. Tentando novamente (${attempt + 1}/${maxRetries + 1})...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}
