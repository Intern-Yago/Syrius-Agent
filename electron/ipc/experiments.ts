import { ipcMain } from "electron";
import {
  listContentExperiments,
  generateContentExperimentVariants,
  saveContentExperiment,
  updateExperimentStatus,
  deleteContentExperiment,
} from "../../src/services/experiment-service.js";

export function registerExperimentsIPC() {
  ipcMain.handle("experiments:list", async () => {
    try {
      const list = await listContentExperiments();
      return { success: true, experiments: list };
    } catch (err: any) {
      console.error("[experiments:list] Erro:", err);
      return { success: false, error: err?.message || "Erro ao listar experimentos." };
    }
  });

  ipcMain.handle(
    "experiments:generate-variants",
    async (
      _event,
      payload: { topic: string; format?: string; targetVariable?: "HOOK" | "VISUAL_DESIGN" | "CTA_SAVES" | "BODY_DENSITY" }
    ) => {
      try {
        const res = await generateContentExperimentVariants(
          payload.topic,
          payload.format || "CAROUSEL",
          payload.targetVariable || "HOOK"
        );
        return { success: true, data: res };
      } catch (err: any) {
        console.error("[experiments:generate-variants] Erro:", err);
        return { success: false, error: err?.message || "Erro ao gerar variantes A/B." };
      }
    }
  );

  ipcMain.handle("experiments:save", async (_event, payload: any) => {
    try {
      const created = await saveContentExperiment(payload);
      return { success: true, experiment: created };
    } catch (err: any) {
      console.error("[experiments:save] Erro:", err);
      return { success: false, error: err?.message || "Erro ao salvar experimento." };
    }
  });

  ipcMain.handle("experiments:update-status", async (_event, payload: { id: string; status: string }) => {
    try {
      const updated = await updateExperimentStatus(payload.id, payload.status);
      return { success: true, experiment: updated };
    } catch (err: any) {
      console.error("[experiments:update-status] Erro:", err);
      return { success: false, error: err?.message || "Erro ao atualizar status." };
    }
  });

  ipcMain.handle("experiments:delete", async (_event, id: string) => {
    try {
      await deleteContentExperiment(id);
      return { success: true };
    } catch (err: any) {
      console.error("[experiments:delete] Erro:", err);
      return { success: false, error: err?.message || "Erro ao excluir experimento." };
    }
  });

  console.log("[experiments] IPC de experimentos A/B registrado com sucesso.");
}
