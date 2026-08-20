import { ipcMain } from "electron";
import { inspectGitHubRepository, GitHubRepoAnalysis } from "../../src/services/github-repo-service.js";

export function registerGitHubIPC() {
  ipcMain.handle(
    "github:inspect-repo",
    async (
      _event,
      urlOrSlug: string
    ): Promise<{ success: boolean; data?: GitHubRepoAnalysis; error?: string }> => {
      try {
        console.log(`[GitHub IPC] Inspecionando repositório: ${urlOrSlug}...`);
        const data = await inspectGitHubRepository(urlOrSlug);
        return { success: true, data };
      } catch (err: any) {
        console.error("[GitHub IPC Error]", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro desconhecido ao analisar repositório.",
        };
      }
    }
  );
}
