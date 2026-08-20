import { prisma } from "../core/database.js";

export interface PendingRecommendedTopic {
  id: string;
  topic: string;
  suggestedFormat: string;
  suggestedDay: string;
  suggestedTime: string;
  reason?: string;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  objective?: string;
  createdAt: string;
}

/**
 * Le todas as pautas pendentes para a proxima semana direto do PostgreSQL
 */
export async function getPendingRecommendations(): Promise<PendingRecommendedTopic[]> {
  try {
    const rows = await prisma.pendingRecommendedTopic.findMany({
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      suggestedFormat: r.suggestedFormat,
      suggestedDay: r.suggestedDay,
      suggestedTime: r.suggestedTime,
      reason: r.reason || undefined,
      baseCopyPrompt: r.baseCopyPrompt || undefined,
      baseVisualPrompt: r.baseVisualPrompt || undefined,
      objective: r.objective || undefined,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (err) {
    console.error("[pending-recommendations] Erro ao consultar PostgreSQL:", err);
    return [];
  }
}

/**
 * Adiciona uma pauta recomendada a fila da proxima semana no PostgreSQL
 */
export async function addPendingRecommendation(
  item: Omit<PendingRecommendedTopic, "id" | "createdAt">
): Promise<PendingRecommendedTopic> {
  try {
    // Remove duplicacao se ja existir com o mesmo tema
    await prisma.pendingRecommendedTopic.deleteMany({
      where: { topic: { equals: item.topic, mode: "insensitive" } },
    });

    const created = await prisma.pendingRecommendedTopic.create({
      data: {
        topic: item.topic,
        suggestedFormat: item.suggestedFormat || "CAROUSEL",
        suggestedDay: item.suggestedDay,
        suggestedTime: item.suggestedTime || "18:30",
        reason: item.reason,
        baseCopyPrompt: item.baseCopyPrompt,
        baseVisualPrompt: item.baseVisualPrompt,
        objective: item.objective,
      },
    });

    return {
      id: created.id,
      topic: created.topic,
      suggestedFormat: created.suggestedFormat,
      suggestedDay: created.suggestedDay,
      suggestedTime: created.suggestedTime,
      reason: created.reason || undefined,
      baseCopyPrompt: created.baseCopyPrompt || undefined,
      baseVisualPrompt: created.baseVisualPrompt || undefined,
      objective: created.objective || undefined,
      createdAt: created.createdAt.toISOString(),
    };
  } catch (err) {
    console.error("[pending-recommendations] Erro ao salvar no PostgreSQL:", err);
    throw err;
  }
}

/**
 * Remove uma pauta recomendada especifica do PostgreSQL
 */
export async function removePendingRecommendation(topic: string): Promise<void> {
  try {
    await prisma.pendingRecommendedTopic.deleteMany({
      where: { topic: { equals: topic, mode: "insensitive" } },
    });
  } catch (err) {
    console.error("[pending-recommendations] Erro ao excluir no PostgreSQL:", err);
  }
}

/**
 * Limpa toda a fila de pautas da proxima semana apos insercao na grade
 */
export async function clearPendingRecommendations(): Promise<void> {
  try {
    await prisma.pendingRecommendedTopic.deleteMany({});
  } catch (err) {
    console.error("[pending-recommendations] Erro ao limpar fila no PostgreSQL:", err);
  }
}
