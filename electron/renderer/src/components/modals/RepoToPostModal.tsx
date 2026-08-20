import React, { useState, useEffect } from "react";
import { useModal } from "../../context/ModalContext";
import { useActivities } from "../../context/ActivitiesContext";
import {
  IconX,
  IconLoader,
  IconSparkles,
  IconCheck,
  IconArrowUpRight,
  IconLayers,
  IconPlay,
  IconFileText,
  IconTag,
} from "../common/Icons";

interface RepoToPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onDispatchToPipeline?: (slot: {
    topic: string;
    format: string;
    objective: string;
    reasoning?: string;
    hook?: string;
    baseCopyPrompt?: string;
    baseVisualPrompt?: string;
  }) => void;
}

const STORAGE_KEY_ANALYSIS = "syrius_repo_to_post_last_analysis";
const STORAGE_KEY_URL = "syrius_repo_to_post_last_url";

export function RepoToPostModal({ isOpen, onClose, initialQuery = "", onDispatchToPipeline }: RepoToPostModalProps) {
  const { toast } = useModal();
  const { registerOrUpdateActivity } = useActivities();
  const [repoUrl, setRepoUrl] = useState(() => {
    return initialQuery || localStorage.getItem(STORAGE_KEY_URL) || "";
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_ANALYSIS);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [selectedAngleIndex, setSelectedAngleIndex] = useState(0);

  useEffect(() => {
    if (initialQuery) {
      setRepoUrl(initialQuery);
    }
  }, [initialQuery]);

  if (!isOpen) return null;

  async function handleAnalyze() {
    const targetUrl = repoUrl.trim();
    if (!targetUrl) {
      toast.error("Insira a URL ou o identificador do repositório (ex: owner/repo).");
      return;
    }

    const activityId = `repo-to-post-${Date.now()}`;
    const startTime = Date.now();

    try {
      setAnalyzing(true);
      localStorage.setItem(STORAGE_KEY_URL, targetUrl);

      // 1. Registra atividade na Central de Atividades
      registerOrUpdateActivity({
        id: activityId,
        type: "repo_to_post",
        title: `Dissecação de Repositório (${targetUrl.replace(/^https?:\/\/github\.com\//i, "")})`,
        subtitle: "Inspecionando API do GitHub, README.md e arquitetura com Gemini IA",
        targetPage: "posts",
        targetId: `repo:${targetUrl.replace(/^https?:\/\/github\.com\//i, "")}`,
        status: "running",
        statusMessage: `Lendo código-fonte, estrelas e documentação de ${targetUrl}...`,
        progress: 35,
        startedAt: startTime,
        canStop: false,
      });

      const res = await window.electronAPI?.inspectGitHubRepo?.(targetUrl);

      if (res?.success && res.data) {
        setAnalysisResult(res.data);
        setSelectedAngleIndex(0);
        localStorage.setItem(STORAGE_KEY_ANALYSIS, JSON.stringify(res.data));

        // 2. Conclui a atividade com sucesso
        registerOrUpdateActivity({
          id: activityId,
          type: "repo_to_post",
          title: `Repositório Dissecado: ${res.data.fullName}`,
          subtitle: `${res.data.stars?.toLocaleString() || 0} estrelas - 3 formatos estratégicos gerados`,
          targetPage: "posts",
          targetId: `repo:${res.data.fullName}`,
          status: "completed",
          statusMessage: `Repositório ${res.data.fullName} dissecado com sucesso!`,
          progress: 100,
          startedAt: startTime,
          canStop: false,
        });

        toast.success(`Repositório ${res.data.fullName} dissecado com sucesso pela IA!`);
      } else {
        const errMsg = res?.error || "Erro ao inspecionar repositório do GitHub.";
        registerOrUpdateActivity({
          id: activityId,
          type: "repo_to_post",
          title: `Falha na Dissecação (${targetUrl})`,
          subtitle: "Erro ao consultar repositório",
          targetPage: "posts",
          targetId: `repo:${targetUrl.replace(/^https?:\/\/github\.com\//i, "")}`,
          status: "error",
          statusMessage: errMsg,
          progress: 100,
          startedAt: startTime,
          errorLog: errMsg,
          canStop: false,
        });
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err?.message || "Falha na análise do repositório.";
      registerOrUpdateActivity({
        id: activityId,
        type: "repo_to_post",
        title: `Falha na Dissecação (${targetUrl})`,
        subtitle: "Erro ao consultar repositório",
        targetPage: "posts",
        status: "error",
        statusMessage: errMsg,
        progress: 100,
        startedAt: startTime,
        errorLog: errMsg,
        canStop: false,
      });
      toast.error(errMsg);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDispatchCurrentAngle() {
    if (!analysisResult) return;
    const angle = analysisResult.suggestedAngles?.[selectedAngleIndex] || analysisResult.suggestedAngles?.[0];
    if (!angle) return;

    if (onDispatchToPipeline) {
      onDispatchToPipeline({
        topic: `${analysisResult.fullName}: ${angle.title}`,
        format: angle.format,
        objective: "AUTHORITY",
        reasoning: angle.reasoning,
        hook: angle.hook,
        baseCopyPrompt: angle.baseCopyPrompt,
        baseVisualPrompt: angle.baseVisualPrompt,
      });
      toast.success(`Pauta do repositório enviada para o Pipeline de Produção!`);
      onClose();
    }
  }

  const activeAngle = analysisResult?.suggestedAngles?.[selectedAngleIndex];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          maxHeight: "90vh",
          backgroundColor: "#090d16",
          border: "1px solid rgba(56, 189, 248, 0.35)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(56, 189, 248, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(99, 102, 241, 0.08))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fafafa" }}>
                Repo-to-Post (GitHub Engine)
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                Cole qualquer repositório tech para a IA dissecar o código e criar posts de alto impacto.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#a1a1aa",
              cursor: "pointer",
              padding: "6px",
            }}
          >
            <IconX size={18} />
          </button>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* INPUT SECTION */}
          <div style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="settings-input"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="Ex: https://github.com/shadcn-ui/ui ou facebook/react"
              style={{ flex: 1, fontSize: "13px", padding: "10px 14px" }}
              disabled={analyzing}
            />
            <button
              type="button"
              className="primary-button"
              onClick={handleAnalyze}
              disabled={analyzing || !repoUrl.trim()}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                borderColor: "#38bdf8",
              }}
            >
              {analyzing ? <IconLoader className="spin" size={14} /> : <IconSparkles size={14} />}
              <span>{analyzing ? "Dissecando Repositório..." : "Analisar Repositório"}</span>
            </button>
          </div>

          {/* RESULT VIEW */}
          {analysisResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* REPO METRICS BADGE */}
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px", color: "#38bdf8" }}>{analysisResult.fullName}</strong>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#cbd5e1" }}>{analysisResult.description}</p>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", color: "#facc15" }}>{analysisResult.stars.toLocaleString()} stars</span>
                  <span style={{ fontSize: "12px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: "6px" }}>
                    {analysisResult.language}
                  </span>
                </div>
              </div>

              {/* ARCHITECTURE & VALUE INSIGHT */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(147, 51, 234, 0.08)", border: "1px solid rgba(147, 51, 234, 0.25)" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", textTransform: "uppercase" }}>Por debaixo dos panos (Arquitetura)</span>
                  <p style={{ fontSize: "12px", color: "#e4e4e7", margin: "6px 0 0", lineHeight: "1.4" }}>
                    {analysisResult.coreArchitecture}
                  </p>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", textTransform: "uppercase" }}>Por que importa para Devs</span>
                  <p style={{ fontSize: "12px", color: "#e4e4e7", margin: "6px 0 0", lineHeight: "1.4" }}>
                    {analysisResult.whyUsefulForDevs}
                  </p>
                </div>
              </div>

              {/* SELECT ANGLE FORMAT */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8" }}>
                    ESCOLHA O FORMATO DO CONTEÚDO:
                  </span>
                  {analysisResult.recommendationReason && (
                    <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "600" }}>
                      Recomendação IA: {analysisResult.recommendationReason}
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {analysisResult.suggestedAngles?.map((ang: any, idx: number) => {
                    const isSelected = selectedAngleIndex === idx;
                    const isRecommended = ang.isRecommended || analysisResult.recommendedFormat === ang.format || idx === 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAngleIndex(idx)}
                        style={{
                          padding: "12px",
                          borderRadius: "10px",
                          textAlign: "left",
                          background: isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${isSelected ? "#38bdf8" : isRecommended ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {ang.format === "CAROUSEL" ? <IconLayers size={13} color="#38bdf8" /> : ang.format === "REEL_SCRIPT" ? <IconPlay size={13} color="#a855f7" /> : <IconFileText size={13} color="#34d399" />}
                            <strong style={{ fontSize: "12px", color: isSelected ? "#ffffff" : "#cbd5e1" }}>
                              {ang.format === "CAROUSEL" ? "Carrossel Técnico" : ang.format === "REEL_SCRIPT" ? "Vídeo Reels" : "Post Solo"}
                            </strong>
                          </div>

                          {isRecommended && (
                            <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "4px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontWeight: "700", letterSpacing: "0.4px" }}>
                              RECOMENDADO
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {ang.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ANGLE DETAIL PREVIEW */}
              {activeAngle && (
                <div
                  style={{
                    padding: "16px 18px",
                    borderRadius: "12px",
                    background: "rgba(9, 13, 22, 0.9)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Gancho Magnético Sugerido (Hook):
                      </span>
                      <p style={{ margin: "3px 0 0", fontSize: "14px", fontWeight: "700", color: "#f8fafc", lineHeight: "1.4" }}>
                        "{activeAngle.hook}"
                      </p>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "700", textTransform: "uppercase" }}>
                      Estratégia de Retenção & Por que a IA escolheu:
                    </span>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.4" }}>
                      {activeAngle.reasoning}
                    </p>
                  </div>

                  {activeAngle.baseCopyPrompt && (
                    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                      <span style={{ fontSize: "10px", color: "#a855f7", fontWeight: "700", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                        Roteiro & Diretriz de Redação (Prompt):
                      </span>
                      <p style={{ margin: 0, fontSize: "12px", color: "#e4e4e7", lineHeight: "1.4", whiteSpace: "pre-line" }}>
                        {activeAngle.baseCopyPrompt}
                      </p>
                    </div>
                  )}

                  {activeAngle.baseVisualPrompt && (
                    <div style={{ padding: "10px 12px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.04)", border: "1px solid rgba(56, 189, 248, 0.15)" }}>
                      <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                        Direção Visual & Arte (Prompt Visual):
                      </span>
                      <p style={{ margin: 0, fontSize: "12px", color: "#93c5fd", lineHeight: "1.4" }}>
                        {activeAngle.baseVisualPrompt}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            background: "rgba(0, 0, 0, 0.3)",
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
          {analysisResult && (
            <button
              type="button"
              className="primary-button"
              onClick={handleDispatchCurrentAngle}
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                borderColor: "#38bdf8",
              }}
            >
              <IconSparkles size={14} />
              <span>Gerar {activeAngle?.format === "REEL_SCRIPT" ? "Vídeo Reels" : activeAngle?.format === "CAROUSEL" ? "Carrossel" : "Post Solo"} Agora</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
