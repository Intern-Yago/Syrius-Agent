import { ipcMain, BrowserWindow } from "electron";
import {
  getAnalyticsHistory,
  runAnalyticsAudit,
  AnalyticsReport,
} from "../../src/services/analytics-engine.js";
import { getSettings } from "../../src/config/settings.js";

let registered = false;
let analyticsTimer: NodeJS.Timeout | null = null;
let lastAnalyticsRunTime: number = 0;
let isAuditRunning: boolean = false;

const DAYS_MAP = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function registerAnalyticsIPC(getMainWindow?: () => BrowserWindow | null) {
  if (registered) return;
  registered = true;

  const notifyStatus = (running: boolean, report?: AnalyticsReport, error?: string) => {
    isAuditRunning = running;
    const window = getMainWindow ? getMainWindow() : null;
    if (window && !window.isDestroyed()) {
      window.webContents.send("analytics:status-change", {
        running,
        report,
        error,
      });
    }
  };

  // 1. Listar Histórico de Análises
  ipcMain.handle("analytics:list", async (): Promise<AnalyticsReport[]> => {
    return getAnalyticsHistory();
  });

  // 2. Verificar se há auditoria em andamento no momento
  ipcMain.handle("analytics:is-running", async (): Promise<boolean> => {
    return isAuditRunning;
  });

  // 3. Executar Nova Análise Qualitativa + Quantitativa com IA
  ipcMain.handle(
    "analytics:run",
    async (
      _event,
      options: { days?: number; startDate?: string; endDate?: string }
    ): Promise<{ success: boolean; report?: AnalyticsReport; error?: string }> => {
      if (isAuditRunning) {
        return { success: false, error: "Já existe uma auditoria em andamento no momento." };
      }

      try {
        console.log(`[analytics] Executando auditoria de inteligência IA (${options?.days || 7} dias)...`);
        notifyStatus(true);

        const res = await runAnalyticsAudit(options);
        if (res.success && res.report) {
          lastAnalyticsRunTime = Date.now();
          notifyStatus(false, res.report);
          return {
            success: true,
            report: res.report,
          };
        }

        notifyStatus(false, undefined, res.error);
        return res;
      } catch (error) {
        console.error("[analytics] Erro ao executar auditoria:", error);
        const errMsg = error instanceof Error ? error.message : "Erro ao executar análise de métricas.";
        notifyStatus(false, undefined, errMsg);
        return {
          success: false,
          error: errMsg,
        };
      }
    }
  );

  startAnalyticsDaemon(getMainWindow, notifyStatus);
  console.log("[analytics] IPC e Daemon de Analytics & Inteligência registrados com sucesso.");
}

/**
 * Daemon do Coletor de Analytics em Background
 */
function startAnalyticsDaemon(
  getMainWindow?: () => BrowserWindow | null,
  notifyStatus?: (running: boolean, report?: AnalyticsReport, error?: string) => void
) {
  if (analyticsTimer) clearInterval(analyticsTimer);

  analyticsTimer = setInterval(async () => {
    try {
      if (isAuditRunning) return;

      const settings = await getSettings();
      const schedule = settings.analyticsSchedule || {
        mode: "INTERVAL_HOURS",
        intervalHours: settings.analyticsIntervalHours || 24,
        selectedDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
        timeSlot: "20:00",
        dayOfMonth: 1,
      };

      if (schedule.mode === "MANUAL") {
        return;
      }

      const now = new Date();
      const currentDay = DAYS_MAP[now.getDay()];
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentHHmm = `${hours}:${minutes}`;

      let shouldRun = false;

      if (schedule.mode === "INTERVAL_HOURS") {
        const intervalHours = schedule.intervalHours || settings.analyticsIntervalHours || 24;
        const intervalMs = intervalHours * 3600 * 1000;
        if (Date.now() - lastAnalyticsRunTime >= intervalMs) {
          shouldRun = true;
        }
      } else if (schedule.mode === "WEEKDAYS") {
        const selectedDays = schedule.selectedDays || [];
        const isSelectedDay = selectedDays.some(
          (d) => d.toLowerCase().trim() === currentDay.toLowerCase().trim()
        );
        if (isSelectedDay && currentHHmm === (schedule.timeSlot || "20:00")) {
          if (Date.now() - lastAnalyticsRunTime > 70_000) {
            shouldRun = true;
          }
        }
      } else if (schedule.mode === "WEEKLY") {
        const targetDay = schedule.selectedDays?.[0] || "Domingo";
        if (
          targetDay.toLowerCase().trim() === currentDay.toLowerCase().trim() &&
          currentHHmm === (schedule.timeSlot || "22:00")
        ) {
          if (Date.now() - lastAnalyticsRunTime > 70_000) {
            shouldRun = true;
          }
        }
      } else if (schedule.mode === "MONTHLY") {
        const targetDayOfMonth = schedule.dayOfMonth || 1;
        if (
          now.getDate() === targetDayOfMonth &&
          currentHHmm === (schedule.timeSlot || "22:00")
        ) {
          if (Date.now() - lastAnalyticsRunTime > 70_000) {
            shouldRun = true;
          }
        }
      }

      if (shouldRun) {
        console.log(`[analytics:daemon] Disparando auditoria autônoma agendada (${schedule.mode})...`);
        notifyStatus?.(true);
        const res = await runAnalyticsAudit({ days: 7 });
        if (res.success && res.report) {
          lastAnalyticsRunTime = Date.now();
          notifyStatus?.(false, res.report);
        } else {
          notifyStatus?.(false, undefined, res.error);
        }
      }
    } catch (daemonErr) {
      console.error("[analytics:daemon] Erro no ciclo do daemon:", daemonErr);
      notifyStatus?.(false, undefined, daemonErr instanceof Error ? daemonErr.message : "Erro no daemon.");
    }
  }, 30_000);
}
