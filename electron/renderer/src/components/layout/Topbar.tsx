import React from "react";
import { Page } from "../../types";
import { formatSeconds } from "../../utils/formatters";
import { IconPlay } from "../common/Icons";
import { WindowControls } from "./WindowControls";

interface TopbarProps {
  currentPage: Page;
  running: boolean;
  elapsedTime: number;
  onRunAgent: () => void;
  onStopAgent?: () => void;
}

export function Topbar({
  currentPage,
  running,
  elapsedTime,
  onRunAgent,
  onStopAgent,
}: TopbarProps) {
  function getPageTitle(page: Page): string {
    switch (page) {
      case "schedule":
        return "Cronograma Editorial";
      case "tests":
        return "Central de Testes";
      case "posts":
        return "Biblioteca de Publicações";
      case "analytics":
        return "Analytics & Diagnóstico IA";
      case "settings":
        return "Configurações do Sistema";
      default:
        return "Painel de Controle";
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ WebkitAppRegion: "no-drag" as any }}>
        <div className="topbar-title-row">
          <h1>{getPageTitle(currentPage)}</h1>
          {currentPage === "home" && running && (
            <span className="live-runner-pill">
              <span className="pulse-beacon" />
              LIVE EXECUTION ({formatSeconds(elapsedTime)})
            </span>
          )}
        </div>
        <p>Gerenciamento autônomo de conteúdo técnico para o Instagram.</p>
      </div>

      <div className="topbar-actions" style={{ WebkitAppRegion: "no-drag" as any }}>
        {currentPage === "home" && (
          <>
            {running ? (
              <button
                type="button"
                className="btn-slot-delete"
                style={{
                  width: "auto",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: "700",
                  background: "rgba(239, 68, 68, 0.15)",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  color: "#f87171",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
                onClick={onStopAgent}
                title="Cancelar a execução atual do pipeline"
              >
                <span>Parar Pipeline</span>
              </button>
            ) : (
              <button
                className="run-button"
                onClick={onRunAgent}
              >
                <IconPlay size={13} />
                <span>Executar Pipeline Completo</span>
              </button>
            )}
          </>
        )}

        {/* Botões customizados de Minimizar, Maximizar e Fechar (Frameless) */}
        <WindowControls />
      </div>
    </header>
  );
}
