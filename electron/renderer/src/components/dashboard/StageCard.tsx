import React from "react";
import { AgentStage } from "../../types";
import {
  StageIcon,
  IconCheck,
  IconX,
  IconLoader,
  IconCircleDot,
  IconClock,
  IconAlertTriangle,
  IconRotateCcw,
  IconSparkles,
} from "../common/Icons";

interface StageCardProps {
  stage: AgentStage;
  index: number;
  isSelected: boolean;
  isRetryingThis: boolean;
  running: boolean;
  onSelect: () => void;
  onRetry: () => void;
}

export function StageCard({
  stage,
  index,
  isSelected,
  isRetryingThis,
  running,
  onSelect,
  onRetry,
}: StageCardProps) {
  return (
    <div
      className={`kanban-card stage-${stage.status} ${isSelected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <div className="kanban-card-top">
        <div className="stage-number-pill">
          <span className="stage-icon">
            <StageIcon type={stage.iconType} size={16} />
          </span>
          <span className="stage-num">0{index + 1}</span>
        </div>

        <div className="stage-status-indicator">
          {stage.status === "completed" && (
            <span className="badge-pill badge-success">
              <IconCheck size={12} /> Concluído
            </span>
          )}
          {stage.status === "running" && (
            <span className="badge-pill badge-running">
              <IconLoader size={12} /> Em execução
            </span>
          )}
          {stage.status === "error" && (
            <span className="badge-pill badge-error">
              <IconX size={12} /> Falhou
            </span>
          )}
          {stage.status === "pending" && (
            <span className="badge-pill badge-pending">
              <IconCircleDot size={12} /> Aguardando
            </span>
          )}
        </div>
      </div>

      <div className="kanban-card-body">
        <h3 className="kanban-stage-title">{stage.title}</h3>
        <p className="kanban-stage-desc">{stage.description}</p>

        {stage.summary && (
          <div className="kanban-summary-tag">
            <IconSparkles size={12} />
            <strong>{stage.summary}</strong>
          </div>
        )}

        {stage.progress && (
          <div className="kanban-progress-pill">
            <span>Progresso:</span>
            <strong>{stage.progress}</strong>
          </div>
        )}
      </div>

      {stage.status === "error" && (
        <div className="kanban-error-box" onClick={(e) => e.stopPropagation()}>
          <div className="kanban-error-title">
            <IconAlertTriangle size={13} />
            <strong>Falha nesta etapa</strong>
          </div>
          <p className="kanban-error-msg">
            {stage.errorMessage || "Ocorreu um erro durante a execução desta etapa."}
          </p>
          <button
            className="btn-retry-step"
            onClick={onRetry}
            disabled={running}
          >
            {isRetryingThis ? (
              <>
                <IconLoader size={12} />
                <span>Reiniciando...</span>
              </>
            ) : (
              <>
                <IconRotateCcw size={12} />
                <span>Tentar novamente daqui</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="kanban-card-footer">
        <span className="card-footer-logs">
          {stage.logs.length > 0 ? `${stage.logs.length} eventos registrados` : "Sem logs ainda"}
        </span>
        {stage.duration && (
          <span className="card-duration-badge">
            <IconClock size={11} /> {stage.duration}
          </span>
        )}
      </div>
    </div>
  );
}
