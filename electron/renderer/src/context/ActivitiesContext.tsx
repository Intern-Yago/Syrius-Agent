import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Activity, ActivityType, ActivityStatus, Page } from "../types";
import { detectStage, extractProgress } from "../utils/stageDetector";

interface ActivitiesContextValue {
  activities: Activity[];
  activeCount: number;
  isPostPublishing: (postId: string) => boolean;
  getPostPublishingTask: (postId: string) => Activity | undefined;
  isPostRegenerating: (postId: string, slideNumber?: number) => boolean;
  getPostRegeneratingTask: (postId: string, slideNumber?: number) => Activity | undefined;
  isPostVideoRegenerating: (postId: string) => boolean;
  getPostVideoRegeneratingTask: (postId: string) => Activity | undefined;
  publishPost: (
    postId: string,
    topic?: string,
    format?: string,
    options?: { deletePrevious?: boolean }
  ) => Promise<{ success: boolean; publishedMediaId?: string; error?: string; permalink?: string }>;
  pauseActivity: (id: string) => void;
  resumeActivity: (id: string) => void;
  stopActivity: (id: string) => Promise<void>;
  retryActivity: (id: string, onNavigate?: (page: Page) => void) => Promise<void>;
  dismissActivity: (id: string) => void;
  clearCompletedActivities: () => void;
  registerOrUpdateActivity: (activity: Partial<Activity> & { id: string; type: ActivityType; title: string; targetPage: Page }) => void;
  syncAgentRunningState: (running: boolean, failedStage?: string | null, slot?: any) => void;
}

const ActivitiesContext = createContext<ActivitiesContextValue | null>(null);

