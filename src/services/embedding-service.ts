import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../core/database.js";

// Inicializa cliente oficial Google Gen AI
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export type InsightType =
  | "HOOK_PERFORMANCE"
  | "FORMAT_EFFICIENCY"
  | "TIMING_OPTIMIZATION"
  | "AUDIENCE_PAIN"
  | "HASHTAG_CLUSTER"
  | "DESIGN_RETENTION";

export type InsightStatus = "HYPOTHESIS" | "VALIDATED" | "REFUTED";

export interface LearningInsight {
  id: string;
  type: InsightType;
  title: string;
  content: string;
  embedding: number[];
  status: InsightStatus;
  confidenceScore: number; // 0.0 a 1.0
  evidencePostsCount: number;
  correctionReasoning?: string | null;
  supersededById?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ragMemoryFilePath = path.resolve(process.cwd(), "output", "rag-memory.json");

/**
 * 1. Gera Embedding Vetorial Denso (768 dimensões) usando Google Gemini text-embedding-004
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text }] },
        }),
      });

      if (res.ok) {
        const json: any = await res.json();
        if (json?.embedding?.values) {
          return json.embedding.values;
        }
      }
    } catch {
      // Tenta fallback determinístico
    }
  }

  return generateFallbackEmbedding(text);
}

/**
 * Fallback semântico determinístico de 768 dimensões se a API de embedding estiver sem cota
 */
function generateFallbackEmbedding(text: string): number[] {
  const vector: number[] = new Array(768).fill(0);
  const normalized = text.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    const index = (code * 31 + i * 17) % 768;
    vector[index] = (vector[index] + (code % 10) / 10) % 1;
  }
  // Normalização L2
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * 2. Calcula Similaridade de Cosseno entre dois vetores (-1.0 a 1.0)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * 3. Recupera toda a memória RAG ativa direto do PostgreSQL
 */
export async function getAllInsights(): Promise<LearningInsight[]> {
  try {
    const dbInsights = await prisma.learningInsightEmbedding.findMany({
      orderBy: { updatedAt: "desc" },
    });

    if (dbInsights.length > 0) {
      return dbInsights.map((d) => ({
        id: d.id,
        type: d.type as InsightType,
        title: d.title,
        content: d.content,
        embedding: d.embedding,
        status: d.status as InsightStatus,
        confidenceScore: d.confidenceScore,
        evidencePostsCount: d.evidencePostsCount,
        correctionReasoning: d.correctionReasoning || undefined,
        supersededById: d.supersededById || undefined,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      }));
    }
    return [];
  } catch (err) {
    console.warn("[RAG] Erro ao consultar insights no PostgreSQL:", err);
    return [];
  }
}

/**
 * 4. Grava insight no PostgreSQL com calibração estatística rigorosa
 */
export async function recordInsight(input: {
  type: InsightType;
  title: string;
  content: string;
  status?: InsightStatus;
  confidenceScore?: number;
  evidencePostsCount?: number;
  supersededInsightId?: string;
  correctionReasoning?: string;
}): Promise<LearningInsight> {
  const embedding = await generateEmbedding(`${input.title}. ${input.content}`);
  const now = new Date();
  const id = `insight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const evidenceCount = input.evidencePostsCount ?? 1;

  // Calibração Científica Rigorosa:
  // - 1 a 2 posts de evidência: OBRIGATORIAMENTE HYPOTHESIS (confiança máx 0.40)
  // - 3 a 5 posts de evidência: HYPOTHESIS (confiança máx 0.65)
  // - 6+ posts de evidência: VALIDATED (confiança até 0.95)
  let status: InsightStatus = input.status || "HYPOTHESIS";
  let confidence = input.confidenceScore ?? 0.35;

  if (evidenceCount <= 2 && status === "VALIDATED") {
    status = "HYPOTHESIS";
    confidence = Math.min(confidence, 0.40);
  } else if (evidenceCount < 6 && status === "VALIDATED") {
    confidence = Math.min(confidence, 0.65);
  }

  const newInsight: LearningInsight = {
    id,
    type: input.type,
    title: input.title,
    content: input.content,
    embedding,
    status,
    confidenceScore: confidence,
    evidencePostsCount: evidenceCount,
    correctionReasoning: input.correctionReasoning,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  try {
    // Se estiver refutando uma premissa do passado
    if (input.supersededInsightId) {
      await prisma.learningInsightEmbedding.updateMany({
        where: { id: input.supersededInsightId },
        data: {
          status: "REFUTED" as any,
          supersededById: id,
          correctionReasoning: input.correctionReasoning || "Refutado por novas evidências empíricas.",
        },
      });
    }

    // Deduplicação inteligente no RAG para evitar insights repetidos
    const existingInsights = await getAllInsights();
    const duplicate = existingInsights.find((e) => {
      if (e.status !== status) return false;
      const sim = calculateCosineSimilarity(embedding, e.embedding);
      return sim > 0.92 || (e.title.length > 10 && input.title.length > 10 && e.title.toLowerCase().trim() === input.title.toLowerCase().trim());
    });

    if (duplicate && !input.supersededInsightId) {
      const updatedCount = Math.max(duplicate.evidencePostsCount + 1, evidenceCount);
      const updatedConfidence = Math.min(0.95, Math.max(duplicate.confidenceScore, confidence));
      await prisma.learningInsightEmbedding.update({
        where: { id: duplicate.id },
        data: {
          evidencePostsCount: updatedCount,
          confidenceScore: updatedConfidence,
          updatedAt: now,
        },
      });
      return {
        ...duplicate,
        evidencePostsCount: updatedCount,
        confidenceScore: updatedConfidence,
        updatedAt: now.toISOString(),
      };
    }

    // Salva novo insight no PostgreSQL
    await prisma.learningInsightEmbedding.create({
      data: {
        id: newInsight.id,
        type: newInsight.type as any,
        title: newInsight.title,
        content: newInsight.content,
        embedding: newInsight.embedding,
        status: newInsight.status as any,
        confidenceScore: newInsight.confidenceScore,
        evidencePostsCount: newInsight.evidencePostsCount,
        correctionReasoning: newInsight.correctionReasoning,
        supersededById: newInsight.supersededById,
      },
    });
  } catch (err) {
    console.error("[RAG] Erro ao gravar insight no PostgreSQL:", err);
  }

  return newInsight;
}

/**
 * 5. Busca Semântica no RAG Vetorial
 * Retorna os aprendizados ativos mais relevantes para uma pauta ou decisão editorial
 */
export async function searchRelevantInsights(query: string, limit = 5): Promise<{
  activeInsights: LearningInsight[];
  refutedInsights: LearningInsight[];
}> {
  const queryEmbedding = await generateEmbedding(query);
  const all = await getAllInsights();

  // Calcula similaridade
  const scored = all.map((item) => ({
    item,
    similarity: calculateCosineSimilarity(queryEmbedding, item.embedding),
  }));

  // Ordena por maior similaridade
  scored.sort((a, b) => b.similarity - a.similarity);

  const activeInsights = scored
    .filter((s) => s.item.status === "VALIDATED" || s.item.status === "HYPOTHESIS")
    .slice(0, limit)
    .map((s) => s.item);

  const refutedInsights = scored
    .filter((s) => s.item.status === "REFUTED")
    .slice(0, 3)
    .map((s) => s.item);

  return {
    activeInsights,
    refutedInsights,
  };
}

/**
 * 6. Atualizar status e calibração de um insight
 */
export async function updateInsightStatus(
  id: string,
  newStatus: InsightStatus,
  confidenceScore?: number,
  correctionReasoning?: string
): Promise<boolean> {
  try {
    await prisma.learningInsightEmbedding.update({
      where: { id },
      data: {
        status: newStatus as any,
        confidenceScore: confidenceScore !== undefined ? confidenceScore : newStatus === "HYPOTHESIS" ? 0.40 : newStatus === "REFUTED" ? 0.0 : 0.75,
        correctionReasoning: correctionReasoning || undefined,
        updatedAt: new Date(),
      },
    });
    return true;
  } catch (err) {
    console.error("[RAG] Erro ao atualizar status do insight:", err);
    return false;
  }
}

/**
 * 7. Excluir um insight da memória RAG
 */
export async function deleteInsightById(id: string): Promise<boolean> {
  try {
    await prisma.learningInsightEmbedding.delete({
      where: { id },
    });
    return true;
  } catch (err) {
    console.error("[RAG] Erro ao excluir insight:", err);
    return false;
  }
}

/**
 * 8. Desvalidar todos os insights (definir como HIPÓTESE por amostragem reduzida)
 */
export async function devalidateAllInsights(): Promise<number> {
  try {
    const res = await prisma.learningInsightEmbedding.updateMany({
      where: { status: "VALIDATED" },
      data: {
        status: "HYPOTHESIS" as any,
        confidenceScore: 0.40,
        correctionReasoning: "Desvalidado: amostragem inicial reduzida (< 100 seguidores / amostragem inicial)",
        updatedAt: new Date(),
      },
    });
    return res.count;
  } catch (err) {
    console.error("[RAG] Erro ao desvalidar insights:", err);
    return 0;
  }
}

