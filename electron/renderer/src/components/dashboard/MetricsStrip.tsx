import React from "react";
import { AgentStage } from "../../types";
import { formatSeconds } from "../../utils/formatters";

interface MetricsStripProps {
  stages: AgentStage[];
  running: boolean;
  hasError: boolean;
  elapsedTime: number;
  profileHandle?: string;
}

export function MetricsStrip({ stages, running, hasError, elapsedTime, profileHandle }: MetricsStripProps) {
  const [handle, setHandle] = React.useState<string>(profileHandle || "@carregando...");

  React.useEffect(() => {
    if (profileHandle) {
      setHandle(profileHandle);
      return;
    }

    window.electronAPI?.getSettings?.().then((settings) => {
      if (settings?.instagramHandle) {
        setHandle(settings.instagramHandle);
      } else {
        setHandle("@perfil_conectado");
      }
    }).catch(() => {
      setHandle("@perfil_conectado");
    });
  }, [profileHandle]);

  const completedStages = stages.filter((s) => s.status === "completed").length;
  const overallProgress = Math.round((completedStages / stages.length) * 100);
  const activeStage = stages.find((s) => s.status === "running");

  return (
    <div className="metrics-strip">
      <div className="metric-box">
        <div className="metric-header">
          <span className="metric-label">PERFIL CONECTADO</span>
          <span className="metric-badge active">Online</span>
        </div>
        <strong className="metric-value">{handle}</strong>
        <span className="metric-subtext">Instagram Graph API v20.0</span>
      </div>

      <div className="metric-box">
        <div className="metric-header">
          <span className="metric-label">STATUS DO AGENTE</span>
          <span className={`metric-badge ${running ? "running" : hasError ? "error" : "success"}`}>
            {running ? "Processando" : hasError ? "Requer Ação" : "Pronto"}
          </span>
        </div>
        <strong className="metric-value">
          {running ? "RUNNING" : hasError ? "ERROR" : "IDLE / READY"}
        </strong>
        <span className="metric-subtext">
          {running ? `Etapa ativa: ${activeStage?.shortTitle || "Iniciando"}` : "Aguardando novos comandos"}
        </span>
      </div>

      <div className="metric-box">
        <div className="metric-header">
          <span className="metric-label">PROGRESSO DO PIPELINE</span>
          <span className="metric-badge">{completedStages} de {stages.length} etapas</span>
        </div>
        <strong className="metric-value">{overallProgress}%</strong>
        <div className="mini-progress-bar">
          <div
            className={`mini-progress-fill ${hasError ? "error" : running ? "running" : "success"}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="metric-box">
        <div className="metric-header">
          <span className="metric-label">TEMPO DECORRIDO</span>
          <span className="metric-badge">Pipeline</span>
        </div>
        <strong className="metric-value">
          {running ? formatSeconds(elapsedTime) : (stages.find((s) => s.id === "finalize")?.duration || "00:00s")}
        </strong>
        <span className="metric-subtext">Tempo total de processamento</span>
      </div>
    </div>
  );
}
