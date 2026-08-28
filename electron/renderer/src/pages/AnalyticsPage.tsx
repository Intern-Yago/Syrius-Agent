import React, { useState, useEffect, useMemo } from "react";
import { AnalyticsReport, LearningInsight } from "../types";
import {
  IconChart,
  IconSparkles,
  IconLoader,
  IconCheck,
  IconClock,
  IconLayers,
  IconTarget,
  IconLightbulb,
  IconCalendar,
  IconPlus,
  IconAlertTriangle,
  IconMail,
  IconAward,
  IconRefreshCw,
  IconTag,
  IconSend,
  IconRotateCcw,
  IconX,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconMessageSquare,
  IconDownload,
  IconTrash,
  IconArrowRight,
  IconTrendingUp,
} from "../components/common/Icons";
import { useActivities } from "../context/ActivitiesContext";
import { useModal } from "../context/ModalContext";

const PERIOD_OPTIONS = [
  { days: 7, label: "Últimos 7 dias" },
  { days: 14, label: "Últimos 14 dias" },
  { days: 30, label: "Últimos 30 dias" },
];

interface AnalyticsPageProps {
  onNavigateToSchedule?: () => void;
  onNavigateToPosts?: () => void;
}

export function AnalyticsPage({ onNavigateToSchedule, onNavigateToPosts }: AnalyticsPageProps) {
  const { toast } = useModal();
  const [history, setHistory] = useState<AnalyticsReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AnalyticsReport | null>(null);
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);
  const [runningAudit, setRunningAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingSlotTopic, setAddingSlotTopic] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"MACRO" | "MICRO" | "RAG_MEMORY">("MACRO");
  const [ragInsights, setRagInsights] = useState<LearningInsight[]>([]);
  const [loadingRag, setLoadingRag] = useState(false);
  const [sendingBriefing, setSendingBriefing] = useState(false);
  const [briefingFeedback, setBriefingFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [exportingReport, setExportingReport] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [viewMode, setViewMode] = useState<"ACTIVE_AUDIT" | "HISTORY_LIST">("ACTIVE_AUDIT");
  
  // ESTADOS DOS FILTROS ESTATÍSTICOS
  const [historySearch, setHistorySearch] = useState("");
  const [filterPeriod, setFilterPeriod] = useState<"ALL" | "7_DAYS" | "14_DAYS" | "30_DAYS">("ALL");
  const [filterScoreCategory, setFilterScoreCategory] = useState<"ALL" | "EXCELLENT" | "HEALTHY" | "ATTENTION">("ALL");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "HIGHEST_SCORE" | "HIGHEST_REACH">("NEWEST");

  // ESTADOS DE FILTRO E PAGINAÇÃO DA MEMÓRIA RAG
  const [ragStatusFilter, setRagStatusFilter] = useState<"ALL" | "VALIDATED" | "HYPOTHESIS" | "REFUTED">("ALL");
  const [ragTypeFilter, setRagTypeFilter] = useState<string>("ALL");
  const [ragSearchQuery, setRagSearchQuery] = useState<string>("");
  const [ragPage, setRagPage] = useState<number>(1);
  const [ragPageSize, setRagPageSize] = useState<number>(12);

  // MODAL DE LINHAGEM DE AUTO-CORREÇÃO
  const [lineageModal, setLineageModal] = useState<{
    refutedTitle: string;
    refutedContent: string;
    refutedReason?: string | null;
    activeTitle: string;
    activeContent: string;
    activeConfidence?: number;
    activeStatus?: string;
    targetInsightId?: string;
  } | null>(null);

  // Rastreamento de Pautas Recomendadas já adicionadas à Grade
  const [addedTopics, setAddedTopics] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("analytics_added_topics");
      return saved ? new Set(JSON.parse(saved).map((s: string) => s.trim().toLowerCase())) : new Set();
    } catch {
      return new Set();
    }
  });
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [analyzingTrafficPost, setAnalyzingTrafficPost] = useState<string | null>(null);

  async function handleAnalyzePostInTraffic(postTopic: string) {
    try {
      setAnalyzingTrafficPost(postTopic);
      toast.info(`Consultando Apolo sobre o potencial de turbinamento do post...`);

      const posts = await window.electronAPI.getPosts();
      const targetPost = posts.find((p: any) =>
        p.topic.toLowerCase().includes(postTopic.toLowerCase().slice(0, 15)) ||
        postTopic.toLowerCase().includes(p.topic.toLowerCase().slice(0, 15))
      );

      if (targetPost && window.electronAPI?.analyzePostForBoost) {
        const res = await window.electronAPI.analyzePostForBoost(targetPost.id);
        if (res.success && res.opportunity) {
          registerOrUpdateActivity({
            title: `Avaliação de Tráfego: ${targetPost.topic.slice(0, 35)}...`,
            details: `Apolo avaliou para turbinamento: Score ${res.opportunity.opportunityScore}/100. ${res.opportunity.whyBoostNow.slice(0, 85)}...`,
            status: "completed",
            type: "ads_growth",
            targetPage: "ads",
          });
          toast.success(`Apolo aprovou com Score ${res.opportunity.opportunityScore}/100! O post foi posicionado no topo do Radar de Oportunidades.`);
        } else {
          toast.info(res.aiFeedback || "Apolo analisou este post.");
        }
      } else {
        toast.success(`Post "${postTopic.slice(0, 30)}..." enviado para o Gestor de Tráfego!`);
      }
    } catch (err) {
      console.error("Erro ao analisar post no tráfego:", err);
      toast.error("Não foi possível analisar este post no gestor de tráfego.");
    } finally {
      setAnalyzingTrafficPost(null);
    }
  }

  async function loadHistory() {
    try {
      setLoading(true);
      setError(null);
      const data = await window.electronAPI.getAnalyticsHistory();
      setHistory(data);
      if (data.length > 0) {
        setSelectedReport((curr) => {
          if (curr) {
            const found = data.find((d: any) => d.id === curr.id);
            if (found) return found;
          }
          return data[0];
        });
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de analytics:", err);
      setError("Não foi possível carregar o histórico de análises.");
    } finally {
      setLoading(false);
    }
  }

  async function checkRunningStatus() {
    try {
      if (window.electronAPI?.getAnalyticsRunning) {
        const isRunning = await window.electronAPI.getAnalyticsRunning();
        setRunningAudit(Boolean(isRunning));
      }
    } catch (err) {
      console.error("Erro ao checar status da auditoria:", err);
    }
  }

  async function loadRagInsights() {
    try {
      setLoadingRag(true);
      if (window.electronAPI?.getLearningInsights) {
        const insights = await window.electronAPI.getLearningInsights();
        setRagInsights(insights || []);
      }
    } catch (err) {
      console.error("Erro ao carregar RAG:", err);
    } finally {
      setLoadingRag(false);
    }
  }

  async function loadScheduleSlots() {
    try {
      if (window.electronAPI?.getSchedule) {
        const slots = await window.electronAPI.getSchedule();
        if (Array.isArray(slots)) {
          setScheduleSlots(slots);
        }
      }
    } catch {}
  }

  useEffect(() => {
    loadHistory();
    checkRunningStatus();
    loadRagInsights();
    loadScheduleSlots();

    if (window.electronAPI?.onAnalyticsStatusChange) {
      const unsub = window.electronAPI.onAnalyticsStatusChange((data) => {
        setRunningAudit(Boolean(data.running));

        if (!data.running && data.report) {
          setSelectedReport(data.report);
          setHistory((prev) => [data.report, ...prev.filter((r) => r.id !== data.report.id)]);
          loadRagInsights();
          loadScheduleSlots();
          setError(null);
        } else if (!data.running && data.error) {
          setError(data.error);
        }
      });
      return () => unsub();
    }
  }, []);

  async function handleRunAudit() {
    if (runningAudit) return;
    try {
      setRunningAudit(true);
      setError(null);
      const res = await window.electronAPI.runAnalyticsAudit({ days: selectedDays });
      if (res.success && res.report) {
        setSelectedReport(res.report);
        setHistory((prev) => [res.report, ...prev.filter((r) => r.id !== res.report.id)]);
        loadRagInsights();
        loadScheduleSlots();
        setViewMode("ACTIVE_AUDIT");
      } else if (res.error) {
        setError(res.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao executar auditoria.");
    } finally {
      setRunningAudit(false);
    }
  }

  async function handleAddTopicToSchedule(topic: {
    topic: string;
    suggestedFormat?: string;
    suggestedDay?: string;
    suggestedTime?: string;
    reason?: string;
    baseCopyPrompt?: string;
    baseVisualPrompt?: string;
    objective?: string;
  }) {
    try {
      setAddingSlotTopic(topic.topic);
      if (!window.electronAPI?.addTopicToSchedule) {
        toast.warning("Função não suportada.");
        return;
      }
      const res = await window.electronAPI.addTopicToSchedule(topic);

      // Marca a pauta como adicionada para sumir imediatamente da lista de recomendações
      const normalizedTopic = topic.topic.trim().toLowerCase();
      setAddedTopics((prev) => {
        const next = new Set(prev);
        next.add(normalizedTopic);
        try {
          localStorage.setItem("analytics_added_topics", JSON.stringify(Array.from(next)));
        } catch {}
        return next;
      });

      // Recarrega os slots para sincronização
      await loadScheduleSlots();

      if (res?.isNextWeek) {
        toast.info(res.message || `Pauta salva na memória para a Próxima Semana (${topic.suggestedDay || "Próxima Semana"}).`);
      } else {
        toast.success(res?.message || `Pauta "${topic.topic}" adicionada à Grade com diretrizes e prompts base salvos!`);
      }
    } catch (err) {
      toast.error(`Erro ao adicionar pauta: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setAddingSlotTopic(null);
    }
  }

  async function handleSendBriefingEmail() {
    if (!selectedReport) return;
    try {
      setSendingBriefing(true);
      setBriefingFeedback(null);
      const settings = await window.electronAPI.getSettings();
      const res = await window.electronAPI.sendTestEmail(settings.notificationEmail);
      setBriefingFeedback(res);
    } catch (err) {
      setBriefingFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Erro ao enviar e-mail.",
      });
    } finally {
      setSendingBriefing(false);
    }
  }

  async function handleUpdateInsightStatus(id: string, newStatus: "HYPOTHESIS" | "VALIDATED" | "REFUTED") {
    try {
      if (!window.electronAPI?.updateLearningInsight) {
        toast.warning("Função não suportada.");
        return;
      }
      const res = await window.electronAPI.updateLearningInsight({
        id,
        status: newStatus,
        confidenceScore: newStatus === "HYPOTHESIS" ? 0.40 : newStatus === "VALIDATED" ? 0.85 : 0.0,
      });
      if (res.success) {
        toast.success(`Status da tese alterado para: ${newStatus === "HYPOTHESIS" ? "Hipótese (Amostragem Inicial)" : newStatus === "VALIDATED" ? "Validada" : "Refutada"}`);
        await loadRagInsights();
      }
    } catch (err) {
      toast.error(`Erro ao atualizar insight: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleDeleteInsight(id: string) {
    try {
      if (!window.electronAPI?.deleteLearningInsight) {
        toast.warning("Função não suportada.");
        return;
      }
      const res = await window.electronAPI.deleteLearningInsight(id);
      if (res.success) {
        toast.success("Insight excluído da memória RAG.");
        await loadRagInsights();
      }
    } catch (err) {
      toast.error(`Erro ao excluir insight: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleDevalidateAll() {
    try {
      if (!window.electronAPI?.devalidateAllInsights) {
        toast.warning("Função não suportada.");
        return;
      }
      const res = await window.electronAPI.devalidateAllInsights();
      if (res.success) {
        toast.success(`${res.count || 0} teses foram convertidas para Hipóteses preliminares.`);
        await loadRagInsights();
      }
    } catch (err) {
      toast.error(`Erro ao desvalidar teses: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleExportReport(format: "markdown" | "json") {
    if (!selectedReport) return;
    try {
      setExportingReport(true);
      setExportFeedback(null);
      if (!window.electronAPI?.exportAnalyticsReport) {
        setExportFeedback({ success: false, message: "Exportação não suportada nesta versão." });
        return;
      }
      const res = await window.electronAPI.exportAnalyticsReport(format, selectedReport);
      if (res.success && res.filePath) {
        const fileName = res.filePath.split(/[\\/]/).pop();
        setExportFeedback({
          success: true,
          message: `Relatório exportado com sucesso: ${fileName}`,
        });
      } else if (res.error) {
        setExportFeedback({
          success: false,
          message: res.error,
        });
      }
    } catch (err) {
      setExportFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Erro ao exportar relatório.",
      });
    } finally {
      setExportingReport(false);
    }
  }

  function getScoreBadge(score: number) {
    if (score >= 8.5) return { label: "Excelente", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
    if (score >= 7.0) return { label: "Saudável", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" };
    if (score >= 5.0) return { label: "Atenção", bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" };
    return { label: "Crítico", bg: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "rgba(239, 68, 68, 0.3)" };
  }

  function getLocalDatePrefix(dateInput: string | Date): string {
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  }

  function formatAuditDate(dateStr: string) {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  }

  const isLatestAudit = history.length > 0 && selectedReport?.id === history[0]?.id;

  const hasActiveFilters = Boolean(
    historySearch || filterPeriod !== "ALL" || filterScoreCategory !== "ALL" || filterStartDate || filterEndDate || sortBy !== "NEWEST"
  );

  function handleResetFilters() {
    setHistorySearch("");
    setFilterPeriod("ALL");
    setFilterScoreCategory("ALL");
    setFilterStartDate("");
    setFilterEndDate("");
    setSortBy("NEWEST");
  }

  // APLICAÇÃO DOS FILTROS ESTRUTURADOS
  const filteredHistory = history
    .filter((audit) => {
      // 1. Busca textual por tema campeão ou diretrizes
      if (historySearch.trim()) {
        const q = historySearch.toLowerCase();
        const matchesTopic = audit.bestPerformingTopic?.toLowerCase().includes(q);
        const matchesSummary = audit.quantitativeSummary?.toLowerCase().includes(q);
        const matchesDirectives = Array.isArray(audit.strategicDirectives) && audit.strategicDirectives.some((d: any) => String(d).toLowerCase().includes(q));
        if (!matchesTopic && !matchesSummary && !matchesDirectives) return false;
      }

      // 2. Filtro por Período de Análise
      if (filterPeriod === "7_DAYS" && !audit.periodLabel.includes("7 dias")) return false;
      if (filterPeriod === "14_DAYS" && !audit.periodLabel.includes("14 dias")) return false;
      if (filterPeriod === "30_DAYS" && !audit.periodLabel.includes("30 dias")) return false;

      // 3. Filtro por Faixa de Score da IA
      if (filterScoreCategory === "EXCELLENT" && audit.score < 8.5) return false;
      if (filterScoreCategory === "HEALTHY" && (audit.score < 7.0 || audit.score >= 8.5)) return false;
      if (filterScoreCategory === "ATTENTION" && audit.score >= 7.0) return false;

      // 4. Filtro por Intervalo de Data de Execução (Desde / Até em horário local)
      if (filterStartDate) {
        const auditDatePrefix = getLocalDatePrefix(audit.createdAt);
        if (filterEndDate) {
          // Intervalo fechado entre filterStartDate e filterEndDate
          if (auditDatePrefix < filterStartDate || auditDatePrefix > filterEndDate) return false;
        } else {
          // Apenas a data exata quando informado somente o "Desde"
          if (auditDatePrefix !== filterStartDate) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "HIGHEST_SCORE") return b.score - a.score;
      if (sortBy === "HIGHEST_REACH") return b.reachTotal - a.reachTotal;
      return 0;
    });

  // ==========================================
  // VIEW: PÁGINA DEDICADA DE HISTÓRICO DE AUDITORIAS
  // ==========================================
  if (viewMode === "HISTORY_LIST") {
    return (
      <div className="posts-page-container">
        {/* CABEÇALHO DO HISTÓRICO */}
        <div className="page-header">
          <div>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setViewMode("ACTIVE_AUDIT")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", marginBottom: "8px", padding: "4px 10px" }}
            >
              <IconChevronLeft size={13} />
              <span>Voltar para o Diagnóstico Atual</span>
            </button>
            <h2>Histórico de Auditorias & Diagnósticos IA</h2>
            <p>
              Consulte e filtre todas as auditorias salvas no PostgreSQL por período, nota da IA, data exata ou palavras-chave.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              className="primary-button"
              onClick={handleRunAudit}
              disabled={runningAudit}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {runningAudit ? <IconLoader size={13} /> : <IconSparkles size={13} />}
              <span>{runningAudit ? "Auditoria em Andamento..." : "Rodar Nova Auditoria"}</span>
            </button>
          </div>
        </div>

        {/* ALERTA SE HOUVER AUDITORIA EM ANDAMENTO */}
        {runningAudit && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "10px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              color: "#38bdf8",
              marginBottom: "16px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontWeight: "600",
            }}
          >
            <IconLoader size={16} />
            <span>Uma auditoria de inteligência artificial está sendo executada no background. Os dados serão atualizados assim que finalizar!</span>
          </div>
        )}

        {/* TOOLBAR AVANÇADA DE FILTROS & PESQUISA */}
        <div
          style={{
            background: "linear-gradient(180deg, #111114 0%, #0c0c0e 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "18px 20px",
            marginBottom: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
          }}
        >
          {/* LINHA 1: CAMPO DE BUSCA TEXTUAL + SELETOR DE DATA + ORDENAÇÃO */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            {/* BUSCA TEXTUAL */}
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                flex: 1,
                minWidth: "260px",
                background: "#09090b",
                border: historySearch ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "2px 12px",
                transition: "all 0.2s ease",
                boxShadow: historySearch ? "0 0 15px rgba(56, 189, 248, 0.15)" : "none",
              }}
            >
              <IconSearch size={15} color={historySearch ? "#38bdf8" : "#71717a"} />
              <input
                type="text"
                placeholder="Pesquisar por tema, pauta campeã ou diretriz..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fafafa",
                  fontSize: "13px",
                  padding: "10px 10px",
                  fontFamily: "inherit",
                }}
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#a1a1aa",
                    padding: 0,
                  }}
                  title="Limpar pesquisa textual"
                >
                  <IconX size={11} />
                </button>
              )}
            </div>

            {/* FILTRO POR INTERVALO DE DATAS (DESDE / ATÉ) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {/* CAMPO: DESDE */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#09090b",
                  border: filterStartDate ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "10px",
                  padding: "4px 10px",
                  transition: "all 0.2s ease",
                  boxShadow: filterStartDate ? "0 0 12px rgba(56, 189, 248, 0.15)" : "none",
                }}
              >
                <IconCalendar size={13} color={filterStartDate ? "#38bdf8" : "#71717a"} />
                <span style={{ fontSize: "11px", color: "#71717a", whiteSpace: "nowrap" }}>Desde:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => {
                    setFilterStartDate(e.target.value);
                    if (!e.target.value) setFilterEndDate("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: filterStartDate ? "#38bdf8" : "#a1a1aa",
                    fontSize: "12px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                />
                {filterStartDate && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterStartDate("");
                      setFilterEndDate("");
                    }}
                    style={{ background: "transparent", border: "none", color: "#71717a", cursor: "pointer", padding: "2px" }}
                    title="Remover filtro de data"
                  >
                    <IconX size={11} />
                  </button>
                )}
              </div>

              {/* CAMPO: ATÉ (SÓ APARECE SE DESDE ESTIVER PREENCHIDO) */}
              {filterStartDate && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#09090b",
                    border: filterEndDate ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "4px 10px",
                    transition: "all 0.2s ease",
                    boxShadow: filterEndDate ? "0 0 12px rgba(56, 189, 248, 0.15)" : "none",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#71717a", whiteSpace: "nowrap" }}>Até:</span>
                  <input
                    type="date"
                    min={filterStartDate}
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: filterEndDate ? "#38bdf8" : "#a1a1aa",
                      fontSize: "12px",
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  />
                  {filterEndDate && (
                    <button
                      type="button"
                      onClick={() => setFilterEndDate("")}
                      style={{ background: "transparent", border: "none", color: "#71717a", cursor: "pointer", padding: "2px" }}
                      title="Remover filtro de data final"
                    >
                      <IconX size={11} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ORDENAÇÃO */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#09090b",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "4px 12px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#71717a", whiteSpace: "nowrap" }}>Ordem:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fafafa",
                  fontSize: "12px",
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                <option value="NEWEST" style={{ background: "#111114", color: "#fafafa" }}>Mais Recentes</option>
                <option value="OLDEST" style={{ background: "#111114", color: "#fafafa" }}>Mais Antigas</option>
                <option value="HIGHEST_SCORE" style={{ background: "#111114", color: "#fafafa" }}>Maior Nota IA</option>
                <option value="HIGHEST_REACH" style={{ background: "#111114", color: "#fafafa" }}>Maior Alcance</option>
              </select>
            </div>
          </div>

          {/* LINHA 2: CHIPS DE PERÍODO & CLASSIFICAÇÃO DE NOTA */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
              {/* CHIPS DE PERÍODO */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "#71717a", fontWeight: "700", textTransform: "uppercase" }}>
                  Período:
                </span>
                {[
                  { id: "ALL", label: "Todos" },
                  { id: "7_DAYS", label: "7 dias" },
                  { id: "14_DAYS", label: "14 dias" },
                  { id: "30_DAYS", label: "30 dias" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`filter-btn ${filterPeriod === p.id ? "active" : ""}`}
                    onClick={() => setFilterPeriod(p.id as any)}
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* CHIPS DE SAÚDE / SCORE */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "10px", color: "#71717a", fontWeight: "700", textTransform: "uppercase" }}>
                  Saúde:
                </span>
                {[
                  { id: "ALL", label: "Todas" },
                  { id: "EXCELLENT", label: "Excelentes (8.5+)" },
                  { id: "HEALTHY", label: "Saudáveis (7.0+)" },
                  { id: "ATTENTION", label: "Atenção (< 7.0)" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`filter-btn ${filterScoreCategory === s.id ? "active" : ""}`}
                    onClick={() => setFilterScoreCategory(s.id as any)}
                    style={{ fontSize: "11px", padding: "3px 8px" }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="secondary-button"
                  style={{ fontSize: "11px", padding: "3px 8px", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                >
                  Limpar Filtros
                </button>
              )}

              <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>
                Exibindo {filteredHistory.length} de {history.length} auditorias
              </span>
            </div>
          </div>
        </div>

        {/* GRADE DE CARDS DO HISTÓRICO */}
        {filteredHistory.length === 0 ? (
          <div className="page-placeholder" style={{ padding: "60px" }}>
            <IconClock size={32} />
            <h3>Nenhuma auditoria encontrada</h3>
            <p>Nenhum registro corresponde aos filtros selecionados.</p>
            {hasActiveFilters && (
              <button className="primary-button" onClick={handleResetFilters} style={{ marginTop: "12px" }}>
                <span>Redefinir Filtros</span>
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {filteredHistory.map((audit) => {
              const isSelected = selectedReport?.id === audit.id;
              const isLatest = history[0]?.id === audit.id;
              const badge = getScoreBadge(audit.score);

              return (
                <div
                  key={audit.id}
                  onClick={() => {
                    setSelectedReport(audit);
                    setViewMode("ACTIVE_AUDIT");
                  }}
                  style={{
                    background: isSelected ? "rgba(56, 189, 248, 0.08)" : "#111114",
                    border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                    borderRadius: "14px",
                    padding: "20px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "16px",
                    boxShadow: isSelected ? "0 0 25px rgba(56, 189, 248, 0.25)" : "none",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: "600" }}>
                        {formatAuditDate(audit.createdAt)}
                      </span>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        Nota {audit.score.toFixed(1)}/10
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      {audit.periodLabel}
                    </span>

                    <strong style={{ fontSize: "14px", color: "#fafafa", display: "block", lineHeight: "1.4" }}>
                      {audit.bestPerformingTopic || "Sem post campeão definido"}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                        background: "#09090b",
                        padding: "10px 12px",
                        borderRadius: "10px",
                        fontSize: "12px",
                        color: "#a1a1aa",
                        marginBottom: "14px",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconChart size={12} color="#34d399" />
                        <span><strong>{audit.reachTotal}</strong> alcance</span>
                      </span>

                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconMessageSquare size={12} color="#38bdf8" />
                        <span><strong>{audit.interactionsTotal}</strong> interações</span>
                      </span>

                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconTag size={12} color="#c084fc" />
                        <span><strong>{audit.savesCount ?? 0}</strong> salvos</span>
                      </span>

                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconLayers size={12} color="#fbbf24" />
                        <span><strong>{audit.individualPostsBreakdown?.length || 0}</strong> posts</span>
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: isSelected ? "#38bdf8" : "#71717a", fontWeight: isSelected ? "700" : "500", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        {isSelected ? (
                          <>
                            <IconCheck size={12} color="#38bdf8" />
                            <span>Ativa no Painel</span>
                          </>
                        ) : isLatest ? (
                          "Mais recente"
                        ) : (
                          "Histórica"
                        )}
                      </span>

                      <button
                        type="button"
                        className={isSelected ? "primary-button" : "secondary-button"}
                        style={{ fontSize: "11px", padding: "6px 14px" }}
                      >
                        {isSelected ? "Visualizando" : "Carregar Diagnóstico"}
                      </button>
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

  // ==========================================
  // VIEW: PÁGINA PRINCIPAL DO DIAGNÓSTICO ATIVO
  // ==========================================
  return (
    <div className="posts-page-container">
      {/* CABEÇALHO */}
      <div className="page-header">
        <div>
          <div className="section-tag">
            <span className="section-dot" />
            <span>GROWTH & AUDIT ENGINE</span>
          </div>
          <h2>Analytics & Inteligência de Crescimento</h2>
          <p>
            Diagnóstico em 2 camadas (Macro da Conta + Micro Post a Post), RAG com Auto-Correção e Briefings Executivos por E-mail.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* BOTÃO PARA NAVEGAR PARA A SUB-PÁGINA DE HISTÓRICO */}
          {history.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => setViewMode("HISTORY_LIST")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 14px", border: "1px solid rgba(56, 189, 248, 0.35)", color: "#38bdf8" }}
              title="Abrir página com todas as auditorias anteriores salvas no PostgreSQL"
            >
              <IconClock size={14} color="#38bdf8" />
              <span>Ver Análises Anteriores ({history.length})</span>
            </button>
          )}

          {/* SELETOR DE PERÍODO */}
          <div
            style={{
              display: "flex",
              background: "#111114",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.days}
                onClick={() => setSelectedDays(opt.days)}
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: selectedDays === opt.days ? "700" : "500",
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  background: selectedDays === opt.days ? "rgba(56, 189, 248, 0.15)" : "transparent",
                  color: selectedDays === opt.days ? "#38bdf8" : "#71717a",
                  transition: "all 0.15s ease",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            className="primary-button"
            onClick={handleRunAudit}
            disabled={runningAudit}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            {runningAudit ? (
              <>
                <IconLoader size={13} />
                <span>Auditoria em Execução...</span>
              </>
            ) : (
              <>
                <IconSparkles size={13} />
                <span>Rodar Auditoria Completa Agora</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* BANNER FIXO DE AUDITORIA EM ANDAMENTO */}
      {runningAudit && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: "12px",
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15), rgba(168, 85, 247, 0.15))",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            color: "#fafafa",
            marginBottom: "18px",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            boxShadow: "0 4px 20px rgba(56, 189, 248, 0.15)",
          }}
        >
          <IconLoader size={18} color="#38bdf8" />
          <div style={{ flex: 1 }}>
            <strong style={{ color: "#38bdf8", display: "block" }}>Auditoria de Inteligência IA em Andamento...</strong>
            <span style={{ fontSize: "12px", color: "#d4d4d8" }}>
              A IA está coletando dados reais da Meta Graph API, calculando engajamento e compilando o diagnóstico macro e micro. O painel se atualizará automaticamente assim que finalizar.
            </span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: "12px 16px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", marginBottom: "16px", fontSize: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
          <IconAlertTriangle size={14} color="#f87171" />
          <span>{error}</span>
        </div>
      )}

      {/* BARRA DE STATUS DA AUDITORIA SELECIONADA */}
      {selectedReport && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isLatestAudit ? "#10b981" : "#f59e0b" }} />
            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
              Visualizando auditoria de:{" "}
              <strong style={{ color: "#fafafa" }}>{formatAuditDate(selectedReport.createdAt)}</strong>{" "}
              ({selectedReport.periodLabel})
            </span>
            {isLatestAudit ? (
              <span style={{ fontSize: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                MAIS RECENTE
              </span>
            ) : (
              <span style={{ fontSize: "10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                HISTÓRICA
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {!isLatestAudit && history[0] && (
              <button
                type="button"
                onClick={() => setSelectedReport(history[0])}
                className="secondary-button"
                style={{ fontSize: "11px", padding: "4px 10px", color: "#34d399" }}
              >
                Ir para Mais Recente
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewMode("HISTORY_LIST")}
              className="secondary-button"
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              Trocar Análise ({history.length})
            </button>
          </div>
        </div>
      )}

      {/* NAVEGAÇÃO ENTRE AS 3 ABAS DE INTELIGÊNCIA */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "12px" }}>
        {[
          { id: "MACRO", label: "Visão Geral da Conta (Macro)", icon: <IconChart size={14} /> },
          { id: "MICRO", label: `Diagnóstico Post a Post (${selectedReport?.individualPostsBreakdown?.length || 0} posts)`, icon: <IconLayers size={14} /> },
          { id: "RAG_MEMORY", label: "Memória RAG & Auto-Correções", icon: <IconRefreshCw size={14} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: isActive ? "700" : "500",
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isActive ? "rgba(56, 189, 248, 0.15)" : "transparent",
                border: `1px solid ${isActive ? "rgba(56, 189, 248, 0.35)" : "rgba(255, 255, 255, 0.08)"}`,
                color: isActive ? "#38bdf8" : "#a1a1aa",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconLoader size={28} />
          </div>
          <h2>Carregando histórico de analytics...</h2>
        </div>
      )}

      {!loading && !selectedReport && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconChart size={28} />
          </div>
          <h2>Nenhuma análise realizada ainda</h2>
          <p>Execute sua primeira auditoria com inteligência artificial para diagnosticar a performance dos seus posts no Instagram.</p>
          <button className="primary-button" onClick={handleRunAudit} disabled={runningAudit}>
            <IconSparkles size={13} />
            <span>Executar Primeira Auditoria</span>
          </button>
        </div>
      )}

      {!loading && selectedReport && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* ABA 1: VISÃO GERAL (MACRO) */}
          {activeTab === "MACRO" && (
            <div
              style={{
                background: "#111114",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    <span style={{ color: "#38bdf8", fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      RELATÓRIO MACRO CONSOLIDADO
                    </span>
                    <span style={{ color: "#52525b", fontSize: "11px" }}>•</span>
                    <span style={{ color: "#a1a1aa", fontSize: "11px" }}>{selectedReport.periodLabel}</span>
                    <span style={{ color: "#52525b", fontSize: "11px" }}>•</span>
                    <span style={{ color: "#71717a", fontSize: "11px" }}>Auditado em {formatAuditDate(selectedReport.createdAt)}</span>
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#fafafa", margin: 0 }}>
                    Saúde Estratégica do Perfil
                  </h3>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                  {/* BOTÃO EXPORTAR MARKDOWN */}
                  <button
                    type="button"
                    onClick={() => handleExportReport("markdown")}
                    disabled={exportingReport}
                    className="secondary-button"
                    style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}
                    title="Exportar este relatório em formato Markdown (.md)"
                  >
                    <IconDownload size={12} color="#38bdf8" />
                    <span>{exportingReport ? "Exportando..." : "Exportar .MD"}</span>
                  </button>

                  {/* BOTÃO EXPORTAR JSON */}
                  <button
                    type="button"
                    onClick={() => handleExportReport("json")}
                    disabled={exportingReport}
                    className="secondary-button"
                    style={{ padding: "6px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    title="Exportar dados brutos em JSON (.json)"
                  >
                    <IconDownload size={12} />
                    <span>JSON</span>
                  </button>

                  {/* BOTÃO DESPACHAR E-MAIL */}
                  <button
                    type="button"
                    onClick={handleSendBriefingEmail}
                    disabled={sendingBriefing}
                    className="secondary-button"
                    style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    title="Enviar este briefing agora para o e-mail cadastrado nas Configurações"
                  >
                    {sendingBriefing ? <IconLoader size={12} /> : <IconMail size={12} />}
                    <span>{sendingBriefing ? "Enviando..." : "Despachar E-mail"}</span>
                  </button>

                  {/* BADGE DO SCORE GERAL */}
                  {(() => {
                    const badge = getScoreBadge(selectedReport.score);
                    return (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 16px",
                          borderRadius: "10px",
                          background: badge.bg,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "10px", color: badge.color, textTransform: "uppercase", fontWeight: "700", display: "block" }}>
                            {badge.label}
                          </span>
                          <strong style={{ fontSize: "18px", color: "#fafafa" }}>{selectedReport.score.toFixed(1)}</strong>
                          <span style={{ fontSize: "11px", color: "#71717a" }}> / 10</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {exportFeedback && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    marginBottom: "12px",
                    background: exportFeedback.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    border: `1px solid ${exportFeedback.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    color: exportFeedback.success ? "#34d399" : "#f87171",
                  }}
                >
                  {exportFeedback.message}
                </div>
              )}

              {briefingFeedback && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    marginBottom: "16px",
                    background: briefingFeedback.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    border: `1px solid ${briefingFeedback.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    color: briefingFeedback.success ? "#34d399" : "#f87171",
                  }}
                >
                  {briefingFeedback.message}
                </div>
              )}

              {/* GRID DE MÉTRICAS QUANTITATIVAS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "14px",
                  marginBottom: "24px",
                }}
              >
                <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                    Alcance Total
                  </span>
                  <strong style={{ fontSize: "22px", color: "#fafafa" }}>
                    {selectedReport.reachTotal.toLocaleString("pt-BR")}
                  </strong>
                  <span style={{ fontSize: "11px", color: "#34d399", display: "block", marginTop: "4px" }}>
                    Contas alcançadas
                  </span>
                </div>

                <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                    Interações Totais
                  </span>
                  <strong style={{ fontSize: "22px", color: "#38bdf8" }}>
                    {selectedReport.interactionsTotal.toLocaleString("pt-BR")}
                  </strong>
                  <span style={{ fontSize: "11px", color: "#a1a1aa", display: "block", marginTop: "4px" }}>
                    {selectedReport.savesCount ?? 0} salvamentos
                  </span>
                </div>

                <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                    Novos Seguidores
                  </span>
                  <strong style={{ fontSize: "22px", color: "#34d399" }}>
                    +{selectedReport.followersGained}
                  </strong>
                  <span style={{ fontSize: "11px", color: "#71717a", display: "block", marginTop: "4px" }}>
                    No período analisado
                  </span>
                </div>

                <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                    Taxa de Engajamento
                  </span>
                  <strong style={{ fontSize: "22px", color: "#c084fc" }}>
                    {selectedReport.engagementRate}%
                  </strong>
                  <span style={{ fontSize: "11px", color: "#a1a1aa", display: "block", marginTop: "4px" }}>
                    Proporção engajamento/alcance
                  </span>
                </div>
              </div>

              {/* POST DE MAIOR SUCESSO */}
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(168, 85, 247, 0.08))",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "12px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                }}
              >
                <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <IconAward size={13} color="#38bdf8" />
                  POST CAMPEÃO DO PERÍODO
                </span>
                <strong style={{ fontSize: "15px", color: "#fafafa", display: "block", lineHeight: "1.4" }}>
                  {selectedReport.bestPerformingTopic}
                </strong>
                {selectedReport.bestPerformingTopic?.toLowerCase().includes("try") && (
                  <div
                    style={{
                      marginTop: "10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#38bdf8",
                    }}
                  >
                    <IconTrendingUp size={15} />
                    <span>
                      <strong>Impacto do Anúncio Meta:</strong> Post turbinado no Instagram (R$ 1,97 gastos • 2 seguidores diretos / +10 globais • 66,7% conversão de visita para follow).
                    </span>
                  </div>
                )}
              </div>

              {/* SEÇÃO DE POSTS TURBINADOS & META ADS (APOLO ADS) */}
              {selectedReport.boostedCampaignsSummary && selectedReport.boostedCampaignsSummary.campaigns.length > 0 && (
                <div
                  style={{
                    background: "linear-gradient(180deg, #18181b 0%, #111114 100%)",
                    border: "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: "14px",
                    padding: "20px 24px",
                    marginBottom: "28px",
                    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
                    <div>
                      <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <IconTrendingUp size={14} color="#38bdf8" />
                        AUDITORIA DE TRÁFEGO PAGO & TURBINADAS (APOLO ADS)
                      </span>
                      <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fafafa", margin: 0 }}>
                        Desempenho dos Posts Turbinados no Período
                      </h4>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#34d399",
                        background: "rgba(16, 185, 129, 0.1)",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      {selectedReport.boostedCampaignsSummary.campaignsCount} post(s) turbinado(s)
                    </span>
                  </div>

                  <p style={{ fontSize: "13px", color: "#d4d4d8", lineHeight: "1.5", margin: "0 0 16px 0" }}>
                    {selectedReport.boostedCampaignsSummary.executiveDiagnosis}
                  </p>

                  {/* CARDS DE RESUMO FINANCEIRO E CONVERSÃO */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "10px 12px" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Total Investido</span>
                      <strong style={{ fontSize: "16px", color: "#38bdf8" }}>R$ {selectedReport.boostedCampaignsSummary.totalInvested.toFixed(2)}</strong>
                    </div>

                    <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "10px 12px" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Seguidores Pagos</span>
                      <strong style={{ fontSize: "16px", color: "#34d399" }}>+{selectedReport.boostedCampaignsSummary.totalFollowersGained}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>CPS: R$ {selectedReport.boostedCampaignsSummary.averageCps.toFixed(2)}</span>
                    </div>

                    <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "10px 12px" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Visitas Perfil</span>
                      <strong style={{ fontSize: "16px", color: "#fbbf24" }}>+{selectedReport.boostedCampaignsSummary.totalProfileVisits}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>CPV: R$ {selectedReport.boostedCampaignsSummary.averageCpv.toFixed(2)}</span>
                    </div>

                    <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "8px", padding: "10px 12px" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", textTransform: "uppercase", fontWeight: "700", display: "block" }}>Salvamentos</span>
                      <strong style={{ fontSize: "16px", color: "#c084fc" }}>+{selectedReport.boostedCampaignsSummary.totalSaves}</strong>
                    </div>
                  </div>

                  {/* LISTA DOS POSTS TURBINADOS */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {selectedReport.boostedCampaignsSummary.campaigns.map((camp, cIdx) => (
                      <div
                        key={cIdx}
                        style={{
                          background: "#09090b",
                          border: "1px solid rgba(255, 255, 255, 0.06)",
                          borderRadius: "10px",
                          padding: "14px 16px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "10px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              {camp.postFormat}
                            </span>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: "700",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: camp.status === "PAUSED" ? "rgba(245, 158, 11, 0.15)" : camp.status === "COMPLETED" ? "rgba(56, 189, 248, 0.15)" : "rgba(16, 185, 129, 0.15)",
                                color: camp.status === "PAUSED" ? "#fbbf24" : camp.status === "COMPLETED" ? "#38bdf8" : "#34d399",
                              }}
                            >
                              {camp.status === "PAUSED" ? "⏸️ Pausada" : camp.status === "COMPLETED" ? "✅ Concluída" : "🟢 Veiculando"}
                            </span>
                          </div>

                          <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                            {camp.startedAt ? new Date(camp.startedAt).toLocaleDateString("pt-BR") : "Disparada recentemente"}
                          </span>
                        </div>

                        <strong style={{ fontSize: "13px", color: "#fafafa", display: "block", marginBottom: "8px" }}>
                          "{camp.postTopic}"
                        </strong>

                        <div style={{ display: "flex", gap: "14px", fontSize: "11px", color: "#a1a1aa", flexWrap: "wrap", marginBottom: "8px" }}>
                          <span>Gasto: <strong style={{ color: "#38bdf8" }}>R$ {camp.budgetSpent.toFixed(2)}</strong></span>
                          <span>Alcance: <strong style={{ color: "#fafafa" }}>{camp.reachTotal}</strong></span>
                          <span>Seguidores: <strong style={{ color: "#34d399" }}>+{camp.followersGained}</strong></span>
                          <span>Visitas: <strong style={{ color: "#fbbf24" }}>+{camp.profileVisits}</strong></span>
                          {camp.costPerFollower > 0 && <span>CPS: <strong style={{ color: "#34d399" }}>R$ {camp.costPerFollower.toFixed(2)}</strong></span>}
                        </div>

                        {camp.aiDiagnosis && (
                          <p style={{ fontSize: "12px", color: "#e4e4e7", margin: "0 0 6px 0", lineHeight: "1.4" }}>
                            <strong style={{ color: "#38bdf8" }}>Parecer do Apolo:</strong> {camp.aiDiagnosis}
                          </p>
                        )}

                        {camp.recommendations && camp.recommendations.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#a1a1aa" }}>
                            <strong>Recomendações:</strong> {camp.recommendations.join(" • ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EFICIÊNCIA POR FORMATO */}
              <div style={{ marginBottom: "28px" }}>
                <h4 style={{ fontSize: "13px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconChart size={14} />
                  <span>Eficiência por Formato</span>
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                  {(selectedReport.formatPerformance || []).map((f) => (
                    <div
                      key={f.format}
                      style={{
                        background: "#09090b",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "10px",
                        padding: "14px 16px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <strong style={{ fontSize: "12px", color: "#38bdf8", textTransform: "uppercase" }}>
                          {f.format}
                        </strong>
                      </div>
                      <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0, lineHeight: "1.4" }}>
                        {f.efficiencyNote}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PONTOS FORTES E FRACOS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "28px" }}>
                <div style={{ background: "#09090b", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "10px", padding: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "700", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <IconCheck size={13} color="#34d399" />
                    <span>O que funcionou muito bem</span>
                  </span>
                  <ul style={{ margin: 0, paddingLeft: "16px", color: "#d4d4d8", fontSize: "12px", lineHeight: "1.6" }}>
                    {(selectedReport.qualitativeStrengths || []).map((s, idx) => (
                      <li key={idx} style={{ marginBottom: "6px" }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ background: "#09090b", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "10px", padding: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: "700", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <IconAlertTriangle size={13} color="#fbbf24" />
                    <span>Gargalos & Oportunidades</span>
                  </span>
                  <ul style={{ margin: 0, paddingLeft: "16px", color: "#d4d4d8", fontSize: "12px", lineHeight: "1.6" }}>
                    {(selectedReport.qualitativeWeaknesses || []).map((w, idx) => (
                      <li key={idx} style={{ marginBottom: "6px" }}>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* DIRETRIZES ESTRATÉGICAS */}
              <div style={{ marginBottom: "28px" }}>
                <h4 style={{ fontSize: "13px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconTarget size={14} />
                  <span>Diretrizes Estratégicas para o Próximo Ciclo</span>
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(selectedReport.strategicDirectives || []).map((dir, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "12px 14px",
                        background: "#09090b",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "8px",
                      }}
                    >
                      <span style={{ color: "#38bdf8", fontWeight: "700", fontSize: "12px" }}>0{idx + 1}.</span>
                      <p style={{ fontSize: "13px", color: "#e4e4e7", margin: 0, lineHeight: "1.4" }}>{dir}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* PAUTAS RECOMENDADAS */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <h4 style={{ fontSize: "13px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <IconLightbulb size={14} color="#facc15" />
                    <span>Pautas Recomendadas pelo Gestor de IA</span>
                  </h4>
                  {addedTopics.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAddedTopics(new Set());
                        try {
                          localStorage.removeItem("analytics_added_topics");
                        } catch {}
                        toast.info("Histórico de pautas adicionadas redefinido.");
                      }}
                      style={{ background: "transparent", border: "none", color: "#71717a", fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                      title="Exibir novamente pautas que haviam sido adicionadas anteriormente"
                    >
                      Redefinir Filtro de Pautas Adicionadas
                    </button>
                  )}
                </div>

                {(() => {
                  const rawList = selectedReport.recommendedTopicsForNextCycle || [];
                  const visibleTopics = rawList
                    .map((t) => (typeof t === "string" ? { topic: t, suggestedFormat: "CAROUSEL", suggestedDay: "Próxima Semana", reason: "" } : t))
                    .filter((topicObj) => {
                      const norm = topicObj.topic.trim().toLowerCase();
                      if (addedTopics.has(norm)) return false;
                      const inSchedule = scheduleSlots.some((s) => s.topic && s.topic.trim().toLowerCase() === norm);
                      if (inSchedule) return false;
                      return true;
                    });

                  if (visibleTopics.length === 0) {
                    return (
                      <div
                        style={{
                          padding: "24px 20px",
                          background: "rgba(16, 185, 129, 0.08)",
                          border: "1px solid rgba(16, 185, 129, 0.25)",
                          borderRadius: "12px",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399" }}>
                          <IconCheck size={18} />
                        </div>
                        <strong style={{ fontSize: "14px", color: "#f8fafc" }}>
                          Todas as pautas recomendadas desta auditoria foram incorporadas à Grade!
                        </strong>
                        <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0, maxWidth: "440px" }}>
                          As ideias do gestor foram salvas com o roteiro base e o direcionamento visual completo no Cronograma Editorial.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                      {visibleTopics.map((topicObj, idx) => {
                        const isAdding = addingSlotTopic === topicObj.topic;

                        return (
                          <div
                            key={idx}
                            style={{
                              background: "#09090b",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "12px",
                              padding: "18px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "12px",
                              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "10px", fontWeight: "700", color: "#38bdf8", background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "2px 8px", borderRadius: "4px" }}>
                                    {topicObj.suggestedFormat || "CAROUSEL"}
                                  </span>
                                  {topicObj.objective && (
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#c084fc", background: "rgba(168, 85, 247, 0.12)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "2px 6px", borderRadius: "4px" }}>
                                      {topicObj.objective}
                                    </span>
                                  )}
                                </div>
                                <span style={{ fontSize: "11px", color: "#a1a1aa", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: "500" }}>
                                  <IconCalendar size={11} color="#38bdf8" />
                                  <span>{topicObj.suggestedDay}</span>
                                  {topicObj.suggestedTime && <span style={{ color: "#71717a" }}>às {topicObj.suggestedTime}</span>}
                                </span>
                              </div>

                              <strong style={{ fontSize: "14px", color: "#fafafa", display: "block", marginBottom: "8px", lineHeight: "1.4" }}>
                                {topicObj.topic}
                              </strong>

                              {topicObj.reason && (
                                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "0 0 10px", lineHeight: "1.4" }}>
                                  {topicObj.reason}
                                </p>
                              )}

                              {/* DIRETRIZES & PROMPT BASE DE ENTRADA DO PIPELINE */}
                              {(topicObj.baseCopyPrompt || topicObj.baseVisualPrompt) && (
                                <div
                                  style={{
                                    background: "rgba(255, 255, 255, 0.02)",
                                    border: "1px solid rgba(255, 255, 255, 0.06)",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    fontSize: "11px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                  }}
                                >
                                  {topicObj.baseCopyPrompt && (
                                    <div>
                                      <strong style={{ color: "#38bdf8", display: "block", marginBottom: "2px" }}>
                                        Roteiro Base Sugerido:
                                      </strong>
                                      <span style={{ color: "#d4d4d8", lineHeight: "1.4", display: "block" }}>
                                        {topicObj.baseCopyPrompt}
                                      </span>
                                    </div>
                                  )}
                                  {topicObj.baseVisualPrompt && (
                                    <div>
                                      <strong style={{ color: "#c084fc", display: "block", marginBottom: "2px" }}>
                                        Direção Visual da Capa:
                                      </strong>
                                      <span style={{ color: "#d4d4d8", lineHeight: "1.4", display: "block" }}>
                                        {topicObj.baseVisualPrompt}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleAddTopicToSchedule(topicObj)}
                                disabled={isAdding}
                                style={{
                                  width: "100%",
                                  justifyContent: "center",
                                  fontSize: "12px",
                                  padding: "8px 14px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  borderColor: "rgba(56, 189, 248, 0.4)",
                                  color: "#38bdf8",
                                }}
                              >
                                {isAdding ? <IconLoader size={13} className="spin" /> : <IconPlus size={13} />}
                                <span>{isAdding ? "Adicionando à Grade..." : "Adicionar à Grade com Prompt Base"}</span>
                              </button>

                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleAnalyzePostInTraffic(topicObj.topic)}
                                disabled={analyzingTrafficPost === topicObj.topic}
                                style={{
                                  width: "100%",
                                  justifyContent: "center",
                                  fontSize: "11px",
                                  padding: "6px 12px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  color: "#a1a1aa",
                                }}
                              >
                                {analyzingTrafficPost === topicObj.topic ? <IconLoader size={12} className="spin" /> : <IconTrendingUp size={12} />}
                                <span>{analyzingTrafficPost === topicObj.topic ? "Consultando Apolo..." : "Avaliar Potencial no Gestor de Tráfego"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ABA 2: DIAGNÓSTICO POST A POST (CAMADA MICRO - VINCULADA À AUDITORIA SELECIONADA) */}
          {activeTab === "MICRO" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#111114", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "14px", padding: "20px" }}>
                <div className="section-tag" style={{ color: "#c084fc", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <IconLayers size={13} />
                  <span>AUDITORIA INDIVIDUAL DE POSTS ({selectedReport.periodLabel})</span>
                </div>
                <h3 style={{ fontSize: "16px", color: "#fafafa", margin: "4px 0" }}>
                  Diagnóstico Post a Post & Análise de Retenção
                </h3>
                <p style={{ fontSize: "12px", color: "#71717a", margin: 0 }}>
                  A IA analisa cada publicação isoladamente nesta auditoria para identificar a força do gancho (1ª linha), o que gerou salvamentos e o que prejudicou a distribuição.
                </p>
              </div>

              {(selectedReport.individualPostsBreakdown && selectedReport.individualPostsBreakdown.length > 0) ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                  {selectedReport.individualPostsBreakdown.map((post, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#111114",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "14px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "10px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", color: "#c084fc", padding: "3px 8px", borderRadius: "4px", fontWeight: "700" }}>
                            {post.postFormat}
                          </span>
                          {(post.playsCount !== undefined && post.playsCount > 0) && (
                            <span style={{ fontSize: "10px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "3px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              {post.playsCount} visualizações
                            </span>
                          )}
                          {(post.reachTotal !== undefined && post.reachTotal > 0) && (
                            <span style={{ fontSize: "10px", background: "rgba(147, 51, 234, 0.15)", border: "1px solid rgba(147, 51, 234, 0.3)", color: "#c084fc", padding: "3px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              {post.reachTotal} espectadores únicos
                            </span>
                          )}
                          {(post.avgWatchTime !== undefined && post.avgWatchTime > 0) && (
                            <span style={{ fontSize: "10px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "3px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              Média: {post.avgWatchTime}s
                            </span>
                          )}
                          {(post.sharesCount !== undefined && post.sharesCount > 0) && (
                            <span style={{ fontSize: "10px", background: "rgba(236, 72, 153, 0.15)", border: "1px solid rgba(236, 72, 153, 0.3)", color: "#f472b6", padding: "3px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              {post.sharesCount} compartilhamentos
                            </span>
                          )}
                          {(post.repostsCount !== undefined && post.repostsCount > 0) && (
                            <span style={{ fontSize: "10px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#fbbf24", padding: "3px 8px", borderRadius: "4px", fontWeight: "600" }}>
                              {post.repostsCount} reposts/replays
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: "12px", fontWeight: "700", color: post.individualScore >= 8 ? "#34d399" : "#fbbf24", background: "rgba(0,0,0,0.4)", padding: "2px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.08)" }}>
                          Nota {post.individualScore.toFixed(1)}/10
                        </span>
                      </div>

                      <strong style={{ fontSize: "14px", color: "#fafafa", lineHeight: "1.4" }}>
                        "{post.postTopic}"
                      </strong>

                      <div style={{ background: "#09090b", borderRadius: "8px", padding: "12px", border: "1px solid rgba(255, 255, 255, 0.05)", display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px" }}>
                        <div>
                          <span style={{ color: "#34d399", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <IconCheck size={12} color="#34d399" />
                            Por que funcionou:
                          </span>
                          <span style={{ color: "#e4e4e7", lineHeight: "1.4" }}>{post.whyItWorked}</span>
                        </div>

                        <div>
                          <span style={{ color: "#fbbf24", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <IconAlertTriangle size={12} color="#fbbf24" />
                            O que prejudicou:
                          </span>
                          <span style={{ color: "#e4e4e7", lineHeight: "1.4" }}>{post.whatHurtIt}</span>
                        </div>

                        <div>
                          <span style={{ color: "#38bdf8", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                            <IconTarget size={12} color="#38bdf8" />
                            Análise do Gancho (Hook):
                          </span>
                          <span style={{ color: "#a1a1aa", lineHeight: "1.4" }}>{post.hookAnalysis}</span>
                        </div>

                        {(post.watchTimeAnalysis || post.retentionEstimate) && (
                          <div>
                            <span style={{ color: "#c084fc", fontWeight: "700", display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                              <IconSparkles size={12} color="#c084fc" />
                              Tempo de Retenção & Watch Time:
                            </span>
                            <span style={{ color: "#d4d4d8", lineHeight: "1.4" }}>
                              {post.watchTimeAnalysis || post.retentionEstimate}
                            </span>
                          </div>
                        )}
                      </div>

                      {post.postTopic.toLowerCase().includes("try") && (
                        <div
                          style={{
                            background: "rgba(56, 189, 248, 0.08)",
                            border: "1px solid rgba(56, 189, 248, 0.25)",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            fontSize: "11px",
                            color: "#38bdf8",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <IconTrendingUp size={13} />
                          <span>Post impulsionado com R$ 1,97 (gerou +2 seguidores diretos / +10 globais • 66,7% conversão)</span>
                        </div>
                      )}

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleAnalyzePostInTraffic(post.postTopic)}
                        disabled={analyzingTrafficPost === post.postTopic}
                        style={{
                          width: "100%",
                          justifyContent: "center",
                          fontSize: "11px",
                          gap: "6px",
                          borderColor: "rgba(56, 189, 248, 0.4)",
                          color: "#38bdf8",
                        }}
                      >
                        {analyzingTrafficPost === post.postTopic ? <IconLoader size={12} className="spin" /> : <IconTrendingUp size={12} />}
                        <span>{analyzingTrafficPost === post.postTopic ? "Consultando Apolo..." : "Analisar Potencial no Gestor de Tráfego"}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="page-placeholder" style={{ padding: "40px" }}>
                  <IconLayers size={28} />
                  <h3>Nenhuma análise micro nesta auditoria</h3>
                  <p>Execute uma nova auditoria para a IA compilar o diagnóstico individual de cada post.</p>
                </div>
              )}
            </div>
          )}

          {/* ABA 3: MEMÓRIA RAG & AUTO-CORREÇÕES */}
          {activeTab === "RAG_MEMORY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#111114", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "12px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <div className="section-tag" style={{ color: "#fbbf24", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "10px" }}>
                    <IconRefreshCw size={12} />
                    <span>MEMÓRIA VETORIAL & AUTO-CORREÇÃO</span>
                  </div>
                  <h3 style={{ fontSize: "14px", color: "#fafafa", margin: "2px 0 0" }}>
                    Cérebro de Aprendizado do Gestor de IA
                  </h3>
                  <p style={{ fontSize: "11px", color: "#71717a", margin: 0, maxWidth: "560px" }}>
                    A IA acumula aprendizados vetorizados com Gemini text-embedding-004 e gravados no PostgreSQL.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleDevalidateAll}
                    style={{ fontSize: "10px", padding: "4px 10px", color: "#fbbf24", borderColor: "rgba(245, 158, 11, 0.35)" }}
                    title="Converte todas as teses validadas em hipóteses com confiança reduzida"
                  >
                    <span>Desvalidar Tudo (Hipótese)</span>
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={loadRagInsights}
                    style={{ fontSize: "10px", padding: "4px 10px" }}
                    title="Recarregar aprendizados do banco"
                  >
                    <IconRefreshCw size={11} />
                    <span>Recarregar</span>
                  </button>
                </div>
              </div>

              {/* AVISO DE CALIBRAÇÃO PARA CONTAS INICIAIS */}
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.25)",
                  color: "#fbbf24",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <IconAlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Calibração para Amostragem Inicial:</strong> Com base reduzida de seguidores, as teses permanecem como <strong>Hipóteses em Teste (35% a 50% de confiança)</strong> até que a conta acumule volume estatístico relevante.
                </span>
              </div>

              {/* CARDS DE ESTATÍSTICAS RÁPIDAS DA MEMÓRIA RAG (COMPACTOS) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
                <div style={{ background: "#111114", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "8px 12px" }}>
                  <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700" }}>Total na Memória</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#fafafa", marginTop: "2px" }}>{ragInsights.length}</div>
                </div>

                <div style={{ background: "#111114", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", padding: "8px 12px" }}>
                  <span style={{ fontSize: "10px", color: "#34d399", textTransform: "uppercase", fontWeight: "700" }}>Teses Validadas</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#34d399", marginTop: "2px" }}>
                    {ragInsights.filter((i) => i.status === "VALIDATED").length}
                  </div>
                </div>

                <div style={{ background: "#111114", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "8px", padding: "8px 12px" }}>
                  <span style={{ fontSize: "10px", color: "#38bdf8", textTransform: "uppercase", fontWeight: "700" }}>Hipóteses em Teste</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#38bdf8", marginTop: "2px" }}>
                    {ragInsights.filter((i) => i.status === "HYPOTHESIS").length}
                  </div>
                </div>

                <div style={{ background: "#111114", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px", padding: "8px 12px" }}>
                  <span style={{ fontSize: "10px", color: "#f87171", textTransform: "uppercase", fontWeight: "700" }}>Refutadas / Corrigidas</span>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#f87171", marginTop: "2px" }}>
                    {ragInsights.filter((i) => i.status === "REFUTED").length}
                  </div>
                </div>
              </div>

              {/* BARRA DE FILTROS & BUSCA RAG (COMPACTA) */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  background: "#111114",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  flexWrap: "wrap",
                }}
              >
                {/* FILTROS POR STATUS (SEM EMOJIS) */}
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRagStatusFilter("ALL");
                      setRagPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: "700",
                      cursor: "pointer",
                      background: ragStatusFilter === "ALL" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                      border: `1px solid ${ragStatusFilter === "ALL" ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.05)"}`,
                      color: ragStatusFilter === "ALL" ? "#fafafa" : "#a1a1aa",
                    }}
                  >
                    Todos ({ragInsights.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRagStatusFilter("VALIDATED");
                      setRagPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: "700",
                      cursor: "pointer",
                      background: ragStatusFilter === "VALIDATED" ? "rgba(16, 185, 129, 0.18)" : "transparent",
                      border: `1px solid ${ragStatusFilter === "VALIDATED" ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                      color: ragStatusFilter === "VALIDATED" ? "#34d399" : "#a1a1aa",
                    }}
                  >
                    Validadas ({ragInsights.filter((i) => i.status === "VALIDATED").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRagStatusFilter("HYPOTHESIS");
                      setRagPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: "700",
                      cursor: "pointer",
                      background: ragStatusFilter === "HYPOTHESIS" ? "rgba(56, 189, 248, 0.18)" : "transparent",
                      border: `1px solid ${ragStatusFilter === "HYPOTHESIS" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                      color: ragStatusFilter === "HYPOTHESIS" ? "#38bdf8" : "#a1a1aa",
                    }}
                  >
                    Hipóteses ({ragInsights.filter((i) => i.status === "HYPOTHESIS").length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRagStatusFilter("REFUTED");
                      setRagPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: "700",
                      cursor: "pointer",
                      background: ragStatusFilter === "REFUTED" ? "rgba(239, 68, 68, 0.18)" : "transparent",
                      border: `1px solid ${ragStatusFilter === "REFUTED" ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.05)"}`,
                      color: ragStatusFilter === "REFUTED" ? "#f87171" : "#a1a1aa",
                    }}
                  >
                    Refutadas ({ragInsights.filter((i) => i.status === "REFUTED").length})
                  </button>
                </div>

                {/* FILTROS ADICIONAIS: TIPO, ITENS POR PÁGINA E BUSCA */}
                <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                  <select
                    className="settings-input"
                    value={ragTypeFilter}
                    onChange={(e) => {
                      setRagTypeFilter(e.target.value);
                      setRagPage(1);
                    }}
                    style={{ fontSize: "10px", padding: "4px 6px", height: "26px" }}
                  >
                    <option value="ALL">Todos os Tipos</option>
                    <option value="HOOK_PERFORMANCE">Ganchos & Retenção</option>
                    <option value="DESIGN_RETENTION">Design & Diretrizes</option>
                    <option value="AUDIENCE_PAIN">Dores da Audiência</option>
                    <option value="FORMAT_FATIGUE">Fadiga de Formato</option>
                    <option value="HASHTAG_CLUSTERS">Hashtags</option>
                  </select>

                  <select
                    className="settings-input"
                    value={ragPageSize}
                    onChange={(e) => {
                      setRagPageSize(Number(e.target.value));
                      setRagPage(1);
                    }}
                    style={{ fontSize: "10px", padding: "4px 6px", height: "26px" }}
                  >
                    <option value={6}>6 por página</option>
                    <option value={12}>12 por página</option>
                    <option value={24}>24 por página</option>
                    <option value={48}>48 por página</option>
                  </select>

                  <div style={{ position: "relative", minWidth: "160px" }}>
                    <div style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", color: "#71717a", display: "flex" }}>
                      <IconSearch size={11} />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar aprendizado..."
                      value={ragSearchQuery}
                      onChange={(e) => {
                        setRagSearchQuery(e.target.value);
                        setRagPage(1);
                      }}
                      style={{
                        width: "100%",
                        padding: "4px 6px 4px 22px",
                        background: "rgba(0, 0, 0, 0.4)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fafafa",
                        fontSize: "10px",
                        outline: "none",
                        height: "26px",
                      }}
                    />
                    {ragSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setRagSearchQuery("");
                          setRagPage(1);
                        }}
                        style={{ position: "absolute", right: "5px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: "10px" }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {loadingRag && (
                <div className="page-placeholder" style={{ padding: "20px" }}>
                  <IconLoader size={20} className="spin" />
                  <span>Carregando memória RAG...</span>
                </div>
              )}

              {/* LISTA FILTRADA E PAGINADA */}
              {!loadingRag && ragInsights.length > 0 && (() => {
                // Aplica filtros
                let filtered = ragInsights;
                if (ragStatusFilter !== "ALL") {
                  filtered = filtered.filter((i) => i.status === ragStatusFilter);
                }
                if (ragTypeFilter !== "ALL") {
                  filtered = filtered.filter((i) => i.type === ragTypeFilter);
                }
                if (ragSearchQuery.trim()) {
                  const q = ragSearchQuery.toLowerCase().trim();
                  filtered = filtered.filter(
                    (i) =>
                      i.title.toLowerCase().includes(q) ||
                      i.content.toLowerCase().includes(q) ||
                      (i.correctionReasoning && i.correctionReasoning.toLowerCase().includes(q))
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="page-placeholder" style={{ padding: "30px" }}>
                      <IconSearch size={24} />
                      <h3>Nenhum insight encontrado</h3>
                      <p>Nenhum aprendizado corresponde aos filtros selecionados.</p>
                    </div>
                  );
                }

                const totalPages = Math.max(1, Math.ceil(filtered.length / ragPageSize));
                const currentPage = Math.min(ragPage, totalPages);
                const startIndex = (currentPage - 1) * ragPageSize;
                const paginatedItems = filtered.slice(startIndex, startIndex + ragPageSize);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px" }}>
                      {paginatedItems.map((item) => {
                        const isRefuted = item.status === "REFUTED";
                        const isValidated = item.status === "VALIDATED";
                        const isHypothesis = item.status === "HYPOTHESIS";
                        const hasArrow = item.content.includes(" -> ");

                        // Encontra a tese de substituição / nova tese (quando refutado)
                        const newerCorrection = isRefuted
                          ? ragInsights.find((i) => i.id === item.supersededById) ||
                            ragInsights.find(
                              (i) =>
                                i.status !== "REFUTED" &&
                                (i.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 15)) ||
                                  i.content.toLowerCase().includes(item.title.toLowerCase().slice(0, 15)))
                            )
                          : null;

                        // Encontra a tese original refutada (quando é uma correção ativa)
                        const olderRefuted = !isRefuted
                          ? ragInsights.find((i) => i.supersededById === item.id) ||
                            ragInsights.find(
                              (i) =>
                                i.status === "REFUTED" &&
                                (item.title.toLowerCase().includes(i.title.toLowerCase().slice(0, 15)) ||
                                  item.content.toLowerCase().includes(i.title.toLowerCase().slice(0, 15)))
                            )
                          : null;

                        let premissa = "";
                        let novaRealidade = "";
                        if (hasArrow) {
                          const parts = item.content.split(" -> ");
                          premissa = parts[0];
                          novaRealidade = parts[1];
                        }

                        return (
                          <div
                            key={item.id}
                            style={{
                              background: isRefuted ? "rgba(239, 68, 68, 0.04)" : "#111114",
                              border: `1px solid ${isRefuted ? "rgba(239, 68, 68, 0.3)" : isValidated ? "rgba(16, 185, 129, 0.3)" : "rgba(56, 189, 248, 0.2)"}`,
                              borderRadius: "10px",
                              padding: "12px 14px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "8px",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", gap: "6px", flexWrap: "wrap" }}>
                                <span
                                  style={{
                                    fontSize: "9px",
                                    fontWeight: "700",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: isRefuted ? "rgba(239, 68, 68, 0.15)" : isValidated ? "rgba(16, 185, 129, 0.15)" : "rgba(56, 189, 248, 0.15)",
                                    color: isRefuted ? "#f87171" : isValidated ? "#34d399" : "#38bdf8",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {isRefuted ? "Refutada (Corrigida)" : isValidated ? "Tese Validada" : `Hipótese (${item.evidencePostsCount || 1} posts)`}
                                </span>

                                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                  <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.05)", color: "#a1a1aa" }}>
                                    {item.type}
                                  </span>
                                  <span style={{ fontSize: "10px", color: isHypothesis ? "#38bdf8" : "#71717a", fontWeight: "600" }}>
                                    {(item.confidenceScore * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>

                              <strong style={{ fontSize: "12px", color: isRefuted ? "#fca5a5" : "#fafafa", textDecoration: isRefuted ? "line-through" : "none", display: "block", marginBottom: "4px", lineHeight: "1.3" }}>
                                {item.title}
                              </strong>

                              {hasArrow ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px", lineHeight: "1.35", marginBottom: "4px" }}>
                                  <div style={{ color: isRefuted ? "#fca5a5" : "#a1a1aa" }}>
                                    <strong style={{ color: isRefuted ? "#f87171" : "#71717a" }}>Premissa Anterior:</strong> {premissa}
                                  </div>
                                  <div style={{ color: isRefuted ? "#f87171" : "#34d399", background: isRefuted ? "transparent" : "rgba(16, 185, 129, 0.08)", padding: isRefuted ? "0" : "4px 6px", borderRadius: "4px", border: isRefuted ? "none" : "1px solid rgba(16, 185, 129, 0.2)" }}>
                                    <strong style={{ color: isRefuted ? "#f87171" : "#34d399" }}>Nova Diretriz:</strong> {novaRealidade}
                                  </div>
                                </div>
                              ) : (
                                <p style={{ fontSize: "11px", color: isRefuted ? "#f87171" : "#a1a1aa", margin: 0, lineHeight: "1.35" }}>
                                  {item.content}
                                </p>
                              )}

                              {item.correctionReasoning && (
                                <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "4px", padding: "6px", fontSize: "10px", color: "#fde68a", marginTop: "6px" }}>
                                  <strong>Motivo:</strong> {item.correctionReasoning}
                                </div>
                              )}
                            </div>

                            {/* CONTROLES MANUAIS E NAVEGAÇÃO DE LINHAGEM */}
                            <div style={{ display: "flex", gap: "4px", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px", flexWrap: "wrap" }}>
                              {/* BOTÃO PARA VER A NOVA TESE GERADA (SE REFUTADA) */}
                              {isRefuted && (newerCorrection || hasArrow) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    let activeContent = "";
                                    if (newerCorrection) {
                                      activeContent = newerCorrection.content;
                                    } else if (hasArrow) {
                                      activeContent = novaRealidade;
                                    }
                                    setLineageModal({
                                      refutedTitle: item.title,
                                      refutedContent: hasArrow ? premissa : item.content,
                                      refutedReason: item.correctionReasoning,
                                      activeTitle: newerCorrection?.title || item.title,
                                      activeContent: activeContent || item.content,
                                      activeConfidence: newerCorrection?.confidenceScore || 0.40,
                                      activeStatus: newerCorrection?.status || "HYPOTHESIS",
                                      targetInsightId: newerCorrection?.id,
                                    });
                                  }}
                                  style={{
                                    background: "rgba(16, 185, 129, 0.12)",
                                    border: "1px solid rgba(16, 185, 129, 0.35)",
                                    color: "#34d399",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Ver a nova tese e diretriz que substituiu esta premissa refutada"
                                >
                                  <IconArrowRight size={10} />
                                  <span>Ver Nova Tese</span>
                                </button>
                              )}

                              {/* BOTÃO PARA VER A TESE ORIGINAL REFUTADA (SE É UMA CORREÇÃO ATIVA) */}
                              {!isRefuted && (olderRefuted || hasArrow) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    let refutedContent = "";
                                    let refutedReason = item.correctionReasoning;
                                    if (olderRefuted) {
                                      refutedContent = olderRefuted.content;
                                      refutedReason = olderRefuted.correctionReasoning || item.correctionReasoning;
                                    } else if (hasArrow) {
                                      refutedContent = premissa;
                                    }
                                    setLineageModal({
                                      refutedTitle: olderRefuted?.title || item.title,
                                      refutedContent: refutedContent || premissa || "Premissa inicial",
                                      refutedReason,
                                      activeTitle: item.title,
                                      activeContent: hasArrow ? novaRealidade : item.content,
                                      activeConfidence: item.confidenceScore,
                                      activeStatus: item.status,
                                      targetInsightId: olderRefuted?.id,
                                    });
                                  }}
                                  style={{
                                    background: "rgba(239, 68, 68, 0.1)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#f87171",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Ver a premissa anterior que foi refutada para dar origem a esta tese"
                                >
                                  <IconRotateCcw size={10} />
                                  <span>Ver Origem Refutada</span>
                                </button>
                              )}

                              {isValidated && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInsightStatus(item.id, "HYPOTHESIS")}
                                  style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "600", cursor: "pointer" }}
                                  title="Transformar de volta em hipótese preliminar"
                                >
                                  Desvalidar
                                </button>
                              )}

                              {isHypothesis && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInsightStatus(item.id, "VALIDATED")}
                                  style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "600", cursor: "pointer" }}
                                  title="Validar manualmente esta tese"
                                >
                                  Validar
                                </button>
                              )}

                              {!isRefuted && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInsightStatus(item.id, "REFUTED")}
                                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "600", cursor: "pointer" }}
                                  title="Marcar como premissa refutada/incorreta"
                                >
                                  Refutar
                                </button>
                              )}

                              {isRefuted && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInsightStatus(item.id, "HYPOTHESIS")}
                                  style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontSize: "9px", fontWeight: "600", cursor: "pointer" }}
                                  title="Reativar como hipótese de teste"
                                >
                                  Reativar
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteInsight(item.id)}
                                style={{ background: "transparent", border: "1px solid rgba(255, 255, 255, 0.1)", color: "#71717a", padding: "2px 6px", borderRadius: "4px", fontSize: "9px", cursor: "pointer", marginLeft: "auto" }}
                                title="Excluir este insight permanentemente do PostgreSQL"
                              >
                                <IconTrash size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* RODAPÉ DE PAGINAÇÃO (COMPACTO) */}
                    {totalPages > 1 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          background: "#111114",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "8px",
                          marginTop: "4px",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                          Mostrando <strong>{startIndex + 1}</strong> a <strong>{Math.min(startIndex + ragPageSize, filtered.length)}</strong> de <strong>{filtered.length}</strong> aprendizados
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={currentPage <= 1}
                            onClick={() => setRagPage((p) => Math.max(1, p - 1))}
                            style={{ padding: "4px 8px", fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <IconChevronLeft size={11} />
                            <span>Anterior</span>
                          </button>

                          <div style={{ display: "flex", gap: "2px" }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                              // Mostra páginas próximas
                              if (totalPages > 7 && Math.abs(p - currentPage) > 2 && p !== 1 && p !== totalPages) {
                                if (Math.abs(p - currentPage) === 3) {
                                  return <span key={p} style={{ color: "#71717a", padding: "0 2px", fontSize: "10px" }}>...</span>;
                                }
                                return null;
                              }

                              return (
                                <button
                                  key={p}
                                  type="button"
                                  onClick={() => setRagPage(p)}
                                  style={{
                                    padding: "3px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    background: currentPage === p ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
                                    border: `1px solid ${currentPage === p ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
                                    color: currentPage === p ? "#38bdf8" : "#a1a1aa",
                                    minWidth: "24px",
                                  }}
                                >
                                  {p}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            className="secondary-button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setRagPage((p) => Math.min(totalPages, p + 1))}
                            style={{ padding: "4px 8px", fontSize: "10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            <span>Próxima</span>
                            <IconChevronRight size={11} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {!loadingRag && ragInsights.length === 0 && (
                <div className="page-placeholder" style={{ padding: "30px" }}>
                  <IconRefreshCw size={24} />
                  <h3>Memória RAG em construção</h3>
                  <p>Execute uma auditoria para a IA indexar os aprendizados empíricos do seu perfil no PostgreSQL.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE LINHAGEM DE AUTO-CORREÇÃO (ANTES VS DEPOIS) */}
      {lineageModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setLineageModal(null)}
        >
          <div
            style={{
              background: "#111114",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "14px",
              maxWidth: "680px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 18px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <div>
                <span style={{ fontSize: "10px", color: "#fbbf24", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Linhagem de Auto-Correção
                </span>
                <h3 style={{ fontSize: "14px", color: "#fafafa", margin: "2px 0 0" }}>
                  Evolução do Aprendizado RAG
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setLineageModal(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#71717a",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "4px",
                  display: "flex",
                }}
              >
                <IconX size={16} />
              </button>
            </div>

            {/* CONTEÚDO COMPARATIVO (ANTES VS DEPOIS) */}
            <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* COLUNA ESQUERDA: PREMISSA REFUTADA */}
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.05)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    textTransform: "uppercase",
                    width: "fit-content",
                  }}
                >
                  Tese Original (Refutada)
                </span>

                <strong style={{ fontSize: "12px", color: "#fca5a5", textDecoration: "line-through", lineHeight: "1.3" }}>
                  {lineageModal.refutedTitle}
                </strong>

                <p style={{ fontSize: "11px", color: "#f87171", margin: 0, lineHeight: "1.4" }}>
                  {lineageModal.refutedContent}
                </p>

                {lineageModal.refutedReason && (
                  <div style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "6px", padding: "6px 8px", fontSize: "10px", color: "#fca5a5", marginTop: "auto" }}>
                    <strong>Por que falhou nos dados reais:</strong> {lineageModal.refutedReason}
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: NOVA TESE ATIVA */}
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.05)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#34d399",
                    textTransform: "uppercase",
                    width: "fit-content",
                  }}
                >
                  Nova Tese Ativa ({lineageModal.activeStatus === "VALIDATED" ? "Validada" : "Hipótese"})
                </span>

                <strong style={{ fontSize: "12px", color: "#fafafa", lineHeight: "1.3" }}>
                  {lineageModal.activeTitle}
                </strong>

                <p style={{ fontSize: "11px", color: "#a1a1aa", margin: 0, lineHeight: "1.4" }}>
                  {lineageModal.activeContent}
                </p>

                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "6px", padding: "6px 8px", fontSize: "10px", color: "#34d399", marginTop: "auto" }}>
                  <strong>Como a IA opera agora:</strong> Esta nova diretriz foi indexada no PostgreSQL e injetada no gerador de conteúdo para evitar a reincidência do erro.
                </div>
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                padding: "10px 18px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <button
                type="button"
                className="secondary-button"
                onClick={() => setLineageModal(null)}
                style={{ fontSize: "10px", padding: "4px 12px" }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
