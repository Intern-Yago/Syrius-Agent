import React from "react";
import { AgentStage } from "../../types";
import { StageCard } from "./StageCard";
import { IconRotateCcw } from "../common/Icons";

interface PipelineWorkflowProps {
  stages: AgentStage[];
  running: boolean;
  hasError: boolean;
  failedStage: string | null;
  retryingStage: string | null;
  selectedStageId: string | null;
  onSelectStage: (id: string) => void;
  onRetryStage: (stageId: string) => void;
}

export function PipelineWorkflow({
  stages,
  running,
  hasError,
  failedStage,
  retryingStage,
  selectedStageId,
  onSelectStage,
  onRetryStage,
}: PipelineWorkflowProps) {
  return (
    <div className="workflow-section">
      <div className="section-head-bar">
        <div className="section-head-info">
          <div className="section-tag">
            <span className="section-dot" />
            <span>PIPELINE WORKFLOW</span>
          </div>
          <h2>Fluxo de Produção Autônoma</h2>
          <p>Acompanhe cada etapa em tempo real. Clique em um cartão para inspecionar seus logs ou reiniciar.</p>
        </div>

        <div className="workflow-header-actions">
          {hasError && failedStage && (
            <button
              className="btn-retry-failed"
              onClick={() => onRetryStage(failedStage)}
              disabled={running}
            >
              <IconRotateCcw size={13} />
              <span>Recomeçar Etapa com Erro</span>
            </button>
          )}
        </div>
      </div>

      <div className="kanban-workflow-grid">
        {stages.map((stage, index) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={index}
            isSelected={selectedStageId === stage.id}
            isRetryingThis={retryingStage === stage.id}
            running={running}
            onSelect={() => onSelectStage(stage.id)}
            onRetry={() => onRetryStage(stage.id)}
          />
        ))}
      </div>
    </div>
  );
}