export function ActivitiesProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [configuredModel, setConfiguredModel] = useState<string>("gemini-3.6-flash");

  // 1. Carregar configurações e publicações ativas da camada Electron ao inicializar
  useEffect(() => {
    async function initActiveTasks() {
      try {
        if (window.electronAPI?.getSettings) {
          const s = await window.electronAPI.getSettings();
          if (s?.defaultGeminiModel) {
            setConfiguredModel(s.defaultGeminiModel);
          }
        }

        try {
          if (window.electronAPI?.getActivePublishings) {
            const tasks = await window.electronAPI.getActivePublishings();
            if (Array.isArray(tasks) && tasks.length > 0) {
              setActivities((prev) => {
                const next = [...prev];
                for (const t of tasks) {
                  const id = `publish-${t.postId}`;
                  const idx = next.findIndex((a) => a.id === id);
                  const activityItem: Activity = {
                    id,
                    type: "publishing",
                    title: "Publicação no Instagram",
                    subtitle: t.topic,
                    targetPage: "posts",
                    targetId: t.postId,
                    status: t.status,
                    statusMessage: t.message || "Publicando na Meta API...",
                    progress: t.progress || 20,
                    startedAt: t.startedAt || Date.now(),
                    errorLog: t.error,
                    canStop: t.status === "running",
                    canRetry: t.status === "error",
                    meta: { format: t.format, postId: t.postId },
                  };
                  if (idx >= 0) next[idx] = activityItem;
                  else next.unshift(activityItem);
                }
                return next;
              });
            }
          }
        } catch {
          // ignora se em transição
        }

        try {
          if (window.electronAPI?.getActiveRegenerations) {
            const regTasks = await window.electronAPI.getActiveRegenerations();
            if (Array.isArray(regTasks) && regTasks.length > 0) {
              setActivities((prev) => {
                const next = [...prev];
                for (const t of regTasks) {
                  const isVideo = t.taskId?.startsWith("regen-video") || (t.format === "REEL_SCRIPT" && t.slideNumber === 1 && t.message?.toLowerCase().includes("vídeo"));
                  const id = isVideo ? (t.taskId || `regen-video-${t.postId}`) : `regen-${t.postId}-${t.slideNumber}`;
                  const idx = next.findIndex((a) => a.id === id);
                  const activityItem: Activity = {
                    id,
                    type: isVideo ? "video_regeneration" : "image_regeneration",
                    title: isVideo ? "Renderização de Vídeo Reels (IA)" : `Regeneração de Arte (Slide ${t.slideNumber})`,
                    subtitle: t.topic,
                    targetPage: "posts",
                    targetId: t.postId,
                    status: t.status,
                    statusMessage: t.message || (isVideo ? "Renderizando vídeo com IA..." : "Gerando arte com Recraft IA..."),
                    progress: t.progress || 35,
                    startedAt: t.startedAt || Date.now(),
                    errorLog: t.error,
                    canStop: false,
                    canRetry: t.status === "error",
                    meta: { format: t.format, postId: t.postId, slideNumber: t.slideNumber },
                  };
                  if (idx >= 0) next[idx] = activityItem;
                  else next.unshift(activityItem);
                }
                return next;
              });
            }
          }
        } catch {
          // ignora se em transição
        }
      } catch (err) {
        console.error("Erro ao sincronizar tarefas ativas:", err);
      }
    }

    initActiveTasks();
  }, []);

  // 2. Listener de Progresso de Publicação via IPC
  useEffect(() => {
    if (!window.electronAPI?.onPublishProgress) return;

    const unsub = window.electronAPI.onPublishProgress((data) => {
      setActivities((prev) => {
        const id = `publish-${data.postId}`;
        const existing = prev.find((a) => a.id === id);
        const updatedStatus: ActivityStatus = data.status;

        const updated: Activity = {
          id,
          type: "publishing",
          title: "Publicação no Instagram",
          subtitle: data.topic || existing?.subtitle || `Post #${data.postId.slice(0, 8)}`,
          targetPage: "posts",
          targetId: data.postId,
          status: updatedStatus,
          statusMessage: data.message || (updatedStatus === "completed" ? "Publicado com sucesso no Instagram!" : "Publicando..."),
          progress: data.progress !== undefined ? data.progress : updatedStatus === "completed" ? 100 : 50,
          startedAt: existing?.startedAt || Date.now(),
          errorLog: data.error,
          canStop: updatedStatus === "running",
          canRetry: updatedStatus === "error",
          meta: { format: data.format, postId: data.postId, publishedMediaId: data.publishedMediaId },
        };

        const filtered = prev.filter((a) => a.id !== id);
        return [updated, ...filtered];
      });
    });

    return unsub;
  }, []);

  // 3. Listener de Progresso de Regeneração de Imagens e Vídeos via IPC
  useEffect(() => {
    if (!window.electronAPI?.onRegenerateProgress) return;

    const unsub = window.electronAPI.onRegenerateProgress((data) => {
      setActivities((prev) => {
        const isVideo = data.taskId?.startsWith("regen-video") || (data.format === "REEL_SCRIPT" && data.slideNumber === 1 && data.message?.toLowerCase().includes("vídeo"));
        const id = isVideo ? (data.taskId || `regen-video-${data.postId}`) : `regen-${data.postId}-${data.slideNumber}`;
        const existing = prev.find((a) => a.id === id);
        const updatedStatus: ActivityStatus = data.status;

        const updated: Activity = {
          id,
          type: isVideo ? "video_regeneration" : "image_regeneration",
          title: isVideo ? "Renderização de Vídeo Reels (IA)" : `Regeneração de Arte (Slide ${data.slideNumber})`,
          subtitle: data.topic || existing?.subtitle || `Post #${data.postId.slice(0, 8)}`,
          targetPage: "posts",
          targetId: data.postId,
          status: updatedStatus,
          statusMessage: data.message || (updatedStatus === "completed" ? (isVideo ? "Vídeo pronto!" : "Nova arte pronta!") : (isVideo ? "Renderizando vídeo com IA..." : "Gerando arte com IA...")),
          progress: data.progress !== undefined ? data.progress : updatedStatus === "completed" ? 100 : 50,
          startedAt: existing?.startedAt || Date.now(),
          errorLog: data.error,
          canStop: false,
          canRetry: updatedStatus === "error",
          meta: { format: data.format, postId: data.postId, slideNumber: data.slideNumber, imagePath: data.imagePath },
        };

        const filtered = prev.filter((a) => a.id !== id);
        return [updated, ...filtered];
      });
    });

    return unsub;
  }, []);

  // 3. Listener de Analytics via IPC
  useEffect(() => {
    if (!window.electronAPI?.onAnalyticsStatusChange) return;

    const unsub = window.electronAPI.onAnalyticsStatusChange((data) => {
      setActivities((prev) => {
        const id = "analytics-audit";
        if (data.running) {
          const existing = prev.find((a) => a.id === id);
          const runningTask: Activity = {
            id,
            type: "analytics",
            title: "Auditoria de Analytics & Inteligência IA",
            subtitle: "Diagnóstico Macro & Micro no Instagram",
            targetPage: "analytics",
            status: "running",
            statusMessage: "Coletando métricas e processando diagnóstico com Gemini...",
            progress: 55,
            startedAt: existing?.startedAt || Date.now(),
            canStop: false,
            canRetry: false,
          };
          return [runningTask, ...prev.filter((a) => a.id !== id)];
        } else if (data.report) {
          const completedTask: Activity = {
            id,
            type: "analytics",
            title: "Auditoria de Analytics & Inteligência IA",
            subtitle: `Score: ${data.report.score?.toFixed(1) || "10"}/10 - ${data.report.periodLabel || "Últimos 7 dias"}`,
            targetPage: "analytics",
            status: "completed",
            statusMessage: "Auditoria de inteligência finalizada com sucesso!",
            progress: 100,
            startedAt: Date.now() - 5000,
            canStop: false,
            canRetry: false,
          };
          return [completedTask, ...prev.filter((a) => a.id !== id)];
        } else if (data.error) {
          const errorTask: Activity = {
            id,
            type: "analytics",
            title: "Auditoria de Analytics & Inteligência IA",
            subtitle: "Falha na auditoria",
            targetPage: "analytics",
            status: "error",
            statusMessage: data.error,
            progress: 0,
            startedAt: Date.now(),
            errorLog: data.error,
            canStop: false,
            canRetry: true,
          };
          return [errorTask, ...prev.filter((a) => a.id !== id)];
        }
        return prev;
      });
    });

    return unsub;
  }, []);

  // 4. Listener de Sala de Reunião com a Gestora Editorial via IPC
  useEffect(() => {
    if (!window.electronAPI?.onAgencyStatusChange) return;

    const unsub = window.electronAPI.onAgencyStatusChange((data) => {
      setActivities((prev) => {
        const id = "agency-meeting-thinking";
        if (data.isProcessing) {
          const existing = prev.find((a) => a.id === id);
          const runningTask: Activity = {
            id,
            type: "task",
            title: "Sala de Reunião Editorial",
            subtitle: data.userText ? `"${data.userText.slice(0, 60)}..."` : "Estelar está analisando métricas e elaborando a resposta...",
            targetPage: "agency_meeting",
            status: "running",
            statusMessage: "Estelar está analisando métricas, histórico e elaborando a resposta...",
            progress: 50,
            startedAt: existing?.startedAt || Date.now(),
            canStop: false,
            canRetry: false,
          };
          return [runningTask, ...prev.filter((a) => a.id !== id)];
        } else {
          if (data.error) {
            const errorTask: Activity = {
              id,
              type: "task",
              title: "Sala de Reunião Editorial",
              subtitle: "Erro no processamento da resposta",
              targetPage: "agency_meeting",
              status: "error",
              statusMessage: data.error,
              progress: 0,
              startedAt: Date.now(),
              errorLog: data.error,
              canStop: false,
              canRetry: false,
            };
            return [errorTask, ...prev.filter((a) => a.id !== id)];
          }
          return prev.filter((a) => a.id !== id);
        }
      });
    });

    return unsub;
  }, []);

  // 4. Listener de Testes via IPC
  useEffect(() => {
    if (!window.electronAPI?.onTestStatusChange) return;

    const unsub = window.electronAPI.onTestStatusChange((data) => {
      setActivities((prev) => {
        const id = `test-${data.filename}`;
        const existing = prev.find((a) => a.id === id);

        if (data.status === "running") {
          const runningTask: Activity = {
            id,
            type: "tests",
            title: `Execução de Teste: ${data.filename}`,
            subtitle: "Central de Testes Unitários",
            targetPage: "tests",
            targetId: data.filename,
            status: "running",
            statusMessage: "Executando suíte e validando integrações...",
            progress: 50,
            startedAt: existing?.startedAt || Date.now(),
            canStop: true,
            canRetry: false,
          };
          return [runningTask, ...prev.filter((a) => a.id !== id)];
        } else if (data.status === "success") {
          const completedTask: Activity = {
            id,
            type: "tests",
            title: `Execução de Teste: ${data.filename}`,
            subtitle: `Concluído em ${data.duration || "poucos segundos"}`,
            targetPage: "tests",
            targetId: data.filename,
            status: "completed",
            statusMessage: "Todos os testes passaram com sucesso!",
            progress: 100,
            startedAt: existing?.startedAt || Date.now(),
            canStop: false,
            canRetry: true,
          };
          return [completedTask, ...prev.filter((a) => a.id !== id)];
        } else if (data.status === "error") {
          const errorTask: Activity = {
            id,
            type: "tests",
            title: `Execução de Teste: ${data.filename}`,
            subtitle: "Falha nas validações do teste",
            targetPage: "tests",
            targetId: data.filename,
            status: "error",
            statusMessage: `Falha no teste ${data.filename}`,
            progress: 0,
            startedAt: existing?.startedAt || Date.now(),
            errorLog: `Erro durante a execução de src/tests/${data.filename}`,
            canStop: false,
            canRetry: true,
          };
          return [errorTask, ...prev.filter((a) => a.id !== id)];
        }
        return prev;
      });
    });

    return unsub;
  }, []);

  // 5. Listener de Logs do Agente para atualizar mensagens dinâmicas
  useEffect(() => {
    if (!window.electronAPI?.onAgentLog) return;

    const unsub = window.electronAPI.onAgentLog((log) => {
      const msg = log.message;
      const stage = detectStage(msg);

      setActivities((prev) => {
        const id = "agent-pipeline";
        const existing = prev.find((a) => a.id === id);
        if (!existing || existing.status === "completed" || existing.status === "cancelled") {
          return prev;
        }

        let updatedMessage = existing.statusMessage;
        let updatedProgress = existing.progress;
        let updatedSubtitle = existing.subtitle;

        if (msg.includes("DECISÃO DO GESTOR") || msg.includes("Tema:")) {
          const topicMatch = msg.match(/Tema:\s*(.+)/i) || msg.match(/"topic":\s*"([^"]+)"/i);
          if (topicMatch) {
            updatedSubtitle = `Tema: ${topicMatch[1].trim()}`;
          }
        }

        if (stage === "strategy") {
          updatedMessage = "Definindo pauta editorial e estratégia de crescimento...";
          updatedProgress = Math.max(updatedProgress, 15);
        } else if (stage === "content") {
          const modelMatch = msg.match(/(?:modelo|model):\s*([a-zA-Z0-9\.\-_]+)/i) || msg.match(/(?:usando|com)\s+(gemini[a-zA-Z0-9\.\-_]*)/i);
          const rawModel = modelMatch ? modelMatch[1] : (configuredModel || "gemini-3.6-flash");
          const displayName = rawModel.toLowerCase().startsWith("gemini") ? rawModel : `Gemini (${rawModel})`;
          updatedMessage = `Criando copy e roteiro completo com ${displayName}...`;
          updatedProgress = Math.max(updatedProgress, 35);
        } else if (stage === "database") {
          updatedMessage = "Persistindo estrutura e slides no PostgreSQL...";
          updatedProgress = Math.max(updatedProgress, 50);
        } else if (stage === "images") {
          const imgMatch = msg.match(/Imagens geradas:\s*(\d+\/\d+)/i) || msg.match(/Renderizando slide\s*(\d+)/i);
          updatedMessage = imgMatch ? `Gerando imagem ${imgMatch[1]} (Cloudflare Recraft)...` : "Gerando imagens com IA (Cloudflare Recraft v3)...";
          updatedProgress = Math.max(updatedProgress, 70);
        } else if (stage === "storage") {
          updatedMessage = "Upload de mídias e geração de URLs no MinIO/R2...";
          updatedProgress = Math.max(updatedProgress, 85);
        } else if (stage === "review") {
          updatedMessage = "Revisando qualidade visual e regras editoriais...";
          updatedProgress = Math.max(updatedProgress, 92);
        } else if (stage === "finalize") {
          updatedMessage = "Finalizando publicação e registrando métricas...";
          updatedProgress = Math.max(updatedProgress, 98);
        }

        const explicitProgress = extractProgress(msg);
        if (explicitProgress) {
          const numMatch = explicitProgress.match(/(\d+)%/);
          if (numMatch) updatedProgress = Math.max(updatedProgress, parseInt(numMatch[1], 10));
        }

        if (log.type === "error" && !msg.includes("Tentando") && !msg.includes("⚠️")) {
          return [
            {
              ...existing,
              status: "error" as ActivityStatus,
              statusMessage: msg.trim(),
              errorLog: msg.trim(),
              canStop: false,
              canRetry: true,
            },
            ...prev.filter((a) => a.id !== id),
          ];
        }

        return [
          {
            ...existing,
            subtitle: updatedSubtitle,
            statusMessage: updatedMessage,
            progress: updatedProgress,
          },
          ...prev.filter((a) => a.id !== id),
        ];
      });
    });

    return unsub;
  }, []);

  // Helper para sincronizar estado do Agente (iniciado / finalizado / com erro)
  const syncAgentRunningState = useCallback((running: boolean, failedStage?: string | null, slot?: any) => {
    setActivities((prev) => {
      const id = "agent-pipeline";
      const existing = prev.find((a) => a.id === id);

      if (running) {
        const agentTask: Activity = {
          id,
          type: "agent",
          title: "Gestor Autônomo de Conteúdo",
          subtitle: slot ? `Slot: ${slot.topic} (${slot.format})` : "Pipeline Completo de Criação de Post",
          targetPage: "home",
          status: "running",
          statusMessage: "Iniciando pipeline autônomo de IA...",
          progress: 5,
          startedAt: Date.now(),
          canPause: true,
          canStop: true,
          canRetry: false,
          meta: { slot },
        };
        return [agentTask, ...prev.filter((a) => a.id !== id)];
      }

      if (!running && existing && existing.status === "running") {
        if (failedStage) {
          const errored: Activity = {
            ...existing,
            status: "error",
            statusMessage: `Falha na etapa "${failedStage}" do pipeline`,
            errorLog: `Erro reportado na etapa [${failedStage}]. Você pode clicar em Recomeçar para tentar novamente a partir deste ponto.`,
            canPause: false,
            canStop: false,
            canRetry: true,
          };
          return [errored, ...prev.filter((a) => a.id !== id)];
        } else {
          const completed: Activity = {
            ...existing,
            status: "completed",
            statusMessage: "Post gerado com sucesso e disponível nas Publicações!",
            progress: 100,
            canPause: false,
            canStop: false,
            canRetry: false,
          };
          return [completed, ...prev.filter((a) => a.id !== id)];
        }
      }

      return prev;
    });
  }, []);

  // Helper para verificar se um determinado post está em processo de publicação
  const isPostPublishing = useCallback(
    (postId: string): boolean => {
      const id = `publish-${postId}`;
      const task = activities.find((a) => a.id === id);
      return Boolean(task && task.status === "running");
    },
    [activities]
  );

  const getPostPublishingTask = useCallback(
    (postId: string): Activity | undefined => {
      const id = `publish-${postId}`;
      return activities.find((a) => a.id === id);
    },
    [activities]
  );

  // Helper para verificar se um determinado post/slide está em processo de regeneração de arte
  const isPostRegenerating = useCallback(
    (postId: string, slideNumber?: number): boolean => {
      return activities.some((a) => {
        if (a.type !== "image_regeneration") return false;
        if (a.status !== "running" && a.status !== "paused") return false;
        if (a.targetId !== postId) return false;
        if (slideNumber !== undefined && a.meta?.slideNumber !== undefined) {
          return a.meta.slideNumber === slideNumber;
        }
        return true;
      });
    },
    [activities]
  );

  const getPostRegeneratingTask = useCallback(
    (postId: string, slideNumber?: number): Activity | undefined => {
      return activities.find((a) => {
        if (a.type !== "image_regeneration") return false;
        if (a.targetId !== postId) return false;
        if (slideNumber !== undefined && a.meta?.slideNumber !== undefined) {
          return a.meta.slideNumber === slideNumber;
        }
        return true;
      });
    },
    [activities]
  );

  // Helper para verificar se um determinado post está em processo de renderização/regeneração de VÍDEO
  const isPostVideoRegenerating = useCallback(
    (postId: string): boolean => {
      return activities.some((a) => {
        const isMatch = a.id === `regen-video-${postId}` || (a.targetId === postId && (a.type === "video_regeneration" || a.id.startsWith("regen-video")));
        return isMatch && (a.status === "running" || a.status === "paused");
      });
    },
    [activities]
  );

  const getPostVideoRegeneratingTask = useCallback(
    (postId: string): Activity | undefined => {
      return activities.find((a) => {
        const isMatch = a.id === `regen-video-${postId}` || (a.targetId === postId && (a.type === "video_regeneration" || a.id.startsWith("regen-video")));
        return isMatch;
      });
    },
    [activities]
  );

  // Ação global de publicar post
  const publishPost = useCallback(
    async (postId: string, topic?: string, format?: string, options?: { deletePrevious?: boolean }) => {
      const id = `publish-${postId}`;
      const initialTask: Activity = {
        id,
        type: "publishing",
        title: "Publicação no Instagram",
        subtitle: topic || `Post ID: ${postId.slice(0, 8)}`,
        targetPage: "posts",
        targetId: postId,
        status: "running",
        statusMessage: options?.deletePrevious
          ? "Excluindo post anterior e republicando na Meta API..."
          : "Iniciando publicação na Meta Graph API...",
        progress: 10,
        startedAt: Date.now(),
        canStop: false,
        canRetry: false,
        meta: { postId, topic, format },
      };

      setActivities((prev) => [initialTask, ...prev.filter((a) => a.id !== id)]);

      try {
        const res = await window.electronAPI.publishPost(postId, options);
        if (res.success) {
          setActivities((prev) => {
            const completed: Activity = {
              id,
              type: "publishing",
              title: "Publicação no Instagram",
              subtitle: topic || `Post ID: ${postId.slice(0, 8)}`,
              targetPage: "posts",
              targetId: postId,
              status: "completed",
              statusMessage: "Publicado com sucesso no Instagram!",
              progress: 100,
              startedAt: initialTask.startedAt,
              canStop: false,
              canRetry: false,
              meta: { postId, topic, format, publishedMediaId: res.publishedMediaId },
            };
            return [completed, ...prev.filter((a) => a.id !== id)];
          });
          return res;
        } else {
          const errorMsg = res.error || "Erro ao publicar na Meta API.";
          setActivities((prev) => {
            const errored: Activity = {
              id,
              type: "publishing",
              title: "Publicação no Instagram",
              subtitle: topic || `Post ID: ${postId.slice(0, 8)}`,
              targetPage: "posts",
              targetId: postId,
              status: "error",
              statusMessage: errorMsg,
              progress: 0,
              startedAt: initialTask.startedAt,
              errorLog: errorMsg,
              canStop: false,
              canRetry: true,
              meta: { postId, topic, format },
            };
            return [errored, ...prev.filter((a) => a.id !== id)];
          });
          return res;
        }
      } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido na publicação.";
        setActivities((prev) => {
          const errored: Activity = {
            id,
            type: "publishing",
            title: "Publicação no Instagram",
            subtitle: topic || `Post ID: ${postId.slice(0, 8)}`,
            targetPage: "posts",
            targetId: postId,
            status: "error",
            statusMessage: errorMsg,
            progress: 0,
            startedAt: initialTask.startedAt,
            errorLog: errorMsg,
            canStop: false,
            canRetry: true,
            meta: { postId, topic, format },
          };
          return [errored, ...prev.filter((a) => a.id !== id)];
        });
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  const pauseActivity = useCallback((id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "paused" as ActivityStatus, statusMessage: "Processo pausado temporariamente." } : a))
    );
  }, []);

  const resumeActivity = useCallback((id: string) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "running" as ActivityStatus, statusMessage: "Processo retomado." } : a))
    );
  }, []);

  const stopActivity = useCallback(async (id: string) => {
    // 1. Se for o pipeline do agente
    if (id === "agent-pipeline" || id.startsWith("agent")) {
      try {
        if (window.electronAPI?.stopAgent) {
          await window.electronAPI.stopAgent();
        }
      } catch (err) {
        console.error("Erro ao cancelar agente:", err);
      }
      window.dispatchEvent(new CustomEvent("syrius:stop-agent"));
    } else if (id.startsWith("test-")) {
      const testFile = id.replace("test-", "");
      try {
        if (window.electronAPI?.cancelTest) {
          await window.electronAPI.cancelTest(testFile);
        }
      } catch (err) {
        console.error("Erro ao cancelar teste:", err);
      }
    } else if (id.startsWith("voice-")) {
      try {
        if (window.electronAPI?.cancelVoiceTTS) {
          await window.electronAPI.cancelVoiceTTS();
        }
      } catch (err) {
        console.error("Erro ao cancelar operação de voz:", err);
      }
    }

    setActivities((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "cancelled" as ActivityStatus,
              statusMessage: "Operação interrompida pelo usuário.",
              canStop: false,
              canPause: false,
            }
          : a
      )
    );
  }, []);

  const retryActivity = useCallback(
    async (id: string, onNavigate?: (page: Page) => void) => {
      const task = activities.find((a) => a.id === id);
      if (!task) return;

      if (task.type === "publishing" && task.targetId) {
        await publishPost(task.targetId, task.subtitle, task.meta?.format);
      } else if (task.type === "agent") {
        if (onNavigate) onNavigate("home");
        try {
          if (window.electronAPI?.runAgent) {
            await window.electronAPI.runAgent();
          }
        } catch (err) {
          console.error("Erro ao reiniciar agente:", err);
        }
      } else if (task.type === "analytics") {
        if (onNavigate) onNavigate("analytics");
        try {
          if (window.electronAPI?.runAnalyticsAudit) {
            await window.electronAPI.runAnalyticsAudit({ days: 7 });
          }
        } catch (err) {
          console.error("Erro ao reiniciar analytics:", err);
        }
      } else if (task.type === "tests" && task.targetId) {
        if (onNavigate) onNavigate("tests");
        try {
          if (window.electronAPI?.runTest) {
            await window.electronAPI.runTest(task.targetId);
          }
        } catch (err) {
          console.error("Erro ao reiniciar teste:", err);
        }
      }
    },
    [activities, publishPost]
  );

  const dismissActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearCompletedActivities = useCallback(() => {
    setActivities((prev) => prev.filter((a) => a.status === "running" || a.status === "paused"));
  }, []);

  const registerOrUpdateActivity = useCallback(
    (item: Partial<Activity> & { id: string; type: ActivityType; title: string; targetPage: Page }) => {
      setActivities((prev) => {
        const existing = prev.find((a) => a.id === item.id);
        const updated: Activity = {
          id: item.id,
          type: item.type,
          title: item.title,
          subtitle: item.subtitle || existing?.subtitle,
          targetPage: item.targetPage,
          targetId: item.targetId || existing?.targetId,
          status: item.status || existing?.status || "running",
          statusMessage: item.statusMessage || existing?.statusMessage || "Processando...",
          progress: item.progress !== undefined ? item.progress : existing?.progress || 0,
          startedAt: existing?.startedAt || Date.now(),
          errorLog: item.errorLog || existing?.errorLog,
          canPause: item.canPause !== undefined ? item.canPause : existing?.canPause,
          canStop: item.canStop !== undefined ? item.canStop : existing?.canStop,
          canRetry: item.canRetry !== undefined ? item.canRetry : existing?.canRetry,
          meta: { ...existing?.meta, ...item.meta },
        };
        return [updated, ...prev.filter((a) => a.id !== item.id)];
      });
    },
    []
  );

  const activeCount = useMemo(() => {
    return activities.filter((a) => a.status === "running" || a.status === "paused").length;
  }, [activities]);

  const value = useMemo<ActivitiesContextValue>(
    () => ({
      activities,
      activeCount,
      isPostPublishing,
      getPostPublishingTask,
      isPostRegenerating,
      getPostRegeneratingTask,
      isPostVideoRegenerating,
      getPostVideoRegeneratingTask,
      publishPost,
      pauseActivity,
      resumeActivity,
      stopActivity,
      retryActivity,
      dismissActivity,
      clearCompletedActivities,
      registerOrUpdateActivity,
      syncAgentRunningState,
    }),
    [
      activities,
      activeCount,
      isPostPublishing,
      getPostPublishingTask,
      isPostRegenerating,
      getPostRegeneratingTask,
      isPostVideoRegenerating,
      getPostVideoRegeneratingTask,
      publishPost,
      pauseActivity,
      resumeActivity,
      stopActivity,
      retryActivity,
      dismissActivity,
      clearCompletedActivities,
      registerOrUpdateActivity,
      syncAgentRunningState,
    ]
  );

  return <ActivitiesContext.Provider value={value}>{children}</ActivitiesContext.Provider>;
}

export function useActivities(): ActivitiesContextValue {
  const ctx = useContext(ActivitiesContext);
  if (!ctx) {
    throw new Error("useActivities deve ser utilizado dentro de um ActivitiesProvider");
  }
  return ctx;
}
