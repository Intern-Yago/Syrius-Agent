import React from "react";
import { AgentLog, AgentStage } from "../types";
import { MetricsStrip } from "../components/dashboard/MetricsStrip";
import { PipelineWorkflow } from "../components/dashboard/PipelineWorkflow";
import { LiveTerminal } from "../components/dashboard/LiveTerminal";

interface DashboardPageProps {
  stages: AgentStage[];
  logs: AgentLog[];
  running: boolean;
  failedStage: string | null;
  retryingStage: string | null;
  selectedStageId: string | null;
  elapsedTime: number;
  onRunAgent: () => void;
  onRetryStage: (stageId: string) => void;
  onSelectStage: (id: string) => void;
  onClearLogs: () => void;
}

export function DashboardPage({
  stages,
  logs,
  running,
  failedStage,
  retryingStage,
  selectedStageId,
  elapsedTime,
  onRunAgent,
  onRetryStage,
  onSelectStage,
  onClearLogs,
}: DashboardPageProps) {
  const hasError = stages.some((s) => s.status === "error");
  const selectedStage = stages.find((s) => s.id === selectedStageId);

  return (
    <div className="dashboard-container">
      <MetricsStrip
        stages={stages}
        running={running}
        hasError={hasError}
        elapsedTime={elapsedTime}
      />

      <PipelineWorkflow
        stages={stages}
        running={running}
        hasError={hasError}
        failedStage={failedStage}
        retryingStage={retryingStage}
        selectedStageId={selectedStageId}
        onSelectStage={onSelectStage}
        onRetryStage={onRetryStage}
      />

      <LiveTerminal
        logs={logs}
        stages={stages}
        running={running}
        selectedStage={selectedStage}
        onClearSelection={() => onSelectStage("")}
        onClearLogs={onClearLogs}
        onRunAgent={onRunAgent}
      />
    </div>
  );
}
