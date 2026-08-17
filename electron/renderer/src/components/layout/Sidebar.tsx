import React from "react";
import { Page } from "../../types";
import { IconZap, IconLibrary, IconFlask, IconCalendar, IconSettings, IconChart, IconMessageSquare, IconAlertTriangle, IconX } from "../common/Icons";
import logoImg from "../../assets/logo.png";

export interface SystemAlert {
  type: "gemini_quota" | "cloudflare_credits" | "error";
  title: string;
  message: string;
}

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  running: boolean;
  systemAlert?: SystemAlert | null;
  onDismissAlert?: () => void;
}

export function Sidebar({ currentPage, onNavigate, running, systemAlert, onDismissAlert }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon" style={{ padding: "3px", overflow: "hidden", background: "transparent", border: "none" }}>
          <img src={logoImg} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "8px" }} />
        </div>

        <div>
          <strong>Syrius Agent</strong>
          <span>Autonomous AI Pipeline</span>
        </div>
      </div>

      <nav>
        <button
          className={currentPage === "home" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("home")}
        >
          <span className="nav-icon">
            <IconZap size={16} />
          </span>
          <span>Dashboard</span>
        </button>

        <button
          className={currentPage === "schedule" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("schedule")}
        >
          <span className="nav-icon">
            <IconCalendar size={16} />
          </span>
          <span>Cronograma</span>
        </button>

        <button
          className={currentPage === "posts" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("posts")}
        >
          <span className="nav-icon">
            <IconLibrary size={16} />
          </span>
          <span>Publicações</span>
        </button>

        <button
          className={currentPage === "interactions" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("interactions")}
        >
          <span className="nav-icon">
            <IconMessageSquare size={16} />
          </span>
          <span>Interações</span>
        </button>

        <button
          className={currentPage === "analytics" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("analytics")}
        >
          <span className="nav-icon">
            <IconChart size={16} />
          </span>
          <span>Analytics & IA</span>
        </button>

        <button
          className={currentPage === "tests" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("tests")}
        >
          <span className="nav-icon">
            <IconFlask size={16} />
          </span>
          <span>Central de Testes</span>
        </button>

        <button
          className={currentPage === "settings" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("settings")}
        >
          <span className="nav-icon">
            <IconSettings size={16} />
          </span>
          <span>Configurações</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        {/* CARD DE ALERTA CRÍTICO (COTA GEMINI OU CRÉDITOS CLOUDFLARE) */}
        {systemAlert && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              boxShadow: "0 0 15px rgba(239, 68, 68, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontWeight: "700", fontSize: "11px" }}>
                <IconAlertTriangle size={13} color="#f87171" />
                <span>{systemAlert.title}</span>
              </div>
              {onDismissAlert && (
                <button
                  type="button"
                  onClick={onDismissAlert}
                  style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "0" }}
                  title="Dispensar alerta"
                >
                  <IconX size={12} />
                </button>
              )}
            </div>

            <p style={{ fontSize: "10px", color: "#fca5a5", margin: "0 0 8px 0", lineHeight: "1.3" }}>
              {systemAlert.message}
            </p>

            <button
              type="button"
              onClick={() => onNavigate("settings")}
              style={{
                width: "100%",
                padding: "4px 8px",
                borderRadius: "5px",
                background: "rgba(239, 68, 68, 0.25)",
                border: "1px solid rgba(239, 68, 68, 0.5)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Abrir Configurações →
            </button>
          </div>
        )}

        <div className="connection">
          <span className={running ? "status-dot running" : "status-dot"} />
          <div>
            <strong>{running ? "Agente em Execução" : "Sistema Operacional"}</strong>
            <small>Gemini + Cloudflare (Recraft + R2)</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
