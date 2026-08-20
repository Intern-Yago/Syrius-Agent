import React, { useState, useEffect } from "react";
import { useActivities } from "../context/ActivitiesContext";
import { Page, Activity, ActivityStatus } from "../types";
import {
  IconActivity,
  IconPlay,
  IconPause,
  IconStop,
  IconRotateCcw,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconClock,
  IconArrowUpRight,
  IconLoader,
  IconTrash,
  IconCopy,
  IconSparkles,
  IconLayers,
  IconZap,
  IconChart,
} from "../components/common/Icons";

interface ActivitiesPageProps {
  onNavigate: (page: Page, targetId?: string) => void;
}

export function ActivitiesPage({ onNavigate }: ActivitiesPageProps) {
  const {
    activities,
    activeCount,
    pauseActivity,
    resumeActivity,
    stopActivity,
    retryActivity,
    dismissActivity,
    clearCompletedActivities,
  } = useActivities();

  const [filter, setFilter] = useState<"ALL" | "RUNNING" | "COMPLETED" | "ERROR">("ALL");
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Timer em tempo real para atualizar o contador de tempo decorrido a cada segundo
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredActivities = activities.filter((act) => {
    if (filter === "RUNNING") return act.status === "running" || act.status === "paused";
    if (filter === "COMPLETED") return act.status === "completed";
    if (filter === "ERROR") return act.status === "error";
    return true;
  });

  async function handleRetry(activity: Activity) {
    try {
      setRetryingId(activity.id);
      await retryActivity(activity.id, onNavigate);
    } finally {
      setRetryingId(null);
    }
  }

  function handleCopyLog(id: string, logText?: string) {
    if (!logText) return;
    navigator.clipboard.writeText(logText);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2500);
  }

  function formatStartTime(timestamp: number) {
    try {
      return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  }

  function formatElapsedTime(startedAt: number) {
    const diffSec = Math.max(0, Math.floor((now - startedAt) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    if (mins === 0) return `${secs}s`;
    return `${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
  }

  return (
    <div className="posts-page-container" style={{ paddingBottom: "60px" }}>
      {/* CABEÇALHO */}
      <div className="page-header">
        <div>
          <div className="section-tag" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span className="section-dot" style={{ background: activeCount > 0 ? "#38bdf8" : "#71717a" }} />
            <span>CENTRAL DE PROCESSOS EM BACKGROUND</span>
          </div>
          <h2>Atividades em Andamento</h2>
          <p>
            Monitore, pause ou recomece tarefas autônomas de IA, gerações de conteúdo, auditorias e publicações no Instagram.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {activities.some((a) => a.status === "completed" || a.status === "cancelled") && (
            <button
              type="button"
              className="secondary-button"
              onClick={clearCompletedActivities}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            >
              <IconTrash size={13} />
              <span>Limpar Concluídas</span>
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          paddingBottom: "14px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {[
            { id: "ALL", label: `Todas (${activities.length})` },
            { id: "RUNNING", label: `Em Andamento (${activeCount})` },
            { id: "COMPLETED", label: `Concluídas (${activities.filter((a) => a.status === "completed").length})` },
            { id: "ERROR", label: `Com Erro (${activities.filter((a) => a.status === "error").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-btn ${filter === tab.id ? "active" : ""}`}
              onClick={() => setFilter(tab.id as any)}
              style={{ fontSize: "12px", padding: "5px 12px" }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
          {activeCount > 0 ? (
            <strong style={{ color: "#38bdf8" }}>⚡ {activeCount} {activeCount === 1 ? "processo ativo" : "processos ativos"}</strong>
          ) : (
            "Nenhum processo ativo no momento"
          )}
        </span>
      </div>

      {/* ESTADO VAZIO / SEM ATIVIDADES */}
      {filteredActivities.length === 0 ? (
        <div
          className="page-placeholder"
          style={{
            padding: "80px 24px",
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(0, 0, 0, 0.2) 100%)",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
            borderRadius: "16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#38bdf8",
            }}
          >
            <IconActivity size={26} />
          </div>

          <h3 style={{ fontSize: "18px", color: "#fafafa", marginBottom: "8px", fontWeight: "700" }}>
            Nada acontecendo por hora
          </h3>
          <p style={{ fontSize: "13px", color: "#a1a1aa", maxWidth: "480px", margin: "0 auto 24px", lineHeight: "1.5" }}>
            Nenhum processo em execução no momento. Todas as publicações, auditorias e pipelines do gestor estão em repouso prontos para novas tarefas!
          </p>

          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="primary-button"
              onClick={() => onNavigate("home")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconZap size={14} />
              <span>Gerar Post no Dashboard</span>
            </button>

            <button
              className="secondary-button"
              onClick={() => onNavigate("posts")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconLayers size={14} />
              <span>Ver Publicações</span>
            </button>

            <button
              className="secondary-button"
              onClick={() => onNavigate("analytics")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconChart size={14} />
              <span>Auditar Métricas IA</span>
            </button>
          </div>
        </div>
      ) : (
        /* LISTA DE CARDS DE ATIVIDADES */
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredActivities.map((act) => {
            const isRunning = act.status === "running";
            const isPaused = act.status === "paused";
            const isError = act.status === "error";
            const isCompleted = act.status === "completed";
            const isCancelled = act.status === "cancelled";

            return (
              <div
                key={act.id}
                style={{
                  background: isError
                    ? "linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)"
                    : isRunning
                    ? "linear-gradient(180deg, rgba(14, 165, 233, 0.08) 0%, rgba(17, 17, 20, 0.95) 100%)"
                    : "#111114",
                  border: `1px solid ${
                    isError
                      ? "rgba(239, 68, 68, 0.5)"
                      : isRunning
                      ? "rgba(56, 189, 248, 0.4)"
                      : isPaused
                      ? "rgba(245, 158, 11, 0.4)"
                      : "rgba(255, 255, 255, 0.08)"
                  }`,
                  borderRadius: "14px",
                  padding: "20px",
                  boxShadow: isError
                    ? "0 0 25px rgba(239, 68, 68, 0.15)"
                    : isRunning
                    ? "0 0 25px rgba(56, 189, 248, 0.15)"
                    : "none",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                {/* LINHA SUPERIOR: TÍTULO NAVEGÁVEL + BADGE DE STATUS + HORÁRIO */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "260px" }}>
                    {/* TÍTULO CLICÁVEL COM REDIRECIONAMENTO */}
                    <div
                      onClick={() => onNavigate(act.targetPage, act.targetId)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        color: "#fafafa",
                        transition: "color 0.15s ease",
                      }}
                      title="Clique para ir diretamente à tela desta atividade"
                      onMouseEnter={(e) => ((e.currentTarget.style.color = "#38bdf8"))}
                      onMouseLeave={(e) => ((e.currentTarget.style.color = "#fafafa"))}
                    >
                      <h3 style={{ fontSize: "16px", margin: 0, fontWeight: "700" }}>{act.title}</h3>
                      <span
                        style={{
                          fontSize: "11px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          color: "#38bdf8",
                          background: "rgba(56, 189, 248, 0.12)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontWeight: "600",
                        }}
                      >
                        <span>Ir para tela</span>
                        <IconArrowUpRight size={12} />
                      </span>
                    </div>

                    {act.subtitle && (
                      <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "4px 0 0 0", fontWeight: "500" }}>
                        {act.subtitle}
                      </p>
                    )}
                  </div>

                  {/* STATUS PILL + HORÁRIO / TEMPO DECORRIDO */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        color: isRunning ? "#38bdf8" : "#a1a1aa",
                        fontWeight: isRunning ? "700" : "500",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <IconClock size={11} />
                      <span>{isRunning ? `Tempo decorrido: ${formatElapsedTime(act.startedAt)}` : `Iniciado às ${formatStartTime(act.startedAt)}`}</span>
                    </span>

                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: isError
                          ? "rgba(239, 68, 68, 0.2)"
                          : isRunning
                          ? "rgba(56, 189, 248, 0.2)"
                          : isPaused
                          ? "rgba(245, 158, 11, 0.2)"
                          : isCompleted
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(255, 255, 255, 0.1)",
                        color: isError
                          ? "#f87171"
                          : isRunning
                          ? "#38bdf8"
                          : isPaused
                          ? "#fbbf24"
                          : isCompleted
                          ? "#34d399"
                          : "#a1a1aa",
                        border: `1px solid ${
                          isError
                            ? "rgba(239, 68, 68, 0.4)"
                            : isRunning
                            ? "rgba(56, 189, 248, 0.4)"
                            : isPaused
                            ? "rgba(245, 158, 11, 0.4)"
                            : isCompleted
                            ? "rgba(16, 185, 129, 0.4)"
                            : "rgba(255, 255, 255, 0.2)"
                        }`,
                      }}
                    >
                      {isRunning && <IconLoader size={11} />}
                      {isCompleted && <IconCheck size={11} />}
                      {isError && <IconAlertTriangle size={11} />}
                      {isPaused && <IconPause size={11} />}
                      <span>
                        {isRunning
                          ? "Em Andamento"
                          : isPaused
                          ? "Pausado"
                          : isError
                          ? "Erro / Falha"
                          : isCompleted
                          ? "Concluído"
                          : "Cancelado"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* MENSAGEM DE STATUS ESPECÍFICA */}
                <div style={{ marginBottom: "14px" }}>
                  <span style={{ fontSize: "13px", color: isError ? "#fca5a5" : "#e4e4e7", fontWeight: "600", display: "block" }}>
                    {act.statusMessage}
                  </span>
                </div>

                {/* BARRA DE PROGRESSO & PORCENTAGEM ESCRITA */}
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "700" }}>
                      Progresso da Tarefa
                    </span>
                    <strong style={{ fontSize: "12px", color: isError ? "#f87171" : isRunning ? "#38bdf8" : "#fafafa" }}>
                      {act.progress}%
                    </strong>
                  </div>

                  <div
                    style={{
                      height: "8px",
                      width: "100%",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(Math.max(act.progress, 0), 100)}%`,
                        background: isError
                          ? "#ef4444"
                          : isPaused
                          ? "#f59e0b"
                          : isCompleted
                          ? "#10b981"
                          : "linear-gradient(90deg, #0ea5e9, #38bdf8, #60a5fa)",
                        borderRadius: "4px",
                        transition: "width 0.4s ease",
                        boxShadow: isRunning ? "0 0 10px rgba(56, 189, 248, 0.5)" : "none",
                      }}
                    />
                  </div>
                </div>

                {/* PLAYER DE ÁUDIO EMBUTIDO NA ATIVIDADE (SE VOZ SINTETIZADA) */}
                {act.type === "voice_synthesis" && act.meta?.audioBase64 && (
                  <div style={{ marginTop: "12px", marginBottom: "8px", padding: "10px 12px", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                      Áudio Gerado com Sucesso:
                    </span>
                    <audio controls src={act.meta.audioBase64} style={{ width: "100%", height: "36px" }} />
                  </div>
                )}

                {/* BOX EXPANSÍVEL DE LOG DO ERRO (CASO TENHA DADO ERRO) */}
                {isError && (
                  <div
                    style={{
                      marginTop: "14px",
                      marginBottom: "16px",
                      background: "rgba(0, 0, 0, 0.6)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: "#f87171", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                        <IconAlertTriangle size={12} color="#f87171" />
                        <span>Log do Erro / Diagnóstico Técnico:</span>
                      </span>

                      {act.errorLog && (
                        <button
                          type="button"
                          onClick={() => handleCopyLog(act.id, act.errorLog)}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "none",
                            borderRadius: "4px",
                            padding: "3px 8px",
                            color: copiedLogId === act.id ? "#34d399" : "#a1a1aa",
                            fontSize: "10px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {copiedLogId === act.id ? <IconCheck size={10} /> : <IconCopy size={10} />}
                          <span>{copiedLogId === act.id ? "Copiado!" : "Copiar Log"}</span>
                        </button>
                      )}
                    </div>

                    <pre
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        color: "#fca5a5",
                        fontFamily: "monospace",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxHeight: "140px",
                        overflowY: "auto",
                        lineHeight: "1.4",
                      }}
                    >
                      {act.errorLog || act.statusMessage}
                    </pre>
                  </div>
                )}

                {/* BOTÕES DE AÇÃO / CONTROLES */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "10px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onNavigate(act.targetPage, act.targetId)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#38bdf8",
                      fontSize: "12px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: 0,
                    }}
                  >
                    <span>Ver processo em detalhes</span>
                    <IconArrowUpRight size={13} />
                  </button>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* BOTÕES ENQUANTO EM EXECUÇÃO: PAUSAR E PARAR */}
                    {isRunning && (
                      <>
                        {act.canPause && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => pauseActivity(act.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
                          >
                            <IconPause size={12} />
                            <span>Pausar</span>
                          </button>
                        )}

                        {act.canStop && (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => stopActivity(act.id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              padding: "6px 12px",
                              color: "#f87171",
                              borderColor: "rgba(239, 68, 68, 0.3)",
                            }}
                          >
                            <IconStop size={12} color="#f87171" />
                            <span>Parar</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* BOTÕES QUANDO PAUSADO: PLAY E PARAR */}
                    {isPaused && (
                      <>
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => resumeActivity(act.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px", background: "#f59e0b" }}
                        >
                          <IconPlay size={12} />
                          <span>Retomar (Play)</span>
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => stopActivity(act.id)}
                          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "6px 12px" }}
                        >
                          <IconStop size={12} />
                          <span>Parar</span>
                        </button>
                      </>
                    )}

                    {/* BOTÃO QUANDO DEU ERRO: RECOMEÇAR */}
                    {isError && (
                      <>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => dismissActivity(act.id)}
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          Descartar
                        </button>

                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => handleRetry(act)}
                          disabled={retryingId === act.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            padding: "6px 14px",
                            background: "#ef4444",
                            borderColor: "#f87171",
                          }}
                        >
                          {retryingId === act.id ? <IconLoader size={12} /> : <IconRotateCcw size={12} />}
                          <span>{retryingId === act.id ? "Recomeçando..." : "Recomeçar"}</span>
                        </button>
                      </>
                    )}

                    {/* BOTÃO QUANDO CONCLUÍDO OU CANCELADO */}
                    {(isCompleted || isCancelled) && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => dismissActivity(act.id)}
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
