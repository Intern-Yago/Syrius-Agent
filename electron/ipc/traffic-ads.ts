import { ipcMain } from "electron";
import {
  listCampaigns,
  saveCampaign,
  deleteCampaign,
  updateCampaignStatus,
  analyzeCampaignPostMortemDirect,
  analyzeBoostOpportunities,
  generateCustomAudience,
  calculateBudgetProjection,
  chatWithTrafficManager,
  listAudiencePresets,
  saveAudiencePreset,
  deleteAudiencePreset,
  analyzeSinglePostForBoost,
  getBudgetSummary,
  updateBudgetConfig,
  syncInstagramPostInsights,
  syncAdAccountBalanceFromMeta,
  dispatchAutonomousBoost,
  scheduleAutonomousBoost,
  type BoostCampaignInput,
} from "../../src/services/traffic-ads-service.js";

let registered = false;

export function registerTrafficAdsIPC() {
  if (registered) return;
  registered = true;

  // 0. Resumo Financeiro & Carteira de Orçamento do Criador (Sincroniza automaticamente da Meta)
  ipcMain.handle("ads:get-budget-summary", async () => {
    try {
      await syncAdAccountBalanceFromMeta().catch(() => {});
      const summary = await getBudgetSummary();
      return { success: true, summary };
    } catch (err) {
      console.error("[ads IPC] Erro ao obter resumo de orçamento:", err);
      const summary = await getBudgetSummary();
      return { success: true, summary };
    }
  });

  ipcMain.handle("ads:sync-meta-balance", async () => {
    try {
      const result = await syncAdAccountBalanceFromMeta();
      const summary = await getBudgetSummary();
      return { success: true, result, summary };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao sincronizar saldo da Meta.",
      };
    }
  });

  ipcMain.handle("ads:update-budget-config", async (_event, data: { monthlyBudget?: number; strategyMode?: any }) => {
    try {
      const summary = await updateBudgetConfig(data);
      return { success: true, summary };
    } catch (err) {
      console.error("[ads IPC] Erro ao atualizar orçamento:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao atualizar orçamento.",
      };
    }
  });

  // 1. Listar campanhas e sumário executivo
  ipcMain.handle("ads:list-campaigns", async () => {
    try {
      return await listCampaigns();
    } catch (err) {
      console.error("[ads IPC] Erro ao listar campanhas:", err);
      return {
        campaigns: [],
        summary: {
          totalInvested: 0,
          totalFollowersGained: 0,
          totalSavesCount: 0,
          totalProfileVisits: 0,
          totalReach: 0,
          averageCostPerFollower: 0,
          averageCostPerSave: 0,
          averageCostPerVisit: 0,
          activeCampaignsCount: 0,
          completedCampaignsCount: 0,
        },
      };
    }
  });

  // 2. Salvar ou atualizar campanha
  ipcMain.handle("ads:save-campaign", async (_event, input: BoostCampaignInput) => {
    try {
      const campaign = await saveCampaign(input);
      return { success: true, campaign };
    } catch (err) {
      console.error("[ads IPC] Erro ao salvar campanha:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro desconhecido ao salvar campanha.",
      };
    }
  });

  // 3. Deletar campanha
  ipcMain.handle("ads:delete-campaign", async (_event, id: string) => {
    try {
      const success = await deleteCampaign(id);
      return { success };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao excluir campanha.",
      };
    }
  });

  // 3a. Alterar status da turbinada (PAUSAR, RETOMAR, CONCLUIR, ARQUIVAR)
  ipcMain.handle(
    "ads:update-campaign-status",
    async (
      _event,
      payload: { id: string; status: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | "DELETED" }
    ) => {
      try {
        if (!payload.id || !payload.status) {
          return { success: false, message: "Parâmetros inválidos." };
        }
        return await updateCampaignStatus(payload.id, payload.status);
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "Erro ao atualizar status da turbinada.",
        };
      }
    }
  );

  // 3b. Disparar Turbinada Imediata pelo Apolo (Meta API)
  ipcMain.handle("ads:dispatch-autonomous-boost", async (_event, params: { postId: string; dailyBudget?: number; durationDays?: number }) => {
    try {
      return await dispatchAutonomousBoost(params);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Erro ao disparar turbinada autônoma.",
      };
    }
  });

  // 3c. Agendar Turbinada pelo Radar do Apolo
  ipcMain.handle("ads:schedule-autonomous-boost", async (_event, params: { postId: string; scheduledDay: string; scheduledTime: string; dailyBudget?: number; durationDays?: number }) => {
    try {
      return await scheduleAutonomousBoost(params);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Erro ao agendar turbinada.",
      };
    }
  });

  // 4. Análise de Post-Mortem de turbinada com IA
  ipcMain.handle("ads:analyze-postmortem", async (_event, data: any) => {
    try {
      const result = await analyzeCampaignPostMortemDirect(data);
      return { success: true, analysis: result };
    } catch (err) {
      console.error("[ads IPC] Erro no post-mortem de turbinada:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao analisar performance da turbinada com IA.",
      };
    }
  });

  // 5. Radar de Oportunidades (Varre posts e gera ranking)
  ipcMain.handle("ads:analyze-opportunities", async (_event, forceRefresh?: boolean) => {
    try {
      const result = await analyzeBoostOpportunities(forceRefresh);
      return { success: true, ...result };
    } catch (err) {
      console.error("[ads IPC] Erro ao analisar oportunidades de turbinamento:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao avaliar candidatos a turbinamento.",
      };
    }
  });

  // 5b. Analisa um post específico sugerido pelo Analytics para turbinamento
  ipcMain.handle("ads:analyze-post-candidate", async (_event, postId: string) => {
    try {
      const result = await analyzeSinglePostForBoost(postId);
      return { success: true, ...result };
    } catch (err) {
      console.error("[ads IPC] Erro ao analisar post sugerido pelo analytics:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao consultar o Gestor de Tráfego sobre este post.",
      };
    }
  });

  // 6. Gerador de Públicos-Alvo com IA e Estudo de Post
  ipcMain.handle("ads:generate-audience", async (_event, payload: { theme?: string; postId?: string; objective?: string }) => {
    try {
      const audience = await generateCustomAudience(
        payload.theme || payload.postId || "",
        payload.objective || "PROFILE_VISITS",
        payload.postId
      );
      return { success: true, audience };
    } catch (err) {
      console.error("[ads IPC] Erro ao gerar público com IA:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao gerar segmentação de público com IA.",
      };
    }
  });

  // 7. Calculadora / Simulador de Projeção
  ipcMain.handle("ads:calculate-projection", async (_event, params: { dailyBudget: number; durationDays: number; objective: string }) => {
    try {
      const projection = calculateBudgetProjection(params);
      return { success: true, projection };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao calcular projeção.",
      };
    }
  });

  // 8. Chat Consultivo com o Gestor de Tráfego AI
  ipcMain.handle("ads:chat-consultant", async (_event, payload: { message: string; history?: any[] }) => {
    try {
      const response = await chatWithTrafficManager(payload.message, payload.history || []);
      return { success: true, ...response };
    } catch (err) {
      console.error("[ads IPC] Erro no chat do gestor de tráfego:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao consultar Gestor de Tráfego AI.",
      };
    }
  });

  // 9. Presets de público
  ipcMain.handle("ads:list-audiences", async () => {
    try {
      return await listAudiencePresets();
    } catch (err) {
      return [];
    }
  });

  ipcMain.handle("ads:save-audience", async (_event, preset: any) => {
    try {
      const saved = await saveAudiencePreset(preset);
      return { success: true, preset: saved };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao salvar público.",
      };
    }
  });

  ipcMain.handle("ads:delete-audience", async (_event, id: string) => {
    try {
      const success = await deleteAudiencePreset(id);
      return { success };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao excluir público.",
      };
    }
  });

  ipcMain.handle("ads:sync-instagram-insights", async (_event, postId: string) => {
    try {
      const res = await syncInstagramPostInsights(postId);
      return res;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao sincronizar métricas com o Instagram.",
      };
    }
  });

  console.log("[ads] IPC do Gestor de Tráfego & Anúncios registrado com sucesso.");
}
