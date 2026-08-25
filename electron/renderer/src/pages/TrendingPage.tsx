import React, { useState, useEffect, useMemo } from "react";
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
  IconSearch,
  IconStar,
  IconGitBranch,
  IconNewspaper,
  IconCode,
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

type TrendingTab = "RECOMMENDED" | "GENERAL" | "REPOSITORIES" | "NEWS";

const GENERAL_CATEGORIES = [
  "Todas",
  "DevOps & Cloud",
  "Backend & Arquitetura",
  "Frontend & UI",
  "Inteligência Artificial",
  "Segurança & Performance",
  "Carreira Dev",
];

export function TrendingPage({ onGeneratePost, onNavigateToPosts, onOpenRepoToPost }: TrendingPageProps) {
  const { toast, showConfirm } = useModal();
  const { activities, registerOrUpdateActivity } = useActivities();
  const [topics, setTopics] = useState<TrendingTopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TrendingTab>("RECOMMENDED");
  const [selectedGeneralCategory, setSelectedGeneralCategory] = useState("Todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopicItem | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Detecta se há varredura de tendências em execução em nível global
  const isGlobalScanning = useMemo(() => {
    return activities.some((a) => a.type === "trending_scan" && a.status === "running");
  }, [activities]);

  const isScanning = refreshing || isGlobalScanning;

  useEffect(() => {
    loadTopics();
  }, []);

  // Sincronização automática quando a atividade de varredura concluir
  useEffect(() => {
    const completedScan = activities.find(
      (a) => a.type === "trending_scan" && a.status === "completed"
    );
    if (completedScan) {
      loadTopics();
    }
  }, [activities]);

  // Polling automático para atualizar a tela em tempo real enquanto estiver escaneando
  useEffect(() => {
    if (!isScanning) return;
    const timer = setInterval(() => {
      loadTopics();
    }, 2500);
    return () => clearInterval(timer);
  }, [isScanning]);

  async function loadTopics() {
    try {
      if (window.electronAPI?.getTrendingTopics) {
        const data = await window.electronAPI.getTrendingTopics();
        setTopics(data);
      }
    } catch (err) {
      console.warn("[TrendingPage] Aviso ao carregar tendências:", err);
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
      title: "Radar de Tendências & Repositórios (IA)",
      subtitle: "Buscando tendências tech e 5 repositórios em alta no GitHub",
      targetPage: "trending",
      status: "running",
      statusMessage: "Consultando ecossistema, GitHub Trending e radar de temas...",
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
          title: "Radar de Tendências & Repositórios (IA)",
          subtitle: "Filtrando relevância, ganchos e aplicando cooldown de 30 dias",
          targetPage: "trending",
          status: "running",
          statusMessage: "Subtraindo repositórios/temas já publicados recentemente...",
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
            title: "Radar de Tendências & Repositórios (IA)",
            subtitle: `${res.topics.length} tendências encontradas e salvas no PostgreSQL`,
            targetPage: "trending",
            status: "completed",
            statusMessage: "Varredura de tendências e repositórios concluída com sucesso!",
            progress: 100,
            startedAt: startTime,
            canStop: false,
          });
          toast.success("Radar de tendências e repositórios atualizado com sucesso via Inteligência Artificial!");
        } else {
          registerOrUpdateActivity({
            id: activityId,
            type: "trending_scan",
            title: "Radar de Tendências & Repositórios (IA)",
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
        title: "Radar de Tendências & Repositórios (IA)",
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
      title: "Ocultar Tendência",
      message: `Deseja ocultar o tema "${topic.title}" do seu radar de tendências?`,
      confirmText: "Sim, Ocultar",
      cancelText: "Manter",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      if (window.electronAPI?.ignoreTrendingTopic) {
        await window.electronAPI.ignoreTrendingTopic(topic.id);
        setTopics((prev) => prev.filter((t) => t.id !== topic.id));
        if (selectedTopic?.id === topic.id) setSelectedTopic(null);
        toast.info("Tendência ocultada e removida do radar.");
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
        subtitle: `Formato: ${topic.suggestedFormat} | Origem: Radar (${topic.relevanceScore}% em alta)`,
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

        toast.success(`Produção iniciada no pipeline para "${topic.title}"! Acompanhe no Dashboard.`);
        if (selectedTopic?.id === topic.id) setSelectedTopic(null);
      }
    } catch (err) {
      toast.error(`Erro ao despachar para o pipeline: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGeneratingId(null);
    }
  }

  // Helpers de classificação e chave canônica de desduplicação
  const isRepoTopic = (t: TrendingTopicItem): boolean => {
    const cat = (t.category || "").toLowerCase();
    return cat === "repositório github" || cat.includes("repositório");
  };

  const isNewsTopic = (t: TrendingTopicItem): boolean => {
    if (isRepoTopic(t)) return false;
    const cat = (t.category || "").toLowerCase();
    return cat.includes("notícia") || cat.includes("lançamento") || t.narrativeAngle === "BREAKING_NEWS";
  };

  const getCanonicalKey = (t: TrendingTopicItem): string => {
    if (isRepoTopic(t)) {
      if (t.sourceLinks && t.sourceLinks.length > 0) {
        const link = t.sourceLinks.find((l) => l.includes("github.com/"));
        if (link) {
          const m = link.match(/github\.com\/([^/]+\/[^/]+)/i);
          if (m) return `repo:${m[1].toLowerCase().trim()}`;
        }
      }
      const match = t.title.match(/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/i);
      if (match) return `repo:${match[1].toLowerCase().trim()}`;
    }
    return `item:${t.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 35)}`;
  };

  // 1. Repositórios em Alta (Desduplicados)
  const repoTopics = useMemo(() => {
    const list: TrendingTopicItem[] = [];
    const seen = new Set<string>();
    for (const t of topics) {
      if (isRepoTopic(t)) {
        const key = getCanonicalKey(t);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(t);
        }
      }
    }
    return list;
  }, [topics]);

  // 2. Notícias Tech (Desduplicadas, NENHUM repositório)
  const newsTopics = useMemo(() => {
    const list: TrendingTopicItem[] = [];
    const seen = new Set<string>();
    for (const t of topics) {
      if (isNewsTopic(t)) {
        const key = getCanonicalKey(t);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(t);
        }
      }
    }
    return list;
  }, [topics]);

  // 3. Temas Gerais (Desduplicados, NENHUM repositório, NENHUMA notícia)
  const generalTopics = useMemo(() => {
    const list: TrendingTopicItem[] = [];
    const seen = new Set<string>();
    for (const t of topics) {
      if (!isRepoTopic(t) && !isNewsTopic(t)) {
        const key = getCanonicalKey(t);
        if (!seen.has(key)) {
          seen.add(key);
          list.push(t);
        }
      }
    }
    return list;
  }, [topics]);

  // 4. Destaques & Top Recomendações (Zero Duplicatas!)
  const topRecommendations = useMemo(() => {
    const topGen = [...generalTopics].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 2);
    const topRepos = [...repoTopics].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 2);
    const topNews = [...newsTopics].sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 1);

    const combined: TrendingTopicItem[] = [];
    const seen = new Set<string>();

    for (const item of [...topGen, ...topRepos, ...topNews]) {
      const key = getCanonicalKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    if (combined.length < 5) {
      const allUnique = [...generalTopics, ...repoTopics, ...newsTopics].sort((a, b) => b.relevanceScore - a.relevanceScore);
      for (const item of allUnique) {
        if (combined.length >= 5) break;
        const key = getCanonicalKey(item);
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
    }

    return combined.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [generalTopics, repoTopics, newsTopics]);

  // Filtragem com busca e categoria ativa
  const currentTabTopics = useMemo(() => {
    let list: TrendingTopicItem[] = [];
    switch (activeTab) {
      case "RECOMMENDED":
        list = topRecommendations;
        break;
      case "REPOSITORIES":
        list = repoTopics;
        break;
      case "NEWS":
        list = newsTopics;
        break;
      case "GENERAL":
      default:
        list = generalTopics;
        if (selectedGeneralCategory !== "Todas") {
          list = list.filter((t) => t.category.toLowerCase().includes(selectedGeneralCategory.toLowerCase()));
        }
        break;
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.whyTrending.toLowerCase().includes(q) ||
          t.hookIdea.toLowerCase().includes(q) ||
          (t.sourceLinks && t.sourceLinks.some((l) => l.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [activeTab, topRecommendations, repoTopics, newsTopics, generalTopics, selectedGeneralCategory, searchTerm]);

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

  function getRepoUrl(topic: TrendingTopicItem): string | null {
    if (topic.sourceLinks && topic.sourceLinks.length > 0) {
      const gh = topic.sourceLinks.find((l) => l.includes("github.com"));
      if (gh) return gh;
    }
    // Extrai padrão github do título se houver
    const match = topic.title.match(/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)/);
    if (match) return `https://github.com/${match[1]}`;
    return null;
  }

  return (
    <div className="tests-page" style={{ maxWidth: "1280px", margin: "0 auto", paddingBottom: "40px" }}>
      {/* CABEÇALHO */}
      <div className="tests-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <IconTrendingUp size={13} color="#38bdf8" />
              RADAR DE INTELIGÊNCIA EDITORIAL & REPOSITÓRIOS GITHUB
            </span>
          </div>
          <h1 style={{ margin: "0 0 6px 0", fontSize: "24px", color: "#fafafa" }}>Temas em Alta & Repositórios Trending</h1>
          <p style={{ margin: 0, fontSize: "13px", color: "#a1a1aa", maxWidth: "720px" }}>
            Varredura contínua de tendências, lançamentos de tecnologia e repositórios open-source quentes no GitHub com subtração automática de temas já abordados.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={handleRefresh}
          disabled={isScanning || loading}
          style={{ padding: "10px 18px", fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {isScanning ? <IconLoader className="spin" size={14} /> : <IconRefreshCw size={14} />}
          <span>{isScanning ? "Buscando Tendências & Repos..." : "Escanear Novas Tendências"}</span>
        </button>
      </div>

      {/* SUB-NAVBAR COM ABAS & BARRA DE PESQUISA */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          background: "rgba(18, 18, 22, 0.75)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "14px",
          padding: "8px 12px",
          marginBottom: "20px",
          backdropFilter: "blur(12px)",
          flexWrap: "wrap",
        }}
      >
        {/* ABAS */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveTab("RECOMMENDED")}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              background: activeTab === "RECOMMENDED" ? "rgba(56, 189, 248, 0.18)" : "transparent",
              border: `1px solid ${activeTab === "RECOMMENDED" ? "rgba(56, 189, 248, 0.4)" : "transparent"}`,
              color: activeTab === "RECOMMENDED" ? "#38bdf8" : "#a1a1aa",
            }}
          >
            <IconStar size={13} color={activeTab === "RECOMMENDED" ? "#38bdf8" : "#71717a"} />
            <span>Destaques & Top Recomendações</span>
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", color: "#fafafa" }}>
              {topRecommendations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("GENERAL")}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              background: activeTab === "GENERAL" ? "rgba(168, 85, 247, 0.18)" : "transparent",
              border: `1px solid ${activeTab === "GENERAL" ? "rgba(168, 85, 247, 0.4)" : "transparent"}`,
              color: activeTab === "GENERAL" ? "#c084fc" : "#a1a1aa",
            }}
          >
            <IconLayers size={13} color={activeTab === "GENERAL" ? "#c084fc" : "#71717a"} />
            <span>Temas Gerais & Arquitetura</span>
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", color: "#fafafa" }}>
              {generalTopics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("REPOSITORIES")}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              background: activeTab === "REPOSITORIES" ? "rgba(16, 185, 129, 0.18)" : "transparent",
              border: `1px solid ${activeTab === "REPOSITORIES" ? "rgba(16, 185, 129, 0.4)" : "transparent"}`,
              color: activeTab === "REPOSITORIES" ? "#34d399" : "#a1a1aa",
            }}
          >
            <IconGitBranch size={13} color={activeTab === "REPOSITORIES" ? "#34d399" : "#71717a"} />
            <span>Repositórios GitHub (Trending)</span>
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.2)", color: "#34d399", fontWeight: "800" }}>
              {repoTopics.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("NEWS")}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
              background: activeTab === "NEWS" ? "rgba(245, 158, 11, 0.18)" : "transparent",
              border: `1px solid ${activeTab === "NEWS" ? "rgba(245, 158, 11, 0.4)" : "transparent"}`,
              color: activeTab === "NEWS" ? "#fbbf24" : "#a1a1aa",
            }}
          >
            <IconNewspaper size={13} color={activeTab === "NEWS" ? "#fbbf24" : "#71717a"} />
            <span>Notícias & Lançamentos</span>
            <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.08)", color: "#fafafa" }}>
              {newsTopics.length}
            </span>
          </button>
        </div>

        {/* CAMPO DE BUSCA RÁPIDA */}
        <div style={{ display: "flex", alignItems: "center", position: "relative", minWidth: "220px" }}>
          <div style={{ position: "absolute", left: "10px", color: "#71717a", display: "flex" }}>
            <IconSearch size={13} />
          </div>
          <input
            type="text"
            placeholder="Pesquisar tendência ou repo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 10px 6px 30px",
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
              color: "#fafafa",
              fontSize: "12px",
              outline: "none",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{ position: "absolute", right: "8px", background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: "12px" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* PÍLULAS DE CATEGORIA (QUANDO EM TEMAS GERAIS) */}
      {activeTab === "GENERAL" && (
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "8px", marginBottom: "20px" }}>
          {GENERAL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedGeneralCategory(cat)}
              style={{
                padding: "5px 12px",
                borderRadius: "16px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                background: selectedGeneralCategory === cat ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.04)",
                border: `1px solid ${selectedGeneralCategory === cat ? "rgba(168, 85, 247, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
                color: selectedGeneralCategory === cat ? "#c084fc" : "#a1a1aa",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* BANNER INFORMATIVO NA ABA DE REPOSITÓRIOS GITHUB */}
      {activeTab === "REPOSITORIES" && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(56, 189, 248, 0.08) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", display: "flex" }}>
              <IconGitBranch size={16} />
            </div>
            <div>
              <strong style={{ fontSize: "13px", color: "#fafafa", display: "block" }}>
                Repositórios em Alta no GitHub com Dissecação Automática (Repo-to-Post)
              </strong>
              <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "2px 0 0 0" }}>
                Selecione qualquer repositório abaixo para dissecar a arquitetura, README e criar um Carrossel ou Reels animado com 1 clique.
              </p>
            </div>
          </div>

          {onOpenRepoToPost && (
            <button
              type="button"
              className="primary-button"
              style={{ background: "#10b981", borderColor: "#059669", padding: "8px 14px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => onOpenRepoToPost("")}
            >
              <IconCode size={13} />
              <span>Inserir Outro Repositório Manual</span>
            </button>
          )}
        </div>
      )}

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
      {!loading && currentTabTopics.length === 0 && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconTrendingUp size={32} />
          </div>
          <h2>Nenhuma tendência encontrada</h2>
          <p>
            {searchTerm
              ? `Nenhum resultado para a busca "${searchTerm}". Tente outros termos.`
              : "Clique no botão acima para escanear novas tendências e repositórios com IA."}
          </p>
        </div>
      )}

      {/* GRADE DE CARDS */}
      {!loading && currentTabTopics.length > 0 && (
        <div className="tests-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px" }}>
          {currentTabTopics.map((topic) => {
            const isRepo = isRepoTopic(topic);
            const isNews = isNewsTopic(topic);
            const formatBadge = getFormatBadge(topic.suggestedFormat);
            const isGenerating = generatingId === topic.id;
            const repoUrl = getRepoUrl(topic);

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
                  background: isRepo
                    ? "linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(18, 18, 22, 0.95) 100%)"
                    : isNews
                    ? "linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, rgba(18, 18, 22, 0.95) 100%)"
                    : "var(--bg-surface)",
                  border: isRepo
                    ? "1px solid rgba(16, 185, 129, 0.25)"
                    : isNews
                    ? "1px solid rgba(245, 158, 11, 0.25)"
                    : "1px solid var(--border-card)",
                  borderRadius: "12px",
                  padding: "18px",
                  boxShadow: isRepo ? "0 4px 20px rgba(16, 185, 129, 0.06)" : undefined,
                }}
              >
                <div>
                  {/* LINHA SUPERIOR COM BADGES E RELEVÂNCIA */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "8px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: isRepo ? "rgba(16, 185, 129, 0.15)" : isNews ? "rgba(245, 158, 11, 0.15)" : "rgba(147, 51, 234, 0.15)",
                          border: `1px solid ${isRepo ? "rgba(16, 185, 129, 0.3)" : isNews ? "rgba(245, 158, 11, 0.3)" : "rgba(147, 51, 234, 0.3)"}`,
                          color: isRepo ? "#34d399" : isNews ? "#fbbf24" : "#c084fc",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {isRepo && <IconGitBranch size={10} />}
                        {isNews && <IconNewspaper size={10} />}
                        <span>{topic.category}</span>
                      </span>

                      <span
                        style={{
                          fontSize: "10px",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: formatBadge.bg,
                          border: `1px solid ${formatBadge.border}`,
                          color: formatBadge.color,
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {formatBadge.icon}
                        <span>{formatBadge.label}</span>
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#34d399",
                        background: "rgba(16, 185, 129, 0.12)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {topic.relevanceScore}% em alta
                    </span>
                  </div>

                  {/* TÍTULO */}
                  <h3 style={{ fontSize: "15px", color: "#fafafa", lineHeight: "1.4", margin: "0 0 8px 0", fontWeight: "700" }}>
                    {topic.title}
                  </h3>

                  {/* RESUMO */}
                  <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5", margin: "0 0 12px 0" }}>
                    {topic.summary}
                  </p>

                  {/* POR QUE ESTÁ EM ALTA */}
                  {topic.whyTrending && (
                    <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", padding: "8px 10px", marginBottom: "12px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", display: "block", marginBottom: "2px" }}>
                        Tração & Momento
                      </span>
                      <p style={{ fontSize: "11px", color: "#d4d4d8", margin: 0, lineHeight: "1.4" }}>
                        {topic.whyTrending}
                      </p>
                    </div>
                  )}

                  {/* GANCHO RECOMENDADO */}
                  <div style={{ background: "#09090b", borderRadius: "8px", padding: "10px 12px", border: "1px solid rgba(255, 255, 255, 0.05)", marginBottom: "14px" }}>
                    <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                      Gancho Provocativo (Hook)
                    </span>
                    <p style={{ fontSize: "12px", color: "#e4e4e7", margin: 0, fontStyle: "italic", lineHeight: "1.4" }}>
                      "{topic.hookIdea}"
                    </p>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO DO CARD */}
                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={(e) => handleIgnore(topic, e)}
                    className="secondary-button"
                    style={{ padding: "8px 10px", fontSize: "11px", color: "#71717a" }}
                    title="Ocultar esta tendência do radar"
                  >
                    <IconTrash size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTopic(topic);
                    }}
                    className="secondary-button"
                    style={{ padding: "8px 12px", fontSize: "11px", fontWeight: "600", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                    title="Ver detalhes completos e diretrizes do tema"
                  >
                    <IconEye size={12} />
                    <span>Detalhes</span>
                  </button>

                  {/* SE FOR REPOSITÓRIO: BOTÃO DIRETO PARA REPO-TO-POST */}
                  {isRepo && onOpenRepoToPost ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const query = repoUrl || topic.title.split(":")[0].trim();
                        onOpenRepoToPost(query);
                      }}
                      className="primary-button"
                      style={{
                        flex: 1,
                        background: "#10b981",
                        borderColor: "#059669",
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                      }}
                      title="Dissecar este repositório imediatamente no Repo-to-Post"
                    >
                      <IconCode size={12} />
                      <span>Dissecar Repo</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleGenerate(topic, e)}
                      disabled={isGenerating}
                      className="primary-button"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "11px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                      }}
                      title="Enviar tema com prompts diretamente para o pipeline do robô"
                    >
                      {isGenerating ? <IconLoader className="spin" size={12} /> : <IconSparkles size={12} />}
                      <span>{isGenerating ? "Gerando..." : "Produzir Post"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DEEP DIVE (LEITURA APROFUNDADA DA TENDÊNCIA OU REPO) */}
      {selectedTopic && (
        <div className="post-modal-backdrop">
          <div
            className="edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px", maxHeight: "88vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(147, 51, 234, 0.15)", border: "1px solid rgba(147, 51, 234, 0.3)", color: "#c084fc", fontWeight: "700" }}>
                    {selectedTopic.category || "Tecnologia"}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(56, 189, 248, 0.15)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", fontWeight: "700" }}>
                    {selectedTopic.suggestedFormat || "CAROUSEL"}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "4px", background: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", color: "#34d399", fontWeight: "700" }}>
                    {selectedTopic.relevanceScore ?? 90}% Relevância
                  </span>
                </div>
                <h2 style={{ fontSize: "18px", color: "#fafafa", margin: 0 }}>{selectedTopic.title || "Tema em Destaque"}</h2>
              </div>

              <button className="modal-close" onClick={() => setSelectedTopic(null)} title="Fechar">
                <IconX size={18} />
              </button>
            </div>

            <div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* LINK DO REPOSITÓRIO GITHUB SE DISPONÍVEL */}
              {selectedTopic.sourceLinks && selectedTopic.sourceLinks.length > 0 && (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", borderRadius: "10px", padding: "12px 14px", border: "1px solid rgba(16, 185, 129, 0.25)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <IconGitBranch size={15} color="#34d399" />
                    <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "700" }}>Repositório Oficial:</span>
                    <span style={{ fontSize: "12px", color: "#fafafa" }}>{selectedTopic.sourceLinks[0]}</span>
                  </div>
                  {onOpenRepoToPost && (
                    <button
                      type="button"
                      onClick={() => {
                        const link = selectedTopic.sourceLinks[0];
                        setSelectedTopic(null);
                        onOpenRepoToPost(link);
                      }}
                      className="primary-button"
                      style={{ padding: "4px 10px", fontSize: "11px", background: "#10b981" }}
                    >
                      Dissecar com Repo-to-Post
                    </button>
                  )}
                </div>
              )}

              {/* POR QUE ESTÁ EM ALTA */}
              <div style={{ background: "#09090b", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Por Que Este Tema Está em Alta Agora?
                </span>
                <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5", margin: 0 }}>
                  {selectedTopic.whyTrending || selectedTopic.summary || "Tópico com alto engajamento no ecossistema de desenvolvimento."}
                </p>
              </div>

              {/* ÂNGULO SUGERIDO & RESUMO TÉCNICO */}
              <div style={{ background: "#09090b", borderRadius: "10px", padding: "14px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                  Ângulo Contra-intuitivo & Estratégia
                </span>
                <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5", margin: 0 }}>
                  {selectedTopic.suggestedAngle || "Abordagem técnica com foco em arquitetura e boas práticas."}
                </p>
              </div>

              {/* GANCHO (HOOK) */}
              <div style={{ background: "rgba(56, 189, 248, 0.08)", borderRadius: "10px", padding: "14px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                  Gancho de Alta Retenção (Primeiros 3 Segundos / Capa)
                </span>
                <strong style={{ fontSize: "14px", color: "#f0f9ff", display: "block", lineHeight: "1.4" }}>
                  "{selectedTopic.hookIdea || selectedTopic.title}"
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
                  <span>Ocultar</span>
                </button>

                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
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
                    <span>Produzir com IA</span>
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
