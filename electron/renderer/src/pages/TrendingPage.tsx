import React, { useState, useEffect } from "react";
import { TrendingTopicItem } from "../types";
import { useModal } from "../context/ModalContext";
import { useActivities } from "../context/ActivitiesContext";
import {
  IconTrendingUp,
  IconSparkles,
  IconTrash,
  IconCheck,
  IconLoader,
  IconRefreshCw,
  IconTag,
  IconEye,
  IconX,
  IconLayers,
  IconPlay,
  IconFileText,
  IconClock,
  IconArrowUpRight,
} from "../components/common/Icons";

interface TrendingPageProps {
  onGeneratePost?: (slot: {
    topic: string;
    format: string;
    objective: string;
    reasoning?: string;
    hook?: string;
    baseCopyPrompt?: string;
    baseVisualPrompt?: string;
  }) => void;
  onNavigateToPosts?: () => void;
  onOpenRepoToPost?: (query?: string) => void;
}

const CATEGORIES = [
  "Todas",
  "DevOps & Cloud",
  "Backend & Arquitetura",
  "Frontend & UI",
  "Inteligência Artificial",
  "Segurança & Performance",
  "Carreira Dev",
];

export function TrendingPage({ onGeneratePost, onNavigateToPosts }: TrendingPageProps) {
  const { toast, showConfirm } = useModal();
  const { registerOrUpdateActivity } = useActivities();
  const [topics, setTopics] = useState<TrendingTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopicItem | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  async function loadTopics() {
    try {
      setLoading(true);
      if (window.electronAPI?.getTrendingTopics) {
        const data = await window.electronAPI.getTrendingTopics();
        setTopics(data);
      }
    } catch (err) {
      toast.error(`Erro ao carregar tendências: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    const activityId = `trending-scan-${Date.now()}`;
    const startTime = Date.now();

    registerOrUpdateActivity({
      id: activityId,
      type: "trending_scan",
      title: "Radar de Tendências Tech (IA)",
      subtitle: "Buscando as 10 maiores tendências no ecossistema dev com IA",
      targetPage: "trending",
      status: "running",
      statusMessage: "Consultando IA e radar de temas quentes no ecossistema...",
      progress: 25,
      startedAt: startTime,
      canStop: false,
    });

    try {
      setRefreshing(true);
      if (window.electronAPI?.refreshTrendingTopics) {
        registerOrUpdateActivity({
          id: activityId,
          type: "trending_scan",
          title: "Radar de Tendências Tech (IA)",
          subtitle: "Filtrando relevância, ganchos e categorias de tecnologia",
          targetPage: "trending",
          status: "running",
          statusMessage: "Analisando ângulos, ganchos e relevância de cada tema...",
          progress: 65,
          startedAt: startTime,
          canStop: false,
        });

        const res = await window.electronAPI.refreshTrendingTopics();
        if (res.success && res.topics) {
          setTopics(res.topics);
          registerOrUpdateActivity({
            id: activityId,
            type: "trending_scan",
            title: "Radar de Tendências Tech (IA)",
            subtitle: `${res.topics.length} tendências encontradas e salvas no PostgreSQL`,
            targetPage: "trending",
            status: "completed",
            statusMessage: "Varredura de tendências concluída com sucesso!",
            progress: 100,
            startedAt: startTime,
            canStop: false,
          });
          toast.success("Radar de tendências atualizado com sucesso via Inteligência Artificial!");
        } else {
          registerOrUpdateActivity({
            id: activityId,
            type: "trending_scan",
            title: "Radar de Tendências Tech (IA)",
            subtitle: "Falha durante a varredura",
            targetPage: "trending",
            status: "error",
            statusMessage: res.error || "Erro ao buscar tendências.",
            errorLog: res.error,
            progress: 0,
            startedAt: startTime,
            canStop: false,
            canRetry: true,
          });
          toast.error(`Falha ao renovar tendências: ${res.error || "Erro desconhecido"}`);
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      registerOrUpdateActivity({
        id: activityId,
        type: "trending_scan",
        title: "Radar de Tendências Tech (IA)",
        subtitle: "Erro durante a execução",
        targetPage: "trending",
        status: "error",
        statusMessage: errMsg,
        errorLog: errMsg,
        progress: 0,
        startedAt: startTime,
        canStop: false,
        canRetry: true,
      });
      toast.error(`Erro ao renovar: ${errMsg}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleIgnore(topic: TrendingTopicItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();

    const confirmed = await showConfirm({
      title: "Ignorar Tendência",
      message: `Deseja ocultar o tema "${topic.title}" do seu radar de tendências?`,
      confirmText: "Sim, Ignorar",
      cancelText: "Manter",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      if (window.electronAPI?.ignoreTrendingTopic) {
        await window.electronAPI.ignoreTrendingTopic(topic.id);
        setTopics((prev) => prev.filter((t) => t.id !== topic.id));
        if (selectedTopic?.id === topic.id) setSelectedTopic(null);
        toast.info("Tendência ignorada e removida do radar.");
      }
    } catch (err) {
      toast.error("Erro ao ignorar tendência.");
    }
  }

  async function handleGenerate(topic: TrendingTopicItem, e?: React.MouseEvent) {
    if (e) e.stopPropagation();

    try {
      setGeneratingId(topic.id);
      registerOrUpdateActivity({
        id: `agent-trending-${Date.now()}`,
        type: "agent",
        title: `Geração de Post: ${topic.title}`,
        subtitle: `Formato: ${topic.suggestedFormat} | Origem: Radar de Tendências (${topic.relevanceScore}% em alta)`,
        targetPage: "home",
        status: "running",
        statusMessage: "Iniciando pipeline autônomo com tema em alta...",
        progress: 10,
        startedAt: Date.now(),
        canStop: true,
      });

      if (onGeneratePost) {
        onGeneratePost({
          topic: topic.title,
          format: topic.suggestedFormat,
          objective: "AUTHORITY",
          reasoning: `${topic.summary} | Por que está em alta: ${topic.whyTrending}`,
          hook: topic.hookIdea,
          baseCopyPrompt: topic.baseCopyPrompt || undefined,
          baseVisualPrompt: topic.baseVisualPrompt || undefined,
        });

        toast.success(`Produção iniciada no pipeline para o tema "${topic.title}"! Acompanhe no Dashboard.`);
        if (selectedTopic?.id === topic.id) setSelectedTopic(null);
      }
    } catch (err) {
      toast.error(`Erro ao despachar para o pipeline: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGeneratingId(null);
    }
  }

  const filteredTopics = selectedCategory === "Todas"
    ? topics
    : topics.filter((t) => t.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  function getFormatBadge(format: string) {
    switch (format?.toUpperCase()) {
      case "CAROUSEL":
        return { label: "Carrossel", icon: <IconLayers size={11} />, color: "#60a5fa", bg: "rgba(37, 99, 235, 0.15)", border: "rgba(37, 99, 235, 0.3)" };
      case "REEL_SCRIPT":
      case "REEL":
        return { label: "Reels", icon: <IconPlay size={11} />, color: "#c084fc", bg: "rgba(147, 51, 234, 0.15)", border: "rgba(147, 51, 234, 0.3)" };
      case "STORY_PHOTO":
      case "STORY":
        return { label: "Story", icon: <IconTag size={11} />, color: "#f472b6", bg: "rgba(236, 72, 153, 0.15)", border: "rgba(236, 72, 153, 0.3)" };
      default:
        return { label: "Post Solo", icon: <IconFileText size={11} />, color: "#34d399", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)" };
    }
  }

  return (
    <div className="tests-page" style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* CABEÇALHO */}
      <div className="tests-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <IconTrendingUp size={13} color="#38bdf8" />
              RADAR DE INTELIGÊNCIA EDITORIAL
            </span>
          </div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "24px", color: "#fafafa" }}>Temas em Alta na Tecnologia</h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#a1a1aa", maxWidth: "680px" }}>
            Varredura contínua dos tópicos de maior engajamento, lançamentos e debates técnicos na comunidade dev para alimentar sua produção autônoma.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          style={{ padding: "10px 18px", fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {refreshing ? <IconLoader className="spin" size={14} /> : <IconRefreshCw size={14} />}
          <span>{refreshing ? "Buscando Novas Tendências com IA..." : "Pegar Novas Tendências Agora"}</span>
        </button>
      </div>

      {/* FILTRO DE CATEGORIAS */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "20px" }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              background: selectedCategory === cat ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${selectedCategory === cat ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
              color: selectedCategory === cat ? "#38bdf8" : "#a1a1aa",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconLoader className="spin" size={28} />
          </div>
          <h2>Carregando radar de tendências...</h2>
          <p>Consultando banco de dados PostgreSQL e fontes de inteligência...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filteredTopics.length === 0 && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconTrendingUp size={32} />
          </div>
          <h2>Nenhuma tendência ativa nesta categoria</h2>
          <p>Clique em "Pegar Novas Tendências Agora" para que a IA busque novas pautas em alta.</p>
        </div>
      )}

      {/* GRADE DE CARDS (10 TENDÊNCIAS SEM PAGINAÇÃO) */}
      {!loading && filteredTopics.length > 0 && (
        <div className="tests-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {filteredTopics.map((topic) => {
            const formatBadge = getFormatBadge(topic.suggestedFormat);
            const isGenerating = generatingId === topic.id;

            return (
              <div
                key={topic.id}
                className="test-module-card"
                onClick={() => setSelectedTopic(topic)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "12px",
                  padding: "18px",
                }}
              >
                <div>
                  {/* LINHA SUPERIOR COM CATEGORIA, FORMATO E RELEVÂNCIA */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(147, 51, 234, 0.15)", border: "1px solid rgba(147, 51, 234, 0.3)", color: "#c084fc", fontWeight: "700" }}>
                        {topic.category}
                      </span>

                      <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: formatBadge.bg, border: `1px solid ${formatBadge.border}`, color: formatBadge.color, fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {formatBadge.icon}
                        <span>{formatBadge.label}</span>
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 8px", borderRadius: "6px" }}>
                      {topic.relevanceScore}% em alta
                    </span>
                  </div>

                  {/* TÍTULO */}
                  <h3 style={{ fontSize: "15px", color: "#fafafa", lineHeight: "1.4", margin: "0 0 8px 0" }}>
                    {topic.title}
                  </h3>

                  {/* RESUMO */}
                  <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5", margin: "0 0 12px 0" }}>
                    {topic.summary}
                  </p>

                  {/* GANCHO RECOMENDADO */}
                  <div style={{ background: "#09090b", borderRadius: "8px", padding: "10px 12px", border: "1px solid rgba(255, 255, 255, 0.05)", marginBottom: "14px" }}>
                    <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      Gancho Sugerido (Hook)
                    </span>
                    <p style={{ fontSize: "12px", color: "#e4e4e7", margin: 0, fontStyle: "italic", lineHeight: "1.4" }}>
                      "{topic.hookIdea}"
                    </p>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO DO CARD: IGNORAR, LER TUDO, GERAR PUBLICAÇÃO */}
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
                  <button
                    type="button"
                    onClick={(e) => handleIgnore(topic, e)}
                    className="secondary-button"
                    style={{ padding: "8px 12px", fontSize: "11px", color: "#71717a" }}
                    title="Ocultar esta tendência do radar"
                  >
                    <IconTrash size={12} />
                    <span>Ignorar</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTopic(topic);
                    }}
                    className="secondary-button"
                    style={{ flex: 1, padding: "8px 12px", fontSize: "11px", fontWeight: "600", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    title="Ver detalhes completos e diretrizes do tema"
                  >
                    <IconEye size={12} />
                    <span>Ler Tudo</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleGenerate(topic, e)}
                    disabled={isGenerating}
                    className="primary-button"
                    style={{ flex: 1.3, padding: "8px 14px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "5px" }}
                    title="Enviar tema com prompts diretamente para o pipeline do robô"
                  >
                    {isGenerating ? <IconLoader className="spin" size={12} /> : <IconSparkles size={12} />}
                    <span>{isGenerating ? "Gerando..." : "Gerar Publicação"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DEEP DIVE (LEITURA APROFUNDADA DA TENDÊNCIA) */}
      {selectedTopic && (
        <div className="post-modal-backdrop" onClick={() => setSelectedTopic(null)}>
          <div
            className="edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px", maxHeight: "88vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(147, 51, 234, 0.15)", border: "1px solid rgba(147, 51, 234, 0.3)", color: "#c084fc", fontWeight: "700" }}>
                    {selectedTopic.category}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontWeight: "700" }}>
                    {selectedTopic.suggestedFormat}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", fontWeight: "700" }}>
                    {selectedTopic.relevanceScore}% Relevância
                  </span>
                </div>
                <h2 style={{ fontSize: "18px", color: "#fafafa", margin: 0 }}>{selectedTopic.title}</h2>
              </div>

              <button className="modal-close" onClick={() => setSelectedTopic(null)} title="Fechar">
                <IconX size={18} />
              </button>
            </div>

            <div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* POR QUE ESTÁ EM ALTA */}
              <div style={{ background: "#09090b", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Por Que Este Tema Está em Alta Agora?
                </span>
                <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5", margin: 0 }}>
                  {selectedTopic.whyTrending}
                </p>
              </div>

              {/* ÂNGULO SUGERIDO & RESUMO TÉCNICO */}
              <div style={{ background: "#09090b", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Ângulo Contra-intuitivo & Estratégia
                </span>
                <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5", margin: 0 }}>
                  {selectedTopic.suggestedAngle}
                </p>
              </div>

              {/* GANCHO (HOOK) */}
              <div style={{ background: "rgba(56, 189, 248, 0.08)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Gancho de Alta Retenção (Primeiros 3 Segundos / Capa)
                </span>
                <strong style={{ fontSize: "14px", color: "#f0f9ff", display: "block", lineHeight: "1.4" }}>
                  "{selectedTopic.hookIdea}"
                </strong>
              </div>

              {/* DIRETRIZES DE PROMPT BASE */}
              {(selectedTopic.baseCopyPrompt || selectedTopic.baseVisualPrompt) && (
                <div style={{ background: "#09090b", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                    Diretrizes Base para o Pipeline IA
                  </span>
                  {selectedTopic.baseCopyPrompt && (
                    <div style={{ marginBottom: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase" }}>Roteiro / Copy:</span>
                      <p style={{ fontSize: "12px", color: "#d4d4d8", margin: "2px 0 0 0" }}>{selectedTopic.baseCopyPrompt}</p>
                    </div>
                  )}
                  {selectedTopic.baseVisualPrompt && (
                    <div>
                      <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase" }}>Estética Visual:</span>
                      <p style={{ fontSize: "12px", color: "#d4d4d8", margin: "2px 0 0 0" }}>{selectedTopic.baseVisualPrompt}</p>
                    </div>
                  )}
                </div>
              )}

              {/* BOTÕES DE AÇÃO DO MODAL COM SELETOR DE FORMATO */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", paddingTop: "14px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => handleIgnore(selectedTopic)}
                  className="secondary-button"
                  style={{ color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)", fontSize: "12px" }}
                >
                  <IconTrash size={13} />
                  <span>Ignorar Tendência</span>
                </button>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {onOpenRepoToPost && (
                    <button
                      type="button"
                      onClick={() => {
                        const q = selectedTopic.title;
                        setSelectedTopic(null);
                        onOpenRepoToPost(q);
                      }}
                      className="secondary-button"
                      style={{ borderColor: "rgba(56, 189, 248, 0.35)", color: "#38bdf8", fontSize: "12px" }}
                      title="Dissecar código do repositório/projeto no GitHub"
                    >
                      <span>Dissecar no GitHub (Repo-to-Post)</span>
                    </button>
                  )}

                  <select
                    className="settings-input"
                    value={selectedTopic.suggestedFormat}
                    onChange={(e) => setSelectedTopic({ ...selectedTopic, suggestedFormat: e.target.value })}
                    style={{ fontSize: "12px", padding: "6px 10px" }}
                    title="Altere o formato da publicação se desejar"
                  >
                    <option value="CAROUSEL">Carrossel (4:5)</option>
                    <option value="REEL_SCRIPT">Vídeo Reels (9:16)</option>
                    <option value="SINGLE_IMAGE">Post Solo (4:5)</option>
                    <option value="STORY_PHOTO">Story (9:16)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleGenerate(selectedTopic)}
                    className="primary-button"
                    style={{ padding: "8px 16px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <IconSparkles size={13} />
                    <span>Gerar Publicação Agora</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
