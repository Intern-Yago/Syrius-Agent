import React, { useMemo, useRef, useEffect, useState } from "react";
import { AgentLog, AgentStage } from "../../types";
import {
  IconSearch,
  IconCopy,
  IconTrash,
  IconArrowDown,
  IconPlay,
  IconCheck,
  IconX,
} from "../common/Icons";

interface LiveTerminalProps {
  logs: AgentLog[];
  stages: AgentStage[];
  running: boolean;
  selectedStage?: AgentStage;
  onClearSelection: () => void;
  onClearLogs: () => void;
  onRunAgent: () => void;
}

export function LiveTerminal({
  logs,
  running,
  selectedStage,
  onClearSelection,
  onClearLogs,
  onRunAgent,
}: LiveTerminalProps) {
  const [filterType, setFilterType] = useState<"all" | "error" | "warning" | "success">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const filteredLogs = useMemo(() => {
    let list = selectedStage ? selectedStage.logs : logs;

    if (filterType !== "all") {
      list = list.filter((l) => l.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => l.message.toLowerCase().includes(q));
    }

    return list;
  }, [logs, selectedStage, filterType, searchQuery]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  async function handleCopyLogs() {
    if (logs.length === 0) return;
    const text = filteredLogs
      .map((l) => `[${l.timestamp || ""}] [${l.type.toUpperCase()}] ${l.message}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="terminal-console-wrapper">
      <div className="terminal-header">
        <div className="terminal-title-group">
          <div className="terminal-traffic-lights">
            <span className="dot dot-red" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>

          <span className="terminal-title">CONSOLE DIAGNÓSTICO & LOGS EM TEMPO REAL</span>

          {running ? (
            <span className="terminal-status-badge running">
              <span className="pulse-beacon" /> STREAMING
            </span>
          ) : (
            <span className="terminal-status-badge idle">READY</span>
          )}

          {selectedStage && (
            <div className="active-stage-filter-pill">
              <span>
                Filtrando: <strong>{selectedStage.title}</strong>
              </span>
              <button onClick={onClearSelection} title="Ver todos os logs">
                <IconX size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="terminal-toolbar">
          <div className="search-input-wrapper">
            <IconSearch size={13} />
            <input
              type="text"
              placeholder="Filtrar saída..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery("")}>
                <IconX size={11} />
              </button>
            )}
          </div>

          <div className="log-type-filters">
            <button
              className={filterType === "all" ? "filter-btn active" : "filter-btn"}
              onClick={() => setFilterType("all")}
            >
              Todos ({logs.length})
            </button>
            <button
              className={filterType === "error" ? "filter-btn active error" : "filter-btn error"}
              onClick={() => setFilterType("error")}
            >
              Erros ({logs.filter((l) => l.type === "error").length})
            </button>
            <button
              className={filterType === "success" ? "filter-btn active success" : "filter-btn success"}
              onClick={() => setFilterType("success")}
            >
              Sucessos ({logs.filter((l) => l.type === "success").length})
            </button>
          </div>

          <button
            className={`btn-action-terminal ${autoScroll ? "active" : ""}`}
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll"
          >
            <IconArrowDown size={12} />
            <span>{autoScroll ? "Scroll ON" : "Scroll OFF"}</span>
          </button>

          <button
            className="btn-action-terminal"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            title="Copiar logs formatados"
          >
            {copied ? (
              <>
                <IconCheck size={12} />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <IconCopy size={12} />
                <span>Copiar</span>
              </>
            )}
          </button>

          <button
            className="btn-action-terminal"
            onClick={onClearLogs}
            disabled={logs.length === 0 || running}
            title="Limpar console"
          >
            <IconTrash size={12} />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      <div className="terminal-body" ref={logContainerRef}>
        {logs.length === 0 ? (
          <div className="terminal-empty-state">
            <div className="terminal-empty-icon">&gt;_</div>
            <h4>Console pronto para execução</h4>
            <p>Inicie o pipeline para acompanhar a saída de dados, chamadas de IA e respostas em tempo real.</p>
            <button className="btn-terminal-run" onClick={onRunAgent}>
              <IconPlay size={12} />
              <span>Iniciar Pipeline Agora</span>
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="terminal-empty-state">
            <p>Nenhum log encontrado para os filtros selecionados.</p>
            <button
              className="btn-link"
              onClick={() => {
                setFilterType("all");
                setSearchQuery("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="terminal-log-stream">
            {filteredLogs.map((log, idx) => (
              <div key={idx} className={`terminal-log-line log-type-${log.type}`}>
                <span className="log-line-num">{String(idx + 1).padStart(3, "0")}</span>
                <span className="log-timestamp">{log.timestamp || "--:--:--"}</span>
                <span className={`log-badge log-badge-${log.type}`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span className="log-content">{log.message}</span>
              </div>
            ))}
            {running && (
              <div className="terminal-active-cursor">
                <span className="cursor-prompt">&gt;</span>
                <span className="cursor-indicator" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
