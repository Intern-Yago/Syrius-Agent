import { ipcMain } from "electron";
import {
  getActiveTrendingTopics,
  refreshTrendingTopics,
  ignoreTrendingTopic,
  markTrendingAsGenerated,
  type TrendingTopicItem,
} from "../../src/services/trending-service.js";

let registered = false;

export function registerTrendingIPC() {
  if (registered) return;
  registered = true;

  // 1. Obter tópicos em alta ativos
  ipcMain.handle("trending:get-all", async (): Promise<TrendingTopicItem[]> => {
    try {
      return await getActiveTrendingTopics();
    } catch (err) {
      console.error("[trending IPC] Erro ao carregar tópicos em alta:", err);
      return [];
    }
  });

  // 2. Forçar atualização / renovação de tendências com IA
  ipcMain.handle("trending:refresh", async (): Promise<{ success: boolean; topics?: TrendingTopicItem[]; error?: string }> => {
    try {
      const topics = await refreshTrendingTopics(true);
      return { success: true, topics };
    } catch (err) {
      console.error("[trending IPC] Erro ao renovar tópicos em alta:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido ao renovar tendências.",
      };
    }
  });

  // 3. Ignorar / Ocultar um tópico do radar
  ipcMain.handle("trending:ignore", async (_event, topicId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!topicId) throw new Error("ID do tópico inválido.");
      const success = await ignoreTrendingTopic(topicId);
      return { success };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao ignorar tendência.",
      };
    }
  });

  // 4. Marcar tendência como gerada
  ipcMain.handle(
    "trending:mark-generated",
    async (_event, payload: { topicId: string; postId: string }): Promise<{ success: boolean; error?: string }> => {
      try {
        if (!payload.topicId || !payload.postId) throw new Error("Parâmetros inválidos.");
        const success = await markTrendingAsGenerated(payload.topicId, payload.postId);
        return { success };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro ao atualizar status da tendência.",
        };
      }
    }
  );

  console.log("[trending] IPC do Radar de Tendências registrado com sucesso.");
}
