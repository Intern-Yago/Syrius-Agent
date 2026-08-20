/**
 * @title Modelos Google Gemini AI
 * @description Testa a conectividade com a API do Google Gemini e a disponibilidade dos modelos de texto e visão.
 * @category Inteligência & RAG
 */

export const testInfo = {
  title: "Modelos Google Gemini AI",
  description: "Testa a conectividade com a API do Google Gemini e a disponibilidade dos modelos de texto e visão.",
  category: "Inteligência & RAG",
};

import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY!;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada.");
  }
  const ai = new GoogleGenAI({ apiKey });

  const models = [
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
  ];

  for (const m of models) {
    try {
      console.log(`Testando modelo "${m}"...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: "Responda apenas: OK",
      });
      console.log(`✅ Modelo "${m}" FUNCIONA! Resposta: ${res.text?.trim()}`);
      break;
    } catch (e: any) {
      console.log(`❌ Modelo "${m}" falhou: ${e.message}`);
    }
  }

  console.log("\nTestando executeStructuredPrompt com o modelo configurado no sistema...");
  const { executeStructuredPrompt } = await import("../core/gemini.js");
  const result = await executeStructuredPrompt<{ status: string; modelo: string }>(
    "Responda SOMENTE com o JSON: {\"status\": \"ok\", \"modelo\": \"gemini-3.6-flash\"}"
  );
  console.log("✅ executeStructuredPrompt respondeu com sucesso:", result);
}

testModels().catch((err) => {
  console.error("❌ Falha no teste de modelos Gemini:", err);
  process.exit(1);
});
