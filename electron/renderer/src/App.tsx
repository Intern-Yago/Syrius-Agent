import React, { useState, useEffect } from "react";
import { Page, AgentLog, AgentStage } from "./types";
import { INITIAL_STAGES } from "./constants/stages";
import { formatTimestamp } from "./utils/formatters";
import { detectStage, isStageCompleted, extractProgress } from "./utils/stageDetector";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { DashboardPage } from "./pages/DashboardPage";
import { AgencyMeetingPage } from "./pages/AgencyMeetingPage";
import { SchedulePage } from "./pages/SchedulePage";
import { PostsPage } from "./pages/PostsPage";
import { ActivitiesPage } from "./pages/ActivitiesPage";
import { InteractionsPage } from "./pages/InteractionsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { TestsPage } from "./pages/TestsPage";
import { TrendingPage } from "./pages/TrendingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { IconX, IconLoader, IconClock, IconTag, IconCalendar } from "./components/common/Icons";
import { ActivitiesProvider, useActivities } from "./context/ActivitiesContext";
import { ModalProvider, useModal } from "./context/ModalContext";
import { RepoToPostModal } from "./components/modals/RepoToPostModal";
import { ExperimentsModal } from "./components/modals/ExperimentsModal";

function AppContent() {
  const { syncAgentRunningState, publishPost: executePublishPost } = useActivities();
  const { toast } = useModal();
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [navTargetId, setNavTargetId] = useState<string | null>(null);
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [repoInitialQuery, setRepoInitialQuery] = useState("");
  const [experimentsModalOpen, setExperimentsModalOpen] = useState(false);
  const [dueAlert, setDueAlert] = useState<{
    slot: any;
    dayOfWeek: string;
    timeSlot: string;
    topic: string;
    postId?: string;
  } | null>(null);
  const [publishingDuePost, setPublishingDuePost] = useState(false);

  const [logs, setLogs] = useState<AgentLog[]>(() => {
    try {
      const saved = localStorage.getItem("social_agent_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stages, setStages] = useState<AgentStage[]>(() => {
    try {
      const saved = localStorage.getItem("social_agent_stages");
      if (!saved) return INITIAL_STAGES;
      const parsed: AgentStage[] = JSON.parse(saved);
      const finalizeCompleted = parsed.some((s) => s.id === "finalize" && s.status === "completed");

      return INITIAL_STAGES.map((initial) => {
        const matching = parsed.find((p) => p.id === initial.id);
        if (!matching) return initial;
        return {
          ...initial,
          status: matching.status === "error" && finalizeCompleted ? "completed" : matching.status,
          logs: matching.logs || [],
          duration: matching.duration,
          meta: matching.meta,
          errorMessage: finalizeCompleted ? undefined : matching.errorMessage,
          retryable: finalizeCompleted ? false : matching.retryable,
        };
      });
    } catch {
      return INITIAL_STAGES;
    }
  });

  const [running, setRunning] = useState(false);
  const [failedStage, setFailedStage] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem("social_agent_stages");
      if (!saved) return null;
      const parsed: AgentStage[] = JSON.parse(saved);
      const finalizeCompleted = parsed.some((s) => s.id === "finalize" && s.status === "completed");
      if (finalizeCompleted) return null;
      const err = parsed.find((s) => s.status === "error");
      return err ? err.id : null;
    } catch {
      return null;
    }
  });
  const [retryingStage, setRetryingStage] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [runStartTime, setRunStartTime] = useState<number | null>(null);
  const [runElapsedTime, setRunElapsedTime] = useState<number>(0);
  const [systemAlert, setSystemAlert] = useState<{
    type: "gemini_quota" | "cloudflare_credits" | "error";
    title: string;
    message: string;
  } | null>(null);

  // Fila de Geração Sequencial de Slots do Cronograma (FIFO)
  const [generationQueue, setGenerationQueue] = useState<ScheduleSlot[]>([]);
  const [activeQueueSlot, setActiveQueueSlot] = useState<ScheduleSlot | null>(null);

  useEffect(() => {
    if (!running && generationQueue.length > 0) {
      const nextSlot = generationQueue[0];
      setGenerationQueue((prev) => prev.slice(1));
      setActiveQueueSlot(nextSlot);
      runAgent(undefined, nextSlot);
    } else if (!running && generationQueue.length === 0) {
      setActiveQueueSlot(null);
    }
  }, [running, generationQueue]);

  function handleEnqueueSlot(slot: ScheduleSlot) {
    if (activeQueueSlot?.id === slot.id) return;
    if (generationQueue.some((s) => s.id === slot.id)) return;

    if (!running) {
      setActiveQueueSlot(slot);
      runAgent(undefined, slot);
    } else {
      setGenerationQueue((prev) => [...prev, slot]);
    }
  }

  function handleEnqueueMultipleSlots(slotsToQueue: ScheduleSlot[]) {
    const unqueued = slotsToQueue.filter(
      (s) => s.id !== activeQueueSlot?.id && !generationQueue.some((q) => q.id === s.id)
    );
    if (unqueued.length === 0) return;

    if (!running) {
      const [first, ...rest] = unqueued;
      setActiveQueueSlot(first);
      setGenerationQueue((prev) => [...prev, ...rest]);
      runAgent(undefined, first);
    } else {
      setGenerationQueue((prev) => [...prev, ...unqueued]);
    }
  }

  function handleRemoveFromQueue(slotId: string) {
    setGenerationQueue((prev) => prev.filter((s) => s.id !== slotId));
  }

  function handleClearQueue() {
    setGenerationQueue([]);
  }

  function handleResetDashboard() {
    try {
      localStorage.removeItem("social_agent_stages");
      localStorage.removeItem("social_agent_logs");
    } catch {}
    setStages(INITIAL_STAGES);
    setLogs([]);
    setFailedStage(null);
    setRetryingStage(null);
    setSelectedStageId(null);
    setSystemAlert(null);
  }

  // Persistência em LocalStorage para evitar perder estado em Ctrl+R
  useEffect(() => {
    try {
      localStorage.setItem("social_agent_stages", JSON.stringify(stages));
    } catch {}
  }, [stages]);

  useEffect(() => {
    try {
      localStorage.setItem("social_agent_logs", JSON.stringify(logs));
    } catch {}
  }, [logs]);

  // Timer para tempo decorrido
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (running && runStartTime) {
      interval = setInterval(() => {
        setRunElapsedTime(Math.floor((Date.now() - runStartTime) / 1000));
      }, 1000);
    } else if (!running && interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running, runStartTime]);

  // Listener IPC de logs
  useEffect(() => {
    if (!window.electronAPI?.onAgentLog) {
      return;
    }

    const removeListener = window.electronAPI.onAgentLog((rawLog) => {
      const enrichedLog: AgentLog = {
        ...rawLog,
        timestamp: rawLog.timestamp || formatTimestamp(),
      };

      setLogs((current) => [...current, enrichedLog]);
      processAgentLog(enrichedLog);
    });

    return removeListener;
  }, []);

  // Sincronização do estado do agente com o ActivitiesContext
  useEffect(() => {
    syncAgentRunningState(running, failedStage);
  }, [running, failedStage, syncAgentRunningState]);

  // Listener para Alerta de Publicação no Horário Agendado
  useEffect(() => {
    if (!window.electronAPI?.onSchedulePublishAlert) return;
    const removeListener = window.electronAPI.onSchedulePublishAlert((alert) => {
      setDueAlert(alert);
    });
    return removeListener;
  }, []);

  async function handleConfirmDuePublish() {
    if (!dueAlert?.postId) return;
    try {
      setPublishingDuePost(true);
      const res = await executePublishPost(dueAlert.postId, dueAlert.topic, dueAlert.slot?.format);
      if (res.success) {
        toast.success(`Publicação "${dueAlert.topic}" enviada com sucesso para o Instagram!`);
        setDueAlert(null);
      } else {
        toast.error(`Erro ao publicar: ${res.error || "Erro desconhecido"}`);
      }
    } catch (err) {
      toast.error(`Erro ao publicar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setPublishingDuePost(false);
    }
  }

  function processAgentLog(log: AgentLog) {
    const message = log.message;
    let stageId = detectStage(message);

    const isRetryWarning =
      message.includes("Tentando novamente") ||
      message.includes("Tentativa") ||
      message.includes("Aviso:") ||
      message.includes("⚠️");

    const isGeminiQuota =
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("resource_exhausted") ||
      message.toLowerCase().includes("rate limit");

    const isCloudflareCredits =
      message.includes("10000") ||
      message.toLowerCase().includes("insufficient funds") ||
      message.toLowerCase().includes("credits") ||
      message.toLowerCase().includes("billing") ||
      message.toLowerCase().includes("payment required") ||
      message.includes("402");

    if (isGeminiQuota) {
      setSystemAlert({
        type: "gemini_quota",
        title: "Cota do Gemini Esgotada",
        message: "Limite de cota/minuto atingido no Google Gemini. Alterne a versão do modelo nas Configurações ou adicione outra chave no .env.",
      });
    } else if (isCloudflareCredits) {
      setSystemAlert({
        type: "cloudflare_credits",
        title: "Falha de Créditos Cloudflare",
        message: "Créditos insuficientes ou token inválido na Cloudflare AI/R2. Verifique sua conta no dashboard da Cloudflare.",
      });
    }

    if (!stageId && log.type === "error" && !isRetryWarning) {
      // Se for um erro real e não identificou pelo texto, atribui à etapa que está em execução
      const runningStage = stages.find((s) => s.status === "running");
      if (runningStage) {
        stageId = runningStage.id;
      }
    }

    if (!stageId) return;

    setStages((current) => {
      const stageIndex = current.findIndex((s) => s.id === stageId);
      if (stageIndex === -1) return current;

      return current.map((stage, idx) => {
        if (idx < stageIndex && stage.status === "running") {
          const duration = stage.startedAt
            ? `${((Date.now() - stage.startedAt) / 1000).toFixed(1)}s`
            : stage.duration;
          return {
            ...stage,
            status: "completed",
            duration: duration || "concluído",
            errorMessage: undefined,
            retryable: false,
          };
        }

        if (stage.id !== stageId) return stage;

        let newStatus = stage.status;
        let startedAt = stage.startedAt;
        let duration = stage.duration;
        let errorMessage = stage.errorMessage;
        let summary = stage.summary;

        if (log.type === "error" && !isRetryWarning) {
          newStatus = "error";
          errorMessage = log.message.trim();
        } else if (isStageCompleted(message) || message.includes("CONTEÚDO GERADO") || message.includes("POST SALVO") || message.includes("APPROVED")) {
          newStatus = "completed";
          errorMessage = undefined;
          if (startedAt) {
            duration = `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;
          }
        } else if (stage.status !== "completed") {
          newStatus = "running";
          if (!startedAt) startedAt = Date.now();
        }

        if (message.includes("DECISÃO DO GESTOR") || message.includes("Tema:")) {
          const topicMatch = message.match(/Tema:\s*(.+)/i) || message.match(/"topic":\s*"([^"]+)"/i);
          if (topicMatch) summary = `Tema: ${topicMatch[1]}`;
        } else if (message.includes("Score geral:")) {
          const scoreMatch = message.match(/Score geral:\s*([\d.]+)/i);
          if (scoreMatch) summary = `Score: ${scoreMatch[1]}/10`;
        } else if (message.includes("Imagens geradas:")) {
          const imgMatch = message.match(/Imagens geradas:\s*(\d+\/\d+)/i);
          if (imgMatch) summary = `${imgMatch[1]} geradas`;
        } else if (message.includes("Post salvo:")) {
          const idMatch = message.match(/Post salvo:\s*([a-z0-9_-]+)/i);
          if (idMatch) summary = `ID: ${idMatch[1].slice(0, 8)}...`;
        }

        const progress = extractProgress(message) ?? stage.progress;

        return {
          ...stage,
          status: newStatus,
          startedAt,
          duration,
          progress,
          summary: summary || stage.summary,
          errorMessage: newStatus === "error" ? errorMessage : undefined,
          retryable: newStatus === "error",
          logs: [...stage.logs, log],
        };
      });
    });

    if (log.type === "error" && !isRetryWarning) {
      setFailedStage(stageId);
    }
  }

  async function runAgent(fromStage?: string, slot?: any) {
    if (running) return;

    setRunning(true);
    setFailedStage(null);
    setRunStartTime(Date.now());
    setRunElapsedTime(0);

    if (!fromStage) {
      setLogs([]);
      setSelectedStageId(null);
      setStages(
        INITIAL_STAGES.map((stage) => ({
          ...stage,
          status: "pending",
          startedAt: undefined,
          duration: undefined,
          errorMessage: undefined,
          logs: [],
          retryable: false,
        }))
      );
    } else {
      const startIndex = stages.findIndex((s) => s.id === fromStage);
      setRetryingStage(fromStage);
      setStages((current) => {
        return current.map((stage, idx) => {
          if (idx >= startIndex) {
            return {
              ...stage,
              status: "pending",
              startedAt: undefined,
              duration: undefined,
              errorMessage: undefined,
              logs: [],
              retryable: false,
            };
          }
          return stage;
        });
      });
    }

    try {
      const result = await window.electronAPI.runAgent(fromStage, slot);

      if (result.success) {
        setFailedStage(null);
        setStages((current) =>
          current.map((stage) => ({
            ...stage,
            status: "completed",
            errorMessage: undefined,
            retryable: false,
          }))
        );
      } else {
        const errorLog: AgentLog = {
          type: "error",
          message: result.message ?? "Erro ao executar o agente.",
          timestamp: formatTimestamp(),
        };

        setLogs((current) => [...current, errorLog]);
        processAgentLog(errorLog);
      }
    } catch (error) {
      const errorLog: AgentLog = {
        type: "error",
        message: error instanceof Error ? error.message : "Erro desconhecido ao executar pipeline.",
        timestamp: formatTimestamp(),
      };

      setLogs((current) => [...current, errorLog]);
      processAgentLog(errorLog);
    } finally {
      setRunning(false);
      setRetryingStage(null);
    }
  }

  async function handleStopAgent() {
    try {
      if (window.electronAPI?.stopAgent) {
        await window.electronAPI.stopAgent();
      }
      setRunning(false);
      setRetryingStage(null);
    } catch (err) {
      console.error("Erro ao parar agente:", err);
    }
  }

  return (
    <div className="app">
      <Sidebar
        currentPage={currentPage}
        onNavigate={(page) => setCurrentPage(page)}
        running={running}
        systemAlert={systemAlert}
        onDismissAlert={() => setSystemAlert(null)}
      />

      <main className="main">
        <Topbar
          currentPage={currentPage}
          running={running}
          elapsedTime={runElapsedTime}
          onRunAgent={() => runAgent()}
          onStopAgent={handleStopAgent}
          onOpenRepoToPost={() => setRepoModalOpen(true)}
          onOpenExperiments={() => setExperimentsModalOpen(true)}
        />

        <section className="content">
          {currentPage === "home" && (
            <DashboardPage
              stages={stages}
              logs={logs}
              running={running}
              failedStage={failedStage}
              retryingStage={retryingStage}
              selectedStageId={selectedStageId}
              elapsedTime={runElapsedTime}
              onRunAgent={() => runAgent()}
              onRetryStage={(stageId) => runAgent(stageId)}
              onSelectStage={(id) => setSelectedStageId((curr) => (curr === id ? null : id))}
              onClearLogs={handleResetDashboard}
            />
          )}

          {currentPage === "activities" && (
            <ActivitiesPage
              onNavigate={(page, targetId) => {
                if (targetId?.startsWith("repo:")) {
                  const repoSlug = targetId.replace("repo:", "");
                  setRepoInitialQuery(repoSlug);
                  setRepoModalOpen(true);
                  setCurrentPage("posts");
                  return;
                }
                setCurrentPage(page);
                if (targetId) setNavTargetId(targetId);
              }}
            />
          )}

          {currentPage === "agency" && (
            <AgencyMeetingPage
              onProduceSlot={(slot) => {
                handleEnqueueSlot(slot);
                setCurrentPage("home");
              }}
              onNavigateToPosts={() => setCurrentPage("posts")}
              onNavigateToSchedule={() => setCurrentPage("schedule")}
            />
          )}

          {currentPage === "schedule" && (
            <SchedulePage
              onProduceSlot={(slot) => handleEnqueueSlot(slot)}
              onNavigate={(page, targetId) => {
                setCurrentPage(page as Page);
                if (targetId) setNavTargetId(targetId);
              }}
              generationQueue={generationQueue}
              activeQueueSlot={activeQueueSlot}
              onEnqueueSlot={handleEnqueueSlot}
              onEnqueueMultipleSlots={handleEnqueueMultipleSlots}
              onRemoveFromQueue={handleRemoveFromQueue}
              onClearQueue={handleClearQueue}
              onOpenRepoToPost={() => setRepoModalOpen(true)}
              onOpenExperiments={() => setExperimentsModalOpen(true)}
            />
          )}

          {currentPage === "trending" && (
            <TrendingPage
              onGeneratePost={(slot) => {
                handleEnqueueSlot(slot as any);
                setCurrentPage("home");
              }}
              onNavigateToPosts={() => setCurrentPage("posts")}
              onOpenRepoToPost={(q) => {
                setRepoInitialQuery(q || "");
                setRepoModalOpen(true);
              }}
            />
          )}

          {currentPage === "posts" && (
            <PostsPage
              initialPostId={navTargetId}
              onNavigateToActivities={() => setCurrentPage("activities")}
              onOpenRepoToPost={() => {
                setRepoInitialQuery("");
                setRepoModalOpen(true);
              }}
              onOpenExperiments={() => setExperimentsModalOpen(true)}
            />
          )}

          {currentPage === "interactions" && (
            <InteractionsPage onNavigateToSchedule={() => setCurrentPage("schedule")} />
          )}

          {currentPage === "analytics" && <AnalyticsPage />}

          {currentPage === "tests" && (
            <TestsPage
              onTriggerRun={(stageId) => {
                setCurrentPage("home");
                runAgent(stageId);
              }}
            />
          )}

          {currentPage === "settings" && <SettingsPage />}
        </section>
      </main>

      {/* POPUP MODAL: HORA DE PUBLICAR POST AGENDADO */}
      {dueAlert && (
        <div className="post-modal-backdrop" onClick={() => setDueAlert(null)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "520px" }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <IconClock size={12} />
                  HORÁRIO DO POST ATINGIDO
                </span>
                <h2>Publicar Post Agendado?</h2>
              </div>
              <button className="modal-close" onClick={() => setDueAlert(null)}>
                <IconX size={18} />
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#f4f4f5", lineHeight: "1.5", marginBottom: "14px" }}>
              Chegou o horário planejado no seu Cronograma Editorial para a publicação no Instagram:
            </p>

            <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <IconCalendar size={11} />
                  <span>{dueAlert.dayOfWeek} às {dueAlert.timeSlot}</span>
                </span>
                {dueAlert.slot?.editorialPillar && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(147, 51, 234, 0.15)", color: "#c084fc", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <IconTag size={10} color="#c084fc" />
                    <span>{dueAlert.slot.editorialPillar}</span>
                  </span>
                )}
              </div>
              <strong style={{ fontSize: "14px", color: "#fafafa", lineHeight: "1.4", display: "block" }}>{dueAlert.topic}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setDueAlert(null)}
                disabled={publishingDuePost}
              >
                Lembrar Mais Tarde
              </button>

              <button
                type="button"
                className="btn-modal-save"
                onClick={handleConfirmDuePublish}
                disabled={publishingDuePost}
                style={{ background: "#0ea5e9" }}
              >
                {publishingDuePost ? <IconLoader size={13} /> : null}
                <span>{publishingDuePost ? "Publicando no Instagram..." : "Sim, Publicar Agora"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPO-TO-POST (GITHUB ENGINE) */}
      <RepoToPostModal
        isOpen={repoModalOpen}
        initialQuery={repoInitialQuery}
        onClose={() => {
          setRepoModalOpen(false);
          setRepoInitialQuery("");
        }}
        onDispatchToPipeline={(slot) => {
          handleEnqueueSlot(slot as any);
          setCurrentPage("home");
        }}
      />

      {/* MODAL: LABORATÓRIO DE TESTES A/B */}
      <ExperimentsModal
        isOpen={experimentsModalOpen}
        onClose={() => setExperimentsModalOpen(false)}
        onDispatchVariant={(slot) => {
          handleEnqueueSlot(slot as any);
          setCurrentPage("home");
        }}
      />
    </div>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[React ErrorBoundary]", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            background: "#09090b",
            color: "#fafafa",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "640px",
              width: "100%",
              background: "#18181b",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              borderRadius: "16px",
              padding: "32px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f87171",
                  flexShrink: 0,
                }}
              >
                <IconX size={22} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#fafafa" }}>Ocorreu um erro inesperado na interface</h2>
                <span style={{ fontSize: "12px", color: "#a1a1aa" }}>O aplicativo capturou a exceção com segurança. Você pode copiar os detalhes ou recarregar.</span>
              </div>
            </div>

            <div
              style={{
                background: "#09090b",
                borderRadius: "8px",
                padding: "14px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "20px",
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#fca5a5",
                maxHeight: "180px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.toString() || "Erro desconhecido"}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(this.state.error?.stack || String(this.state.error));
                }}
                className="secondary-button"
                style={{ padding: "10px 16px", fontSize: "13px" }}
              >
                Copiar Detalhes
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="primary-button"
                style={{ padding: "10px 20px", fontSize: "13px", fontWeight: "700" }}
              >
                Recarregar Interface (F5)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <ModalProvider>
        <ActivitiesProvider>
          <AppContent />
        </ActivitiesProvider>
      </ModalProvider>
    </ErrorBoundary>
  );
}

export default App;