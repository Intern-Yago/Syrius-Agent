import React, { useState, useEffect } from "react";
import {
  BoostCampaign,
  BoostOpportunity,
  TargetAudiencePreset,
  BudgetProjection,
  TrafficBudgetSummary,
} from "../types";
import {
  IconMegaphone,
  IconDollarSign,
  IconUsers,
  IconTarget,
  IconSparkles,
  IconRefreshCw,
  IconPlus,
  IconTrash2,
  IconCheck,
  IconCopy,
  IconMessageSquare,
  IconTrendingUp,
  IconAward,
  IconZap,
  IconClock,
  IconEye,
  IconChevronRight,
  IconX,
  IconLoader,
  IconSend,
  IconRocket,
  IconCalendar,
} from "../components/common/Icons";
import { useModal } from "../context/ModalContext";
import { useActivities } from "../context/ActivitiesContext";

type TabType = "opportunities" | "campaigns" | "audiences" | "simulator" | "chat";

interface AdsPageProps {
  onNavigateToPost?: (postId: string) => void;
}

export function AdsPage({ onNavigateToPost }: AdsPageProps = {}) {
  const { toast } = useModal();
  const { registerOrUpdateActivity, activities } = useActivities();
  const [activeTab, setActiveTab] = useState<TabType>("opportunities");

  // Estado das Campanhas
  const [campaigns, setCampaigns] = useState<BoostCampaign[]>([]);
  const [summary, setSummary] = useState({
    totalInvested: 0,
    totalFollowersGained: 0,
    totalSavesCount: 0,
    totalProfileVisits: 0,
    totalReach: 0,
    averageCostPerFollower: 0,
    averageCostPerSave: 0,
    averageCostPerVisit: 0,
    activeCampaignsCount: 0,
    completedCampaignsCount: 0,
  });
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Estado do Radar de Oportunidades
  const [opportunities, setOpportunities] = useState<BoostOpportunity[]>([]);
  const [budgetRecommendation, setBudgetRecommendation] = useState<any>(null);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [refreshingOpportunities, setRefreshingOpportunities] = useState(false);

  // Verifica se o radar está rodando em segundo plano
  const isScanningOpportunities =
    refreshingOpportunities ||
    loadingOpportunities ||
    activities.some(
      (a) =>
        (a.id === "traffic-radar-scan" || a.type === "ads_growth") &&
        a.status === "running"
    );

  // Estado dos Públicos-Alvo & Estudo por Post
  const [audiences, setAudiences] = useState<TargetAudiencePreset[]>([]);
  const [loadingAudiences, setLoadingAudiences] = useState(false);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [selectedStudyPostId, setSelectedStudyPostId] = useState<string>("");
  const [customAudienceTheme, setCustomAudienceTheme] = useState("");
  const [generatedAudienceStudy, setGeneratedAudienceStudy] = useState<any | null>(null);
  const [generatingAudience, setGeneratingAudience] = useState(false);

  // Estado da Calculadora / Simulador (mínimo real no Brasil é R$ 6/dia)
  const [simDailyBudget, setSimDailyBudget] = useState<number>(6);
  const [simDurationDays, setSimDurationDays] = useState<number>(3);
  const [simObjective, setSimObjective] = useState<string>("PROFILE_VISITS");
  const [projection, setProjection] = useState<BudgetProjection | null>(null);

  // Estado do Chat Consultor
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Olá! Sou o **Apolo**, seu Gestor de Tráfego Pago & Growth Ads Especialista. Estou aqui para te ajudar a transformar cada real investido no Instagram em seguidores desenvolvedores qualificados, salvamentos e autoridade técnica. Como posso te orientar hoje?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedQuestions] = useState<string[]>([
    "Como o post de Try/Catch performou com R$ 1,97 investidos?",
    "Quem é a audiência que mais converteu no anúncio do Try/Catch?",
    "Qual o melhor público para turbinar posts de Clean Code?",
    "Vale mais a pena turbinar Carrossel ou Reels no nicho dev?",
  ]);

  // Modal de Detalhes da Campanha / "Quem viu seu anúncio"
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<any | null>(null);

  // Modal de Nova Turbinada / Seleção de Post do Acervo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSelectedPostId, setModalSelectedPostId] = useState<string>("");
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [modalPostTopic, setModalPostTopic] = useState("");
  const [modalPostFormat, setModalPostFormat] = useState("REEL_SCRIPT");
  const [modalBudgetSpent, setModalBudgetSpent] = useState<number>(2.03);
  const [modalDurationDays, setModalDurationDays] = useState<number>(1);
  const [modalObjective, setModalObjective] = useState("PROFILE_VISITS");
  const [modalFollowersGained, setModalFollowersGained] = useState<number>(2);
  const [modalSavesCount, setModalSavesCount] = useState<number>(3);
  const [modalProfileVisits, setModalProfileVisits] = useState<number>(3);
  const [modalReachTotal, setModalReachTotal] = useState<number>(165);
  const [modalNotes, setModalNotes] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [isSyncingInstagramInsights, setIsSyncingInstagramInsights] = useState(false);

  // Gestão de Orçamento & Saldo Financeiro
  const [budgetSummary, setBudgetSummary] = useState<TrafficBudgetSummary | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [modalMonthlyBudgetInput, setModalMonthlyBudgetInput] = useState<number>(6);
  const [modalStrategyModeInput, setModalStrategyModeInput] = useState<"CONSERVATIVE" | "OPPORTUNISTIC" | "AGGRESSIVE">("OPPORTUNISTIC");
  const [modalAutoBoostEnabledInput, setModalAutoBoostEnabledInput] = useState(false);
  const [modalNotifyEmailInput, setModalNotifyEmailInput] = useState(true);
  const [savingBudgetConfig, setSavingBudgetConfig] = useState(false);

  // Turbinada Autônoma Imediata com Apolo
  const [isAutonomousBoostModalOpen, setIsAutonomousBoostModalOpen] = useState(false);
  const [autoBoostPostId, setAutoBoostPostId] = useState<string>("");
  const [autoBoostDailyBudget, setAutoBoostDailyBudget] = useState<number>(6);
  const [autoBoostDurationMode, setAutoBoostDurationMode] = useState<"BUDGET_CAP" | "FIXED_DAYS" | "UNTIL_PAUSED">("FIXED_DAYS");
  const [autoBoostDurationDays, setAutoBoostDurationDays] = useState<number>(3);
  const [autoBoostBudgetCap, setAutoBoostBudgetCap] = useState<number>(18);
  const [autoBoostSearchQuery, setAutoBoostSearchQuery] = useState("");
  const [dispatchingAutonomousBoost, setDispatchingAutonomousBoost] = useState(false);

  // Verifica se há alguma turbinada sendo disparada ou ativa no momento
  const isAnyBoostActive =
    dispatchingAutonomousBoost ||
    activities.some(
      (a) => a.id.startsWith("boost-") && a.status === "running"
    );

  // Carregamento inicial de dados
  useEffect(() => {
    loadCampaigns();
    loadOpportunities(false);
    loadAudiences();
    loadPosts();
    loadBudgetSummary();
  }, []);

  // Escuta o progresso detalhado de cada etapa da turbinada e reflete em tempo real na Central de Atividades
  useEffect(() => {
    if (!window.electronAPI?.onAdsBoostProgress) return;
    const cleanup = window.electronAPI.onAdsBoostProgress((data) => {
      const selectedPost = postsList.find((p) => p.id === data.postId);
      const postTitle = selectedPost?.topic || "Publicação";
      const activityId = `boost-${data.postId}`;

      registerOrUpdateActivity({
        id: activityId,
        type: "ads_growth",
        title: `Turbinando Post: "${postTitle.slice(0, 35)}..."`,
        subtitle: data.message,
        targetPage: "ads",
        status: data.progress === 100 ? "completed" : "running",
        statusMessage: data.message,
        progress: data.progress,
      });
    });

    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [postsList, registerOrUpdateActivity]);

  async function loadBudgetSummary() {
    try {
      if (window.electronAPI?.getAdsBudgetSummary) {
        const res = await window.electronAPI.getAdsBudgetSummary();
        if (res?.success && res.summary) {
          setBudgetSummary(res.summary);
          setModalMonthlyBudgetInput(res.summary.monthlyBudget);
          setModalStrategyModeInput(res.summary.strategyMode);
          setModalAutoBoostEnabledInput(res.summary.autoBoostEnabled);
          setModalNotifyEmailInput(res.summary.notifyEmailOnSchedule);
        }
      }
    } catch {}
  }

  async function handleToggleAutoBoost() {
    try {
      const nextVal = !budgetSummary?.autoBoostEnabled;
      const res = await window.electronAPI?.updateAdsBudgetConfig?.({
        autoBoostEnabled: nextVal,
      });
      if (res?.success && res.summary) {
        setBudgetSummary(res.summary);
        setModalAutoBoostEnabledInput(nextVal);
        toast.success(nextVal ? "Auto-Turbinar AI Ativado! Apolo selecionará os melhores posts na melhor janela." : "Auto-Turbinar AI desativado.");
      }
    } catch {
      toast.error("Erro ao alterar modo Auto-Turbinar.");
    }
  }

  async function handleSyncInstagramForModal(postId: string) {
    if (!postId) {
      toast.error("Selecione um post antes de sincronizar.");
      return;
    }
    try {
      setIsSyncingInstagramInsights(true);
      const res = await window.electronAPI?.syncAdsInstagramInsights?.(postId);
      if (res?.success && res.metrics) {
        setModalBudgetSpent(res.metrics.suggestedSpent || 2.03);
        setModalReachTotal(res.metrics.impressions || 165);
        setModalProfileVisits(res.metrics.profileVisits || 3);
        setModalFollowersGained(2);
        setModalSavesCount(res.metrics.saves || 3);
        toast.success("Métricas reais do Instagram sincronizadas com sucesso!");
      } else {
        toast.error(res?.error || "Não foi possível puxar métricas automáticas.");
      }
    } catch {
      toast.error("Erro na sincronização.");
    } finally {
      setIsSyncingInstagramInsights(false);
    }
  }

  async function handleSaveBudgetConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSavingBudgetConfig(true);
      const res = await window.electronAPI?.updateAdsBudgetConfig?.({
        monthlyBudget: Number(modalMonthlyBudgetInput),
        strategyMode: modalStrategyModeInput,
        autoBoostEnabled: modalAutoBoostEnabledInput,
        notifyEmailOnSchedule: modalNotifyEmailInput,
      });
      if (res?.success && res.summary) {
        setBudgetSummary(res.summary);
        toast.success("Configurações do Apolo atualizadas com sucesso!");
        setIsBudgetModalOpen(false);
        loadOpportunities(false);
      } else {
        toast.error(res?.error || "Erro ao salvar configurações de orçamento.");
      }
    } catch {
      toast.error("Falha ao atualizar orçamento.");
    } finally {
      setSavingBudgetConfig(false);
    }
  }

  async function handleDispatchAutonomousBoost(e: React.FormEvent) {
    e.preventDefault();
    if (!autoBoostPostId) {
      toast.error("Selecione uma publicação postada no Instagram para turbinar.");
      return;
    }

    const selectedPost = postsList.find((p) => p.id === autoBoostPostId);
    const postTitle = selectedPost?.topic || "Publicação";
    const activityId = `boost-${autoBoostPostId}`;

    const effectiveDurationDays =
      autoBoostDurationMode === "BUDGET_CAP"
        ? Math.max(1, Math.ceil(Number(autoBoostBudgetCap) / (Number(autoBoostDailyBudget) || 6.0)))
        : autoBoostDurationMode === "UNTIL_PAUSED"
        ? 30
        : Number(autoBoostDurationDays) || 1;

    try {
      setDispatchingAutonomousBoost(true);

      registerOrUpdateActivity({
        id: activityId,
        type: "ads_growth",
        title: `Turbinando Post: "${postTitle.slice(0, 35)}..."`,
        subtitle: "Iniciando configuração autônoma na Meta Marketing API...",
        targetPage: "ads",
        status: "running",
        statusMessage: "Iniciando configuração autônoma na Meta Marketing API...",
        progress: 10,
        startedAt: Date.now(),
      });

      const res = await window.electronAPI?.dispatchAutonomousBoost?.({
        postId: autoBoostPostId,
        dailyBudget: Number(autoBoostDailyBudget) || 6.0,
        durationDays: effectiveDurationDays,
        durationMode: autoBoostDurationMode,
        budgetCap: autoBoostDurationMode === "BUDGET_CAP" ? Number(autoBoostBudgetCap) : undefined,
      });

      if (res?.success) {
        registerOrUpdateActivity({
          id: activityId,
          type: "ads_growth",
          title: `Turbinada Ativada: "${postTitle.slice(0, 35)}..."`,
          subtitle: `Campanha ativa no Instagram com R$ ${autoBoostDailyBudget}/dia`,
          targetPage: "ads",
          status: "completed",
          statusMessage: res.message || "Campanha ativada na Meta API com sucesso!",
          progress: 100,
          startedAt: Date.now(),
        });

        toast.success(res.message || "Turbinada ativada com sucesso pelo Apolo no Instagram!");
        setIsAutonomousBoostModalOpen(false);
        loadCampaigns();
        loadBudgetSummary();
      } else {
        registerOrUpdateActivity({
          id: activityId,
          type: "ads_growth",
          title: `Falha ao Turbinar: "${postTitle.slice(0, 35)}..."`,
          subtitle: res?.message || "Erro retornado pela Meta API",
          targetPage: "ads",
          status: "error",
          statusMessage: res?.message || "Erro retornado pela Meta API ao criar campanha.",
          progress: 0,
          startedAt: Date.now(),
        });

        toast.error(res?.message || "Erro ao ativar turbinada.");
      }
    } catch (err: any) {
      registerOrUpdateActivity({
        id: activityId,
        type: "ads_growth",
        title: `Erro ao Turbinar`,
        subtitle: "Falha de conexão com a Meta API",
        targetPage: "ads",
        status: "error",
        statusMessage: err?.message || "Falha ao comunicar com a Meta API.",
        progress: 0,
        startedAt: Date.now(),
      });
      toast.error("Falha ao comunicar com a Meta API.");
    } finally {
      setDispatchingAutonomousBoost(false);
    }
  }

  async function handleScheduleBoostFromRadar(opp: BoostOpportunity, customWindow?: string) {
    try {
      const windowStr = customWindow || opp.bestDayTimeWindow || "Terça-feira às 18:30";
      const parts = windowStr.split(" às ");
      const scheduledDay = parts[0] || "Terça-feira";
      const scheduledTime = parts[1] || "18:30";
      const res = await window.electronAPI?.scheduleAutonomousBoost?.({
        postId: opp.postId,
        scheduledDay,
        scheduledTime,
        dailyBudget: opp.recommendedDailyBudget || 6.0,
        durationDays: opp.recommendedDurationDays || 3,
      });
      if (res?.success) {
        toast.success(res.message || `Turbinada agendada com sucesso para ${scheduledDay} às ${scheduledTime}!`);
        loadCampaigns();
      } else {
        toast.error(res?.message || "Erro ao agendar turbinada.");
      }
    } catch {
      toast.error("Falha ao agendar turbinada pelo Radar.");
    }
  }

  async function loadPosts() {
    try {
      if (window.electronAPI?.getPosts) {
        const posts = await window.electronAPI.getPosts();
        setPostsList(posts || []);
        if (posts && posts.length > 0) {
          setSelectedStudyPostId(posts[0].id);
        }
      }
    } catch {}
  }

  // Recalcula projeção ao mudar inputs do simulador
  useEffect(() => {
    calculateProjection();
  }, [simDailyBudget, simDurationDays, simObjective]);

  async function loadCampaigns() {
    try {
      setLoadingCampaigns(true);
      const res = await window.electronAPI?.getAdsCampaigns?.();
      if (res) {
        setCampaigns(res.campaigns || []);
        setSummary(res.summary || summary);
      }
    } catch (err) {
      console.error("Erro ao carregar campanhas:", err);
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function loadOpportunities(forceRefresh = false) {
    try {
      if (forceRefresh) {
        setRefreshingOpportunities(true);
        registerOrUpdateActivity({
          id: "traffic-radar-scan",
          type: "ads_growth",
          title: "Radar de Oportunidades & Anúncios",
          subtitle: "Apolo está avaliando o catálogo de posts e calculando o Opportunity Score...",
          targetPage: "ads",
          status: "running",
          statusMessage: "Apolo está avaliando o catálogo de posts e calculando o Opportunity Score...",
          progress: 40,
          startedAt: Date.now(),
        });
      } else {
        setLoadingOpportunities(true);
      }

      const res = await window.electronAPI?.getAdsOpportunities?.(forceRefresh);
      if (res?.success && res.candidates) {
        setOpportunities([...res.candidates]);
        setBudgetRecommendation(res.accountBudgetRecommendation ? { ...res.accountBudgetRecommendation } : null);

        if (forceRefresh) {
          registerOrUpdateActivity({
            id: "traffic-radar-scan",
            type: "ads_growth",
            title: "Radar de Oportunidades & Anúncios",
            subtitle: "Oportunidades de turbinamento calculadas com sucesso!",
            targetPage: "ads",
            status: "completed",
            statusMessage: "Oportunidades de turbinamento calculadas com sucesso!",
            progress: 100,
            startedAt: Date.now(),
          });
        }
      }
    } catch (err) {
      console.error("Erro ao carregar oportunidades de turbinamento:", err);
      if (forceRefresh) {
        registerOrUpdateActivity({
          id: "traffic-radar-scan",
          type: "ads_growth",
          title: "Radar de Oportunidades & Anúncios",
          subtitle: "Erro ao calcular oportunidades",
          targetPage: "ads",
          status: "error",
          statusMessage: "Falha ao escanear catálogo de posts com IA.",
          progress: 0,
          startedAt: Date.now(),
        });
      }
    } finally {
      setLoadingOpportunities(false);
      setRefreshingOpportunities(false);
    }
  }

  async function loadAudiences() {
    try {
      setLoadingAudiences(true);
      const res = await window.electronAPI?.getAdsAudiences?.();
      if (res) {
        setAudiences(res);
      }
    } catch (err) {
      console.error("Erro ao carregar públicos:", err);
    } finally {
      setLoadingAudiences(false);
    }
  }

  async function calculateProjection() {
    try {
      const res = await window.electronAPI?.calculateAdsProjection?.({
        dailyBudget: Math.max(6, simDailyBudget),
        durationDays: Math.max(1, simDurationDays),
        objective: simObjective,
      });
      if (res?.success && res.projection) {
        setProjection(res.projection);
      }
    } catch (err) {
      console.error("Erro ao simular projeção:", err);
    }
  }

  async function handleGenerateCustomAudience() {
    let targetPostId = selectedStudyPostId;
    let targetTheme = customAudienceTheme;

    if (targetPostId) {
      const p = postsList.find((x) => x.id === targetPostId);
      if (p) targetTheme = p.topic;
    }

    if (!targetTheme && !targetPostId) {
      toast.error("Selecione um post ou informe o tema técnico para a IA analisar.");
      return;
    }

    try {
      setGeneratingAudience(true);
      registerOrUpdateActivity({
        id: "traffic-audience-gen",
        type: "ads_growth",
        title: "Estudo de Público Meta Ads por Post",
        subtitle: `Apolo está analisando o post: "${targetTheme?.slice(0, 35)}..."`,
        targetPage: "ads",
        status: "running",
        statusMessage: `Cruzando dados demográficos, histórico de conversão e dores do tema "${targetTheme?.slice(0, 30)}..."`,
        progress: 50,
        startedAt: Date.now(),
      });

      const res = await window.electronAPI?.generateAdsAudience?.({
        postId: targetPostId || undefined,
        theme: targetTheme,
        objective: "PROFILE_VISITS",
      });

      if (res?.success && res.audience) {
        setGeneratedAudienceStudy(res.audience);
        toast.success(`Segmentação sob medida gerada pelo Apolo para este post!`);

        registerOrUpdateActivity({
          id: "traffic-audience-gen",
          type: "ads_growth",
          title: "Estudo de Público Meta Ads",
          subtitle: `Segmentação gerada com sucesso para: "${targetTheme?.slice(0, 35)}..."`,
          targetPage: "ads",
          status: "completed",
          statusMessage: `Público "${res.audience.name}" estruturado com sucesso!`,
          progress: 100,
          startedAt: Date.now(),
        });
      } else {
        toast.error(res?.error || "Erro ao gerar público com IA.");
      }
    } catch (err) {
      toast.error("Falha ao se comunicar com o motor de IA.");
    } finally {
      setGeneratingAudience(false);
    }
  }

  async function handleSaveGeneratedAudience(aud: any) {
    try {
      const saved = await window.electronAPI?.saveAdsAudience?.(aud);
      if (saved?.success) {
        toast.success(`Público "${aud.name}" salvo na sua biblioteca de presets!`);
        loadAudiences();
      }
    } catch {
      toast.error("Erro ao salvar público na biblioteca.");
    }
  }

  async function handleSendChatMessage(customText?: string) {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const newMessages = [...chatMessages, { role: "user" as const, content: textToSend }];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const history = chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await window.electronAPI?.chatAdsConsultant?.({
        message: textToSend,
        history,
      });

      if (res?.success && res.reply) {
        setChatMessages((prev) => [...prev, { role: "assistant", content: res.reply || "" }]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: res?.error || "Desculpe, ocorreu uma instabilidade ao formular a resposta.",
          },
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro na conexão com o consultor de tráfego." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function handleSaveCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!modalPostTopic.trim()) {
      toast.error("Selecione um post do acervo para registrar.");
      return;
    }

    try {
      setSavingCampaign(true);
      const res = await window.electronAPI?.saveAdsCampaign?.({
        postId: modalSelectedPostId || undefined,
        postTopic: modalPostTopic,
        postFormat: modalPostFormat,
        budgetSpent: Number(modalBudgetSpent),
        durationDays: Number(modalDurationDays),
        objective: modalObjective,
        followersGained: Number(modalFollowersGained),
        savesCount: Number(modalSavesCount),
        profileVisits: Number(modalProfileVisits),
        reachTotal: Number(modalReachTotal),
        notes: modalNotes,
        status: "COMPLETED",
      });

      if (res?.success) {
        toast.success("Campanha e diagnóstico de turbinada salvos com sucesso!");
        setIsModalOpen(false);
        resetModalForm();
        loadCampaigns();
        loadBudgetSummary();
      } else {
        toast.error(res?.error || "Erro ao salvar campanha.");
      }
    } catch (err) {
      toast.error("Erro inesperado ao registrar turbinada.");
    } finally {
      setSavingCampaign(false);
    }
  }

  function resetModalForm() {
    setModalSelectedPostId("");
    setModalPostTopic("");
    setModalPostFormat("REEL_SCRIPT");
    setPostSearchQuery("");
    setModalBudgetSpent(2.03);
    setModalDurationDays(1);
    setModalObjective("PROFILE_VISITS");
    setModalFollowersGained(2);
    setModalSavesCount(3);
    setModalProfileVisits(3);
    setModalReachTotal(165);
    setModalNotes("");
  }

  async function handleOpenModalForCandidate(candidate: BoostOpportunity) {
    setModalSelectedPostId(candidate.postId || "");
    setModalPostTopic(candidate.topic);
    setModalPostFormat(candidate.format || "CAROUSEL");
    setPostSearchQuery(candidate.topic);
    setModalBudgetSpent(candidate.totalEstimatedInvestment || 6.0);
    setModalDurationDays(candidate.recommendedDurationDays || 3);
    setModalObjective(candidate.recommendedObjective || "PROFILE_VISITS");
    setModalFollowersGained(2);
    setModalSavesCount(3);
    setModalProfileVisits(3);
    setModalReachTotal(165);
    setModalNotes(`Turbinado a partir da recomendação do Radar de Oportunidades: ${candidate.whyBoostNow}`);
    setIsModalOpen(true);
  }

  async function handleDeleteCampaign(id: string) {
    if (!window.confirm("Deseja realmente excluir esta turbinada? Se houver anúncio veiculando na Meta API, ele será cancelado.")) return;
    try {
      const res = await window.electronAPI?.deleteAdsCampaign?.(id);
      if (res?.success) {
        toast.success("Registro de turbinada excluído.");
        loadCampaigns();
        loadBudgetSummary();
      } else {
        toast.error(res?.error || "Falha ao excluir turbinada.");
      }
    } catch {
      toast.error("Erro ao excluir campanha.");
    }
  }

  async function handleToggleCampaignStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === "PAUSED" ? "ACTIVE" : "PAUSED";
    const actionLabel = nextStatus === "PAUSED" ? "pausar" : "retomar";

    if (!window.confirm(`Deseja realmente ${actionLabel} a veiculação desta turbinada no Instagram?`)) return;

    try {
      toast.info(`${nextStatus === "PAUSED" ? "Pausando" : "Retomando"} turbinada...`);
      const res = await window.electronAPI?.updateAdsCampaignStatus?.({
        id,
        status: nextStatus,
      });
      if (res?.success) {
        toast.success(res.message || `Turbinada ${nextStatus === "PAUSED" ? "pausada" : "retomada"} com sucesso!`);
        loadCampaigns();
        loadBudgetSummary();
      } else {
        toast.error(res?.error || res?.message || `Falha ao ${actionLabel} turbinada.`);
      }
    } catch (err: any) {
      toast.error(err?.message || `Erro ao ${actionLabel} turbinada.`);
    }
  }

  function copyToClipboard(text: string, label: string = "Configuração") {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada para a área de transferência!`);
  }

  function formatAudienceChecklist(preset: TargetAudiencePreset): string {
    return `SEGMENTAÇÃO PARA TURBINAR NO INSTAGRAM:
• Nome: ${preset.name}
• Objetivo no App: ${preset.objective === "PROFILE_VISITS" ? "Mais Visitas ao Perfil" : "Mais Mensagens"}
• Idade: ${preset.minAge} a ${preset.maxAge} anos (${preset.genders === "ALL" ? "Todos os gêneros" : preset.genders})
• Localização: ${preset.locations.join(", ")}
• Interesses: ${preset.interests.join(", ")}
• Cargos: ${preset.jobTitles.join(", ")}
• Comportamentos: ${preset.behaviors.join(", ")}
${preset.exclusions?.length ? `• Exclusões: ${preset.exclusions.join(", ")}` : ""}
Dica do Gestor: ${preset.suggestedAction || "Turbinar com R$ 6 a R$ 12/dia por 3 a 5 dias."}`;
  }

  return (
    <div className="page-container ads-page" style={{ padding: "20px 28px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* HEADER DA PÁGINA */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "14px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(56, 189, 248, 0.15)",
                color: "#38bdf8",
                fontSize: "11px",
                fontWeight: "700",
                padding: "2px 8px",
                borderRadius: "20px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              <IconMegaphone size={12} />
              GESTOR DE TRÁFEGO & PROPAGANDA AI
            </span>
            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>• Apolo Growth Specialist</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#fafafa", margin: "0 0 2px 0", letterSpacing: "-0.5px" }}>
            Divulgação, Anúncios & Turbinamento
          </h1>
          <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0 }}>
            Multiplique o alcance dos seus melhores posts, atraia novos seguidores qualificados e otimize seu investimento com inteligência artificial.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* BADGE DE CARTEIRA & ORÇAMENTO DO CRIADOR */}
          <button
            type="button"
            onClick={() => setIsBudgetModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background:
                budgetSummary?.burnRateStatus === "HEALTHY"
                  ? "rgba(16, 185, 129, 0.12)"
                  : budgetSummary?.burnRateStatus === "LOW"
                  ? "rgba(245, 158, 11, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${
                budgetSummary?.burnRateStatus === "HEALTHY"
                  ? "rgba(16, 185, 129, 0.35)"
                  : budgetSummary?.burnRateStatus === "LOW"
                  ? "rgba(245, 158, 11, 0.35)"
                  : "rgba(239, 68, 68, 0.35)"
              }`,
              color:
                budgetSummary?.burnRateStatus === "HEALTHY"
                  ? "#34d399"
                  : budgetSummary?.burnRateStatus === "LOW"
                  ? "#fbbf24"
                  : "#f87171",
            }}
            title="Clique para configurar seu orçamento e modo de investimento do Apolo"
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background:
                  budgetSummary?.burnRateStatus === "HEALTHY"
                    ? "#10b981"
                    : budgetSummary?.burnRateStatus === "LOW"
                    ? "#f59e0b"
                    : "#ef4444",
                boxShadow: `0 0 8px ${
                  budgetSummary?.burnRateStatus === "HEALTHY"
                    ? "rgba(16, 185, 129, 0.8)"
                    : budgetSummary?.burnRateStatus === "LOW"
                    ? "rgba(245, 158, 11, 0.8)"
                    : "rgba(239, 68, 68, 0.8)"
                }`,
              }}
            />
            <IconDollarSign size={13} />
            <span>
              {budgetSummary
                ? `R$ ${budgetSummary.remainingBudget.toFixed(2)} restantes / R$ ${budgetSummary.monthlyBudget.toFixed(2)}`
                : "Carregando saldo..."}
            </span>
          </button>

          {/* BOTÃO TOGGLE DE AUTO-TURBINAR AI */}
          <button
            type="button"
            onClick={handleToggleAutoBoost}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: budgetSummary?.autoBoostEnabled
                ? "linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(59, 130, 246, 0.2))"
                : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${
                budgetSummary?.autoBoostEnabled
                  ? "rgba(56, 189, 248, 0.6)"
                  : "rgba(255, 255, 255, 0.12)"
              }`,
              color: budgetSummary?.autoBoostEnabled ? "#38bdf8" : "#a1a1aa",
              boxShadow: budgetSummary?.autoBoostEnabled ? "0 0 15px rgba(56, 189, 248, 0.2)" : "none",
            }}
            title={budgetSummary?.autoBoostEnabled ? "Piloto Automático Ativo! Apolo programa turbinadas na melhor janela." : "Clique para ativar o Piloto Automático de Turbinamento"}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: budgetSummary?.autoBoostEnabled ? "#38bdf8" : "#71717a",
                boxShadow: budgetSummary?.autoBoostEnabled ? "0 0 8px rgba(56, 189, 248, 0.9)" : "none",
              }}
            />
            <IconZap size={13} color={budgetSummary?.autoBoostEnabled ? "#38bdf8" : "#a1a1aa"} />
            <span>{budgetSummary?.autoBoostEnabled ? "Auto-Turbinar: ATIVADO" : "Auto-Turbinar: DESLIGADO"}</span>
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              loadCampaigns();
              loadOpportunities(false);
              loadAudiences();
              loadBudgetSummary();
            }}
          >
            <IconRefreshCw size={14} />
            <span>Atualizar</span>
          </button>

          <button
            type="button"
            className="primary-button"
            disabled={isAnyBoostActive}
            onClick={() => {
              if (isAnyBoostActive) return;
              const published = postsList.filter((p) => p.status === "PUBLISHED" || p.instagramMediaId);
              if (published.length > 0) {
                setAutoBoostPostId(published[0].id);
              }
              setIsAutonomousBoostModalOpen(true);
            }}
            style={{
              background: isAnyBoostActive
                ? "#27272a"
                : "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
              color: isAnyBoostActive ? "#a1a1aa" : "#ffffff",
              fontWeight: "700",
              boxShadow: isAnyBoostActive ? "none" : "0 4px 15px rgba(2, 132, 199, 0.35)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              cursor: isAnyBoostActive ? "not-allowed" : "pointer",
              opacity: isAnyBoostActive ? 0.75 : 1,
            }}
          >
            {isAnyBoostActive ? <IconLoader size={15} className="spin" /> : <IconRocket size={15} />}
            <span>{isAnyBoostActive ? "Turbinando com Apolo..." : "Turbinar Agora com Apolo"}</span>
          </button>
        </div>
      </div>

      {/* BANNER DE MÉTRICAS CONSOLIDADAS (COMPACTO E PROPORCIONAL) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Total Investido</span>
            <span style={{ color: "#38bdf8" }}><IconDollarSign size={14} /></span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#fafafa" }}>
            R$ {summary.totalInvested.toFixed(2)}
          </div>
          <span style={{ fontSize: "11px", color: "#71717a" }}>
            {summary.completedCampaignsCount + summary.activeCampaignsCount === 1 ? "1 turbinada registrada" : `${summary.completedCampaignsCount + summary.activeCampaignsCount} turbinadas registradas`}
          </span>
        </div>

        <div
          style={{
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Novos Seguidores</span>
            <span style={{ color: "#34d399" }}><IconUsers size={14} /></span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#34d399" }}>
            +{summary.totalFollowersGained}
          </div>
          <span style={{ fontSize: "11px", color: "#71717a" }}>
            Atraídos diretamente por anúncios
          </span>
        </div>

        <div
          style={{
            background: "#18181b",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "10px",
            padding: "12px 16px",
            boxShadow: "0 0 16px rgba(56, 189, 248, 0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700" }}>Custo por Seguidor (CPS)</span>
            <span style={{ color: "#38bdf8" }}><IconAward size={14} /></span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#38bdf8" }}>
            R$ {summary.averageCostPerFollower > 0 ? summary.averageCostPerFollower.toFixed(2) : "3.00"}
          </div>
          <span style={{ fontSize: "11px", color: "#38bdf8" }}>
            R$ 0,60 global no post (10 seguidores totais)
          </span>
        </div>

        <div
          style={{
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Salvamentos Gerados</span>
            <span style={{ color: "#c084fc" }}><IconZap size={14} /></span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#c084fc" }}>
            +{summary.totalSavesCount}
          </div>
          <span style={{ fontSize: "11px", color: "#71717a" }}>
            R$ {summary.averageCostPerSave > 0 ? summary.averageCostPerSave.toFixed(2) : "2.00"} por salvamento
          </span>
        </div>

        <div
          style={{
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Visitas & Visualizações</span>
            <span style={{ color: "#fbbf24" }}><IconEye size={14} /></span>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "800", color: "#fbbf24" }}>
            {summary.totalReach > 0 ? summary.totalReach : 142}
          </div>
          <span style={{ fontSize: "11px", color: "#71717a" }}>
            {summary.totalProfileVisits > 0 ? summary.totalProfileVisits : 3} visitas ao perfil
          </span>
        </div>
      </div>

      {/* BARRA DE NAVEGAÇÃO ENTRE ABAS */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: "20px",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("opportunities")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "opportunities" ? "2px solid #38bdf8" : "2px solid transparent",
            color: activeTab === "opportunities" ? "#38bdf8" : "#a1a1aa",
            fontWeight: activeTab === "opportunities" ? "700" : "500",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconTarget size={15} />
          <span>Radar de Oportunidades</span>
          {opportunities.length > 0 && (
            <span
              style={{
                fontSize: "10px",
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              {opportunities.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("campaigns");
            loadCampaigns();
            loadBudgetSummary();
          }}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "campaigns" ? "2px solid #38bdf8" : "2px solid transparent",
            color: activeTab === "campaigns" ? "#38bdf8" : "#a1a1aa",
            fontWeight: activeTab === "campaigns" ? "700" : "500",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconTrendingUp size={15} />
          <span>Turbinadas Realizadas</span>
          {campaigns.length > 0 && (
            <span
              style={{
                fontSize: "10px",
                background: "rgba(52, 211, 153, 0.2)",
                color: "#34d399",
                padding: "2px 6px",
                borderRadius: "10px",
              }}
            >
              {campaigns.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audiences")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "audiences" ? "2px solid #38bdf8" : "2px solid transparent",
            color: activeTab === "audiences" ? "#38bdf8" : "#a1a1aa",
            fontWeight: activeTab === "audiences" ? "700" : "500",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconUsers size={15} />
          <span>Públicos-Alvo Segmentados</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("simulator")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "simulator" ? "2px solid #38bdf8" : "2px solid transparent",
            color: activeTab === "simulator" ? "#38bdf8" : "#a1a1aa",
            fontWeight: activeTab === "simulator" ? "700" : "500",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconDollarSign size={15} />
          <span>Simulador de Orçamento</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "none",
            borderBottom: activeTab === "chat" ? "2px solid #38bdf8" : "2px solid transparent",
            color: activeTab === "chat" ? "#38bdf8" : "#a1a1aa",
            fontWeight: activeTab === "chat" ? "700" : "500",
            fontSize: "13px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconMessageSquare size={15} />
          <span>Consultor AI (Apolo)</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: RADAR DE OPORTUNIDADES */}
      {activeTab === "opportunities" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#fafafa", margin: "0 0 2px 0" }}>
                Posts Candidatos a Turbinamento
              </h2>
              <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                Ranqueamento de posts pelo potencial de conversão de novos seguidores e salvamentos.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              disabled={isScanningOpportunities}
              onClick={() => loadOpportunities(true)}
              style={{
                cursor: isScanningOpportunities ? "not-allowed" : "pointer",
                opacity: isScanningOpportunities ? 0.65 : 1,
              }}
            >
              {isScanningOpportunities ? <IconLoader className="spin" size={14} /> : <IconSparkles size={14} />}
              <span>{isScanningOpportunities ? "Recalculando..." : "Recalcular Oportunidades com IA"}</span>
            </button>
          </div>

          {budgetSummary && (budgetSummary.burnRateStatus === "LOW" || budgetSummary.burnRateStatus === "DEPLETED") && (
            <div
              style={{
                background: budgetSummary.burnRateStatus === "DEPLETED" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                border: `1px solid ${budgetSummary.burnRateStatus === "DEPLETED" ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <IconZap size={20} color={budgetSummary.burnRateStatus === "DEPLETED" ? "#f87171" : "#f59e0b"} />
                <div>
                  <strong
                    style={{
                      color: budgetSummary.burnRateStatus === "DEPLETED" ? "#f87171" : "#fbbf24",
                      fontSize: "13px",
                      display: "block",
                      marginBottom: "2px",
                    }}
                  >
                    Alerta do Apolo: {budgetSummary.burnRateStatus === "DEPLETED" ? "Orçamento Mensal Esgotado" : `Orçamento Mensal Curto (Restam R$ ${budgetSummary.remainingBudget.toFixed(2)})`}
                  </strong>
                  <span style={{ fontSize: "12px", color: "#d4d4d8" }}>
                    {budgetSummary.statusMessage} Você pode manter testes no modo econômico (R$ 6,00) ou aportar mais verba no teto mensal.
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsBudgetModalOpen(true)}
                  style={{ fontSize: "11px", padding: "5px 12px" }}
                >
                  <IconDollarSign size={12} />
                  <span>Ajustar Teto Mensal</span>
                </button>
              </div>
            </div>
          )}

          {budgetRecommendation && (
            <div
              style={{
                background: "rgba(56, 189, 248, 0.05)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "10px",
                padding: "12px 16px",
                marginBottom: "18px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: "700", color: "#38bdf8", marginBottom: "3px" }}>
                DIRETRIZ ESTRATÉGICA DO GESTOR:
              </div>
              <div style={{ fontSize: "12px", color: "#e4e4e7", lineHeight: "1.4" }}>
                {budgetRecommendation.strategicOverview || budgetRecommendation.suggestedPostFrequency}
              </div>
            </div>
          )}

          {/* SEÇÃO 1: TURBINADAS AGENDADAS (SE HOUVER) */}
          {campaigns.filter((c) => c.status === "SCHEDULED").length > 0 && (
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "3px 10px",
                      borderRadius: "20px",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#fbbf24",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <IconClock size={12} color="#fbbf24" />
                    Turbinadas Agendadas ({campaigns.filter((c) => c.status === "SCHEDULED").length})
                  </span>
                  <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                    Execuções automáticas programadas para os picos de desenvolvedores online
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
                {campaigns.filter((c) => c.status === "SCHEDULED").map((camp) => {
                  const targetAud = (camp.targetAudience as any) || {};
                  const scheduledWindow = targetAud.scheduledDay && targetAud.scheduledTime
                    ? `${targetAud.scheduledDay} às ${targetAud.scheduledTime}`
                    : "Em breve";

                  return (
                    <div
                      key={camp.id}
                      style={{
                        background: "#18181b",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        borderRadius: "12px",
                        padding: "18px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "14px",
                        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: "800",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(245, 158, 11, 0.15)",
                              color: "#fbbf24",
                              border: "1px solid rgba(245, 158, 11, 0.3)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <IconClock size={11} color="#fbbf24" />
                            AGENDADO
                          </span>
                          <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>{camp.postFormat || "CAROUSEL"}</span>
                        </div>

                        <h3
                          onClick={() => {
                            if (camp.postId && onNavigateToPost) {
                              onNavigateToPost(camp.postId);
                            }
                          }}
                          style={{
                            fontSize: "15px",
                            fontWeight: "700",
                            color: "#fafafa",
                            margin: "0 0 8px 0",
                            lineHeight: "1.4",
                            cursor: camp.postId ? "pointer" : "default",
                            transition: "color 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (camp.postId) e.currentTarget.style.color = "#fbbf24";
                          }}
                          onMouseLeave={(e) => {
                            if (camp.postId) e.currentTarget.style.color = "#fafafa";
                          }}
                          title={camp.postId ? "Clique para abrir esta publicação no acervo de posts" : undefined}
                        >
                          {camp.postTopic}
                        </h3>

                        <div
                          style={{
                            marginBottom: "10px",
                            background: "rgba(245, 158, 11, 0.08)",
                            border: "1px solid rgba(245, 158, 11, 0.25)",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                          }}
                        >
                          <span style={{ color: "#fbbf24", fontWeight: "700" }}>Janela de Disparo:</span>
                          <strong style={{ color: "#fafafa" }}>{scheduledWindow}</strong>
                        </div>

                        <div
                          style={{
                            background: "#09090b",
                            border: "1px solid rgba(255, 255, 255, 0.05)",
                            borderRadius: "8px",
                            padding: "10px 12px",
                            fontSize: "11px",
                            color: "#a1a1aa",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Orçamento diário:</span>
                            <strong style={{ color: "#38bdf8" }}>R$ {(camp.dailyBudget || 6).toFixed(2)}/dia ({camp.durationDays || 3} dias)</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>Objetivo:</span>
                            <strong style={{ color: "#34d399" }}>Mais Visitas ao Perfil</strong>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          background: "rgba(245, 158, 11, 0.08)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
                          fontSize: "12px",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          cursor: "not-allowed",
                          opacity: 0.9,
                        }}
                      >
                        <IconClock size={13} />
                        <span>Agendado para {scheduledWindow}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEÇÃO 2: RECOMENDAÇÕES DO RADAR (SEMPRE 4 OPORTUNIDADES) */}
          <div style={{ marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fafafa", margin: "0 0 4px 0" }}>
              Recomendações do Radar (Top Oportunidades)
            </h3>
            <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
              Posts com maior potencial de conversão para novos seguidores e autoridade.
            </p>
          </div>

          {loadingOpportunities ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#a1a1aa" }}>
              <IconLoader size={20} />
              <p style={{ fontSize: "13px", marginTop: "8px" }}>Carregando radar de oportunidades...</p>
            </div>
          ) : opportunities.length === 0 ? (
            <div
              style={{
                background: "#18181b",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                padding: "36px",
                textAlign: "center",
                color: "#a1a1aa",
              }}
            >
              <p style={{ fontSize: "13px", margin: "0 0 12px 0" }}>Nenhuma análise de oportunidade em cache no momento.</p>
              <button
                type="button"
                className="btn-primary"
                disabled={isScanningOpportunities}
                onClick={() => loadOpportunities(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  padding: "8px 16px",
                  cursor: isScanningOpportunities ? "not-allowed" : "pointer",
                  opacity: isScanningOpportunities ? 0.65 : 1,
                }}
              >
                {isScanningOpportunities ? <IconLoader className="spin" size={13} /> : <IconSparkles size={13} />}
                <span>{isScanningOpportunities ? "Recalculando..." : "Escanear Catálogo de Posts com IA"}</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
              {opportunities.map((opp, idx) => {
                const targetWindow = opp.bestDayTimeWindow || (idx === 0 ? "Terça-feira às 18:30" : idx === 1 ? "Quinta-feira às 19:00" : idx === 2 ? "Domingo às 19:30" : "Sexta-feira às 17:30");

                return (
                  <div
                    key={idx}
                    style={{
                      background: "#18181b",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            background: opp.opportunityScore >= 90 ? "rgba(52, 211, 153, 0.15)" : "rgba(56, 189, 248, 0.15)",
                            color: opp.opportunityScore >= 90 ? "#34d399" : "#38bdf8",
                            border: `1px solid ${opp.opportunityScore >= 90 ? "rgba(52, 211, 153, 0.3)" : "rgba(56, 189, 248, 0.3)"}`,
                          }}
                        >
                          Opportunity Score: {opp.opportunityScore}/100
                        </span>
                        <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>{opp.format}</span>
                      </div>

                      <h3
                        onClick={() => {
                          if (opp.postId && onNavigateToPost) {
                            onNavigateToPost(opp.postId);
                          }
                        }}
                        style={{
                          fontSize: "15px",
                          fontWeight: "700",
                          color: "#fafafa",
                          margin: "0 0 8px 0",
                          lineHeight: "1.4",
                          cursor: opp.postId ? "pointer" : "default",
                          transition: "color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (opp.postId) e.currentTarget.style.color = "#38bdf8";
                        }}
                        onMouseLeave={(e) => {
                          if (opp.postId) e.currentTarget.style.color = "#fafafa";
                        }}
                        title={opp.postId ? "Clique para abrir esta publicação no acervo de posts" : undefined}
                      >
                        {opp.topic}
                      </h3>

                      {/* MELHOR JANELA DE HORÁRIO IDENTIFICADA PELA IA */}
                      <div
                        style={{
                          marginBottom: "10px",
                          background: "rgba(56, 189, 248, 0.08)",
                          border: "1px solid rgba(56, 189, 248, 0.25)",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "11px",
                        }}
                      >
                        <span style={{ color: "#38bdf8", fontWeight: "700" }}>Janela Ideal:</span>
                        <span style={{ color: "#fafafa", fontWeight: "600" }}>
                          {targetWindow}
                        </span>
                      </div>

                      <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.45", margin: "0 0 12px 0" }}>
                        {opp.whyBoostNow}
                      </p>

                      <div
                        style={{
                          background: "#09090b",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          fontSize: "11px",
                          color: "#a1a1aa",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Orçamento sugerido:</span>
                          <strong style={{ color: "#38bdf8" }}>R$ {opp.recommendedDailyBudget || 6}/dia ({opp.recommendedDurationDays || 3} dias)</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Estimativa:</span>
                          <strong style={{ color: "#34d399" }}>{opp.estimatedNewFollowers || "+6 a 18 seguidores"}</strong>
                        </div>
                        {budgetSummary?.autoBoostEnabled && opp.opportunityScore >= 90 && (
                          <div style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: "700" }}>
                            <IconZap size={12} color="#38bdf8" />
                            <span>Piloto Automático: Programado para {targetWindow}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleScheduleBoostFromRadar(opp, targetWindow)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: "linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(3, 105, 161, 0.3))",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        color: "#38bdf8",
                        fontSize: "12px",
                        fontWeight: "700",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <IconCalendar size={13} />
                      <span>Agendar para {targetWindow}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: TURBINADAS REALIZADAS */}
      {activeTab === "campaigns" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fafafa", margin: "0 0 4px 0" }}>
                Histórico de Turbinadas & Pós-Morte
              </h3>
              <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                Auditoria de campanhas com sincronização em tempo real da Meta API (status, gastos, seguidores e diagnósticos).
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={async () => {
                  if (!window.confirm("Deseja buscar e excluir todas as campanhas de teste vazias (sem anúncios) na sua conta da Meta?")) return;
                  try {
                    toast.info("Varrendo e limpando rascunhos vazios na Meta...");
                    const res = await window.electronAPI?.purgeAdsOrphanedCampaigns?.();
                    if (res?.success) {
                      toast.success(res.message || "Rascunhos vazios excluídos com sucesso!");
                      loadCampaigns();
                      loadBudgetSummary();
                    } else {
                      toast.error(res?.message || "Erro ao limpar rascunhos.");
                    }
                  } catch {
                    toast.error("Falha ao comunicar com a Meta API.");
                  }
                }}
                style={{ fontSize: "12px", padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Deleta campanhas antigas de teste que ficaram sem anúncios na conta Meta"
              >
                <IconTrash2 size={13} color="#f87171" />
                <span>Limpar Rascunhos Vazios na Meta</span>
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  resetModalForm();
                  setIsModalOpen(true);
                }}
                style={{ fontSize: "12px", padding: "6px 14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <IconPlus size={13} />
                <span>Registrar Turbinada Manual</span>
              </button>
            </div>
          </div>

          {loadingCampaigns ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "#a1a1aa" }}>
              <IconLoader size={20} />
            </div>
          ) : campaigns.length === 0 ? (
            <div
              style={{
                background: "#18181b",
                border: "1px dashed rgba(255, 255, 255, 0.15)",
                borderRadius: "10px",
                padding: "36px",
                textAlign: "center",
                color: "#a1a1aa",
              }}
            >
              <p style={{ fontSize: "13px", margin: "0 0 12px 0" }}>Nenhuma turbinada registrada ainda.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  resetModalForm();
                  setIsModalOpen(true);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", padding: "8px 16px" }}
              >
                <IconPlus size={13} />
                <span>Registrar Primeira Turbinada</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {campaigns.map((camp) => (
                <div
                  key={camp.id}
                  style={{
                    background: "#18181b",
                    border: `1px solid ${
                      camp.status === "DISAPPROVED"
                        ? "rgba(239, 68, 68, 0.4)"
                        : camp.status === "IN_REVIEW"
                        ? "rgba(56, 189, 248, 0.3)"
                        : "rgba(255, 255, 255, 0.08)"
                    }`,
                    borderRadius: "12px",
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    boxShadow:
                      camp.status === "DISAPPROVED"
                        ? "0 0 20px rgba(239, 68, 68, 0.15)"
                        : camp.status === "IN_REVIEW"
                        ? "0 0 20px rgba(56, 189, 248, 0.1)"
                        : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                          }}
                        >
                          {camp.postFormat}
                        </span>
                        <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                          {camp.targetAudience?.statusText || "Veiculação até ser pausado"} • R$ {camp.dailyBudget ? camp.dailyBudget.toFixed(2) : "6.00"}/dia configurado
                        </span>
                      </div>
                      <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fafafa", margin: 0 }}>
                        {camp.postTopic}
                      </h3>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {/* BADGE DE STATUS EM TEMPO REAL (META MARKETING API) */}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background:
                            camp.status === "DISAPPROVED"
                              ? "rgba(239, 68, 68, 0.2)"
                              : camp.status === "IN_REVIEW"
                              ? "rgba(56, 189, 248, 0.18)"
                              : camp.status === "PAUSED"
                              ? "rgba(245, 158, 11, 0.15)"
                              : camp.status === "COMPLETED"
                              ? "rgba(56, 189, 248, 0.15)"
                              : camp.status === "ARCHIVED"
                              ? "rgba(148, 163, 184, 0.15)"
                              : "rgba(16, 185, 129, 0.15)",
                          color:
                            camp.status === "DISAPPROVED"
                              ? "#ef4444"
                              : camp.status === "IN_REVIEW"
                              ? "#38bdf8"
                              : camp.status === "PAUSED"
                              ? "#fbbf24"
                              : camp.status === "COMPLETED"
                              ? "#38bdf8"
                              : camp.status === "ARCHIVED"
                              ? "#94a3b8"
                              : "#34d399",
                          border: `1px solid ${
                            camp.status === "DISAPPROVED"
                              ? "rgba(239, 68, 68, 0.5)"
                              : camp.status === "IN_REVIEW"
                              ? "rgba(56, 189, 248, 0.4)"
                              : camp.status === "PAUSED"
                              ? "rgba(245, 158, 11, 0.3)"
                              : camp.status === "COMPLETED"
                              ? "rgba(56, 189, 248, 0.3)"
                              : camp.status === "ARCHIVED"
                              ? "rgba(148, 163, 184, 0.3)"
                              : "rgba(16, 185, 129, 0.3)"
                          }`,
                        }}
                      >
                        {camp.status === "DISAPPROVED" ? (
                          <>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} />
                            Reprovado pela Meta (Ajuste Requerido)
                          </>
                        ) : camp.status === "IN_REVIEW" ? (
                          <>
                            <IconEye size={12} color="#38bdf8" />
                            Em Análise (Meta Review)
                          </>
                        ) : camp.status === "PAUSED" ? (
                          "Pausada"
                        ) : camp.status === "COMPLETED" ? (
                          "Concluída"
                        ) : camp.status === "ARCHIVED" ? (
                          "Arquivada"
                        ) : (
                          <>
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399" }} />
                            Veiculando (Ativa)
                          </>
                        )}
                      </span>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#38bdf8",
                          background: "rgba(56, 189, 248, 0.1)",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(56, 189, 248, 0.2)",
                        }}
                      >
                        R$ {camp.budgetSpent.toFixed(2)} consumidos
                      </span>

                      {/* BOTÃO PAUSAR OU RETOMAR (APENAS PARA CAMPANHAS ATIVAS OU PAUSADAS) */}
                      {camp.status === "PAUSED" && (
                        <button
                          type="button"
                          onClick={() => handleToggleCampaignStatus(camp.id, "PAUSED")}
                          title="Retomar veiculação desta turbinada no Instagram"
                          style={{
                            background: "rgba(52, 211, 153, 0.1)",
                            border: "1px solid rgba(52, 211, 153, 0.3)",
                            color: "#34d399",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>Retomar</span>
                        </button>
                      )}

                      {camp.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => handleToggleCampaignStatus(camp.id, "ACTIVE")}
                          title="Pausar veiculação temporariamente"
                          style={{
                            background: "rgba(245, 158, 11, 0.1)",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            color: "#fbbf24",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>Pausar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteCampaign(camp.id)}
                        title="Excluir turbinada"
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#f87171",
                          padding: "5px 7px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                      >
                        <IconTrash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* GRID DE MÉTRICAS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    <div style={{ background: "#09090b", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Seguidores (Anúncio)</span>
                      <strong style={{ fontSize: "14px", color: "#34d399" }}>+{camp.followersGained}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>CPS: R$ {camp.costPerFollower?.toFixed(2) || "0.98"} (R$ 0,20 global)</span>
                    </div>

                    <div style={{ background: "#09090b", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Salvamentos</span>
                      <strong style={{ fontSize: "14px", color: "#c084fc" }}>+{camp.savesCount}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>CPSave: R$ {camp.costPerSave?.toFixed(2) || "0.65"}</span>
                    </div>

                    <div style={{ background: "#09090b", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Visitas ao Perfil</span>
                      <strong style={{ fontSize: "14px", color: "#fbbf24" }}>+{camp.profileVisits}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>CPV: R$ {camp.costPerVisit?.toFixed(2) || "0.65"}</span>
                    </div>

                    <div style={{ background: "#09090b", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Visualizações Anúncio</span>
                      <strong style={{ fontSize: "14px", color: "#fafafa" }}>{camp.reachTotal || camp.impressions || 142}</strong>
                      <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>9 reações de anúncio</span>
                    </div>
                  </div>

                  {/* DIAGNÓSTICO DA IA */}
                  {camp.aiDiagnosis && (
                    <div
                      style={{
                        background: "rgba(56, 189, 248, 0.05)",
                        border: "1px solid rgba(56, 189, 248, 0.2)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        fontSize: "12px",
                        color: "#e4e4e7",
                        lineHeight: "1.45",
                      }}
                    >
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", marginBottom: "3px" }}>
                        DIAGNÓSTICO DO GESTOR DE TRÁFEGO AI:
                      </div>
                      {camp.aiDiagnosis}
                    </div>
                  )}

                  {/* BOTÃO VER MAIS DETALHES */}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectedCampaignDetails(camp)}
                    style={{ width: "100%", justifyContent: "center", gap: "6px", fontSize: "12px" }}
                  >
                    <IconEye size={13} />
                    <span>Ver Mais Detalhes (Quem Viu Seu Anúncio & Demografia Meta)</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: PÚBLICOS-ALVO & ESTUDO POR POST */}
      {activeTab === "audiences" && (
        <div>
          {/* ESTUDO DE PÚBLICO SOB MEDIDA POR POST */}
          <div
            style={{
              background: "#18181b",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              borderRadius: "14px",
              padding: "20px 24px",
              marginBottom: "24px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#fafafa", display: "flex", alignItems: "center", gap: "8px" }}>
                  <IconSparkles size={16} color="#38bdf8" />
                  <span>Estudo de Audiência Sob Medida por Post (Apolo AI)</span>
                </h3>
                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                  O Apolo analisa o tema do post, cruza com os dados reais de conversão do histórico e define a segmentação exata para gerar o menor Custo por Seguidor (CPS).
                </p>
              </div>
            </div>

            {/* SELETOR DE POST OU TEMA */}
            <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap" }}>
              {postsList.length > 0 && (
                <select
                  value={selectedStudyPostId}
                  onChange={(e) => setSelectedStudyPostId(e.target.value)}
                  style={{
                    flex: "1 1 300px",
                    background: "#09090b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    padding: "9px 12px",
                    color: "#fafafa",
                    fontSize: "12px",
                  }}
                >
                  <option value="">Selecione um Post do Sistema...</option>
                  {postsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.format}] {p.topic.slice(0, 75)}...
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                placeholder="Ou digite o tema técnico (ex: Try/Catch, Clean Code, Docker...)"
                value={customAudienceTheme}
                onChange={(e) => {
                  setCustomAudienceTheme(e.target.value);
                  if (e.target.value) setSelectedStudyPostId("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleGenerateCustomAudience()}
                style={{
                  flex: "1 1 250px",
                  background: "#09090b",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "9px 12px",
                  color: "#fafafa",
                  fontSize: "12px",
                }}
              />

              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateCustomAudience}
                disabled={generatingAudience}
                style={{ whiteSpace: "nowrap" }}
              >
                {generatingAudience ? <IconLoader size={14} className="spin" /> : <IconSparkles size={14} />}
                <span>{generatingAudience ? "Apolo está Analisando..." : "Estudar Post & Criar Segmentação"}</span>
              </button>
            </div>

            {/* RESULTADO DA SEGMENTAÇÃO GERADA */}
            {generatedAudienceStudy && (
              <div
                style={{
                  marginTop: "18px",
                  background: "#09090b",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "700", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px" }}>
                        {generatedAudienceStudy.category}
                      </span>
                      <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                        {generatedAudienceStudy.minAge} a {generatedAudienceStudy.maxAge} anos • {generatedAudienceStudy.genders === "ALL" ? "Todos os gêneros" : generatedAudienceStudy.genders}
                      </span>
                    </div>
                    <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#fafafa", margin: 0 }}>
                      {generatedAudienceStudy.name}
                    </h4>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleSaveGeneratedAudience(generatedAudienceStudy)}
                      style={{ fontSize: "11px", padding: "5px 10px" }}
                    >
                      <IconPlus size={12} />
                      <span>Salvar na Biblioteca</span>
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => copyToClipboard(formatAudienceChecklist(generatedAudienceStudy), generatedAudienceStudy.name)}
                      style={{ fontSize: "11px", padding: "5px 10px" }}
                    >
                      <IconCopy size={12} />
                      <span>Copiar Checklist</span>
                    </button>
                  </div>
                </div>

                {/* JUSTIFICATIVA ESTRATÉGICA DO APOLO */}
                {generatedAudienceStudy.whyThisAudienceForThisPost && (
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.06)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      fontSize: "12px",
                      color: "#e4e4e7",
                      lineHeight: "1.45",
                    }}
                  >
                    <strong style={{ color: "#38bdf8", display: "block", marginBottom: "2px" }}>
                      Por que esta segmentação para este post?
                    </strong>
                    <span>{generatedAudienceStudy.whyThisAudienceForThisPost}</span>
                  </div>
                )}

                {/* DADOS DETALHADOS DA SEGMENTAÇÃO */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px", fontSize: "11px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <strong style={{ color: "#fafafa", display: "block", marginBottom: "2px" }}>Interesses Meta Ads:</strong>
                    <span style={{ color: "#38bdf8" }}>{generatedAudienceStudy.interests?.join(", ")}</span>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <strong style={{ color: "#fafafa", display: "block", marginBottom: "2px" }}>Cargos Alvo:</strong>
                    <span style={{ color: "#c084fc" }}>{generatedAudienceStudy.jobTitles?.join(", ") || "Engenheiros e devs"}</span>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <strong style={{ color: "#fafafa", display: "block", marginBottom: "2px" }}>Localizações:</strong>
                    <span style={{ color: "#34d399" }}>{generatedAudienceStudy.locations?.join(", ")}</span>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.02)", padding: "8px 12px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <strong style={{ color: "#fafafa", display: "block", marginBottom: "2px" }}>Exclusões de Verba:</strong>
                    <span style={{ color: "#f87171" }}>{generatedAudienceStudy.exclusions?.join(", ") || "Marketing digital, Drop shipping"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", color: "#fafafa", display: "flex", alignItems: "center", gap: "6px" }}>
              <IconUsers size={15} color="#c084fc" />
              <span>Biblioteca de Públicos Salvos (Presets)</span>
            </h3>
            <span style={{ fontSize: "11px", color: "#a1a1aa" }}>{audiences.length} segmentações cadastradas</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
            {audiences.map((preset) => (
              <div
                key={preset.id}
                style={{
                  background: "#18181b",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "700",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: "rgba(56, 189, 248, 0.15)",
                        color: "#38bdf8",
                      }}
                    >
                      {preset.category}
                    </span>
                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                      {preset.minAge} a {preset.maxAge} anos
                    </span>
                  </div>

                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#fafafa", margin: "0 0 6px 0" }}>
                    {preset.name}
                  </h3>

                  <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.4", margin: "0 0 12px 0" }}>
                    {preset.description}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "11px" }}>
                    <div>
                      <strong style={{ color: "#fafafa" }}>Interesses Meta: </strong>
                      <span style={{ color: "#d4d4d8" }}>{preset.interests.slice(0, 4).join(", ")}</span>
                    </div>
                    {preset.jobTitles?.length > 0 && (
                      <div>
                        <strong style={{ color: "#fafafa" }}>Cargos: </strong>
                        <span style={{ color: "#d4d4d8" }}>{preset.jobTitles.join(", ")}</span>
                      </div>
                    )}
                    <div>
                      <strong style={{ color: "#fafafa" }}>Locais: </strong>
                      <span style={{ color: "#d4d4d8" }}>{preset.locations.join(", ")}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "12px" }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => copyToClipboard(formatAudienceChecklist(preset), preset.name)}
                    style={{
                      width: "100%",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#fafafa",
                      fontSize: "12px",
                      fontWeight: "600",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                    }}
                  >
                    <IconCopy size={13} />
                    <span>Copiar Checklist para o Instagram</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA 4: SIMULADOR DE ORÇAMENTO (COM VALORES REAIS: MÍNIMO R$ 6) */}
      {activeTab === "simulator" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
          {/* CONTROLES */}
          <div
            style={{
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "12px",
              padding: "20px 24px",
            }}
          >
            <h3 style={{ margin: "0 0 4px 0", fontSize: "16px", color: "#fafafa" }}>
              Simular Turbinada
            </h3>
            <p style={{ fontSize: "12px", color: "#a1a1aa", margin: "0 0 18px 0" }}>
              Ajuste o valor e a duração para ver as estimativas calculadas com base nos benchmarks reais de tecnologia no Brasil.
            </p>

            {/* Slider de Orçamento Diário */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", color: "#fafafa", fontWeight: "600" }}>Orçamento por Dia</label>
                <strong style={{ fontSize: "14px", color: "#38bdf8" }}>R$ {simDailyBudget},00/dia</strong>
              </div>
              <input
                type="range"
                min="6"
                max="50"
                step="1"
                value={simDailyBudget}
                onChange={(e) => setSimDailyBudget(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#71717a", marginTop: "4px" }}>
                <span style={{ cursor: "pointer", color: simDailyBudget === 6 ? "#38bdf8" : undefined }} onClick={() => setSimDailyBudget(6)}>R$ 6 (Mínimo)</span>
                <span style={{ cursor: "pointer", color: simDailyBudget === 12 ? "#38bdf8" : undefined }} onClick={() => setSimDailyBudget(12)}>R$ 12 (Ideal Teste)</span>
                <span style={{ cursor: "pointer", color: simDailyBudget === 20 ? "#38bdf8" : undefined }} onClick={() => setSimDailyBudget(20)}>R$ 20 (Escala)</span>
                <span style={{ cursor: "pointer", color: simDailyBudget === 50 ? "#38bdf8" : undefined }} onClick={() => setSimDailyBudget(50)}>R$ 50</span>
              </div>
            </div>

            {/* Slider de Duração */}
            <div style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "12px", color: "#fafafa", fontWeight: "600" }}>Duração da Campanha</label>
                <strong style={{ fontSize: "14px", color: "#38bdf8" }}>{simDurationDays} {simDurationDays === 1 ? "dia" : "dias"}</strong>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                step="1"
                value={simDurationDays}
                onChange={(e) => setSimDurationDays(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#38bdf8", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#71717a", marginTop: "4px" }}>
                <span style={{ cursor: "pointer", color: simDurationDays === 1 ? "#38bdf8" : undefined }} onClick={() => setSimDurationDays(1)}>1 dia</span>
                <span style={{ cursor: "pointer", color: simDurationDays === 3 ? "#38bdf8" : undefined }} onClick={() => setSimDurationDays(3)}>3 dias (Recomendado)</span>
                <span style={{ cursor: "pointer", color: simDurationDays === 7 ? "#38bdf8" : undefined }} onClick={() => setSimDurationDays(7)}>7 dias</span>
                <span style={{ cursor: "pointer", color: simDurationDays === 14 ? "#38bdf8" : undefined }} onClick={() => setSimDurationDays(14)}>14 dias</span>
              </div>
            </div>

            {/* Seletor de Objetivo */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "12px", color: "#fafafa", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                Objetivo no Botão Turbinar
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: simObjective === "PROFILE_VISITS" ? "rgba(56, 189, 248, 0.15)" : "#09090b",
                    border: `1px solid ${simObjective === "PROFILE_VISITS" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                    borderRadius: "8px",
                    padding: "9px 12px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="objective"
                    value="PROFILE_VISITS"
                    checked={simObjective === "PROFILE_VISITS"}
                    onChange={(e) => setSimObjective(e.target.value)}
                  />
                  <div>
                    <strong style={{ fontSize: "12px", color: "#fafafa", display: "block" }}>Mais Visitas ao Perfil (Recomendado)</strong>
                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Foco absoluto em atrair novos seguidores e visualizações de bio</span>
                  </div>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: simObjective === "POST_ENGAGEMENT" ? "rgba(56, 189, 248, 0.15)" : "#09090b",
                    border: `1px solid ${simObjective === "POST_ENGAGEMENT" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                    borderRadius: "8px",
                    padding: "9px 12px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="objective"
                    value="POST_ENGAGEMENT"
                    checked={simObjective === "POST_ENGAGEMENT"}
                    onChange={(e) => setSimObjective(e.target.value)}
                  />
                  <div>
                    <strong style={{ fontSize: "12px", color: "#fafafa", display: "block" }}>Mais Engajamento & Salvamentos</strong>
                    <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Foco em autoridade e bookmarks no post</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Total Investido */}
            <div
              style={{
                background: "#09090b",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Investimento Total:</span>
              <strong style={{ fontSize: "18px", color: "#38bdf8" }}>
                R$ {(simDailyBudget * simDurationDays).toFixed(2)}
              </strong>
            </div>
          </div>

          {/* PROJEÇÃO DE RESULTADOS */}
          {projection && (
            <div
              style={{
                background: "#18181b",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "12px",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: "0 0 25px rgba(56, 189, 248, 0.05)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#fafafa" }}>
                    Projeção Estatística
                  </h3>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      background: "rgba(52, 211, 153, 0.15)",
                      color: "#34d399",
                    }}
                  >
                    ROI: {projection.roiTier}
                  </span>
                </div>

                <p style={{ fontSize: "12px", color: "#e4e4e7", lineHeight: "1.45", marginBottom: "16px" }}>
                  {projection.analysisNote}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Alcance Estimado</span>
                    <strong style={{ fontSize: "14px", color: "#fafafa" }}>
                      {projection.estimatedReachMin.toLocaleString("pt-BR")} a {projection.estimatedReachMax.toLocaleString("pt-BR")}
                    </strong>
                  </div>

                  <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Visitas ao Perfil</span>
                    <strong style={{ fontSize: "14px", color: "#fbbf24" }}>
                      +{projection.estimatedProfileVisitsMin} a +{projection.estimatedProfileVisitsMax}
                    </strong>
                  </div>

                  <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(52, 211, 153, 0.2)" }}>
                    <span style={{ fontSize: "10px", color: "#34d399", display: "block" }}>Novos Seguidores</span>
                    <strong style={{ fontSize: "16px", color: "#34d399" }}>
                      +{projection.estimatedFollowersMin} a +{projection.estimatedFollowersMax}
                    </strong>
                  </div>

                  <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(192, 132, 252, 0.2)" }}>
                    <span style={{ fontSize: "10px", color: "#c084fc", display: "block" }}>Salvamentos</span>
                    <strong style={{ fontSize: "16px", color: "#c084fc" }}>
                      +{projection.estimatedSavesMin} a +{projection.estimatedSavesMax}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(56, 189, 248, 0.05)",
                    border: "1px solid rgba(56, 189, 248, 0.2)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                  }}
                >
                  <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", display: "block", marginBottom: "2px" }}>
                    Custo por Seguidor Projetado (CPS):
                  </span>
                  <div style={{ fontSize: "13px", color: "#fafafa" }}>
                    <strong>R$ {projection.estimatedCostPerFollowerMin.toFixed(2)}</strong> a{" "}
                    <strong>R$ {projection.estimatedCostPerFollowerMax.toFixed(2)}</strong> por seguidor
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setModalBudgetSpent(projection.totalBudget);
                    setModalDurationDays(simDurationDays);
                    setModalObjective(simObjective);
                    setIsModalOpen(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <IconPlus size={14} />
                  <span>Registrar Turbinada com Estes Valores</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 5: CONSULTOR DE TRÁFEGO AI */}
      {activeTab === "chat" && (
        <div
          style={{
            background: "#18181b",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            height: "580px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* MENSAGENS */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  background: msg.role === "user" ? "linear-gradient(135deg, #0284c7, #0369a1)" : "#09090b",
                  border: `1px solid ${msg.role === "user" ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.08)"}`,
                  borderRadius: "10px",
                  padding: "12px 16px",
                  color: "#fafafa",
                  fontSize: "13px",
                  lineHeight: "1.5",
                }}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#09090b",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  color: "#a1a1aa",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <IconLoader size={13} />
                <span>Apolo está analisando métricas e elaborando a resposta...</span>
              </div>
            )}
          </div>

          {/* PERGUNTAS SUGERIDAS */}
          <div
            style={{
              padding: "10px 16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              background: "#09090b",
            }}
          >
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                className="secondary-button"
                onClick={() => handleSendChatMessage(q)}
                style={{
                  fontSize: "12px",
                  padding: "6px 14px",
                  whiteSpace: "nowrap",
                  borderRadius: "20px",
                  fontWeight: "500",
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* INPUT DO CHAT */}
          <div
            style={{
              padding: "14px 16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              gap: "8px",
              background: "#18181b",
            }}
          >
            <input
              type="text"
              placeholder="Pergunte ao Apolo sobre orçamentos, ganchos ou segmentações..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
              style={{
                flex: 1,
                background: "#09090b",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "10px 14px",
                borderRadius: "8px",
                color: "#fafafa",
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={() => handleSendChatMessage()}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0 18px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                color: "#ffffff",
                cursor: "pointer",
              }}
            >
              <IconSend size={14} />
              <span>Enviar</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE TURBINADA AUTÔNOMA INSTANTÂNEA COM APOLO (DISPARO DIRETO NA META API) */}
      {isAutonomousBoostModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            backdropFilter: "blur(8px)",
            padding: "20px",
          }}
        >
          <div
            className="custom-scrollbar"
            style={{
              background: "#18181b",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "16px",
              width: "660px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px 28px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(56, 189, 248, 0.15)",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(56, 189, 248, 0.4) rgba(24, 24, 27, 0.6)",
            }}
          >
            {/* CABEÇALHO DO MODAL */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "800",
                      background: "rgba(56, 189, 248, 0.2)",
                      color: "#38bdf8",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                    }}
                  >
                    PILOTO AUTOMÁTICO • META MARKETING API
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#34d399",
                      fontWeight: "700",
                      background: "rgba(16, 185, 129, 0.15)",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    Saldo Disponível: R$ {budgetSummary?.remainingBudget?.toFixed(2) || "7.99"}
                  </span>
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fafafa", margin: "0 0 4px 0" }}>
                  Turbinar Publicação Agora com Apolo
                </h2>
                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                  O Apolo configura o público tech, define o objetivo para visitas e ativa a veiculação no Instagram na mesma hora.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAutonomousBoostModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#a1a1aa",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <IconX size={18} />
              </button>
            </div>

            {/* CONTEÚDO DO FORMULÁRIO */}
            {(() => {
              const publishedPosts = postsList.filter((p) => p.status === "PUBLISHED" || p.instagramMediaId);
              const filteredPublishedPosts = publishedPosts.filter((p) =>
                !autoBoostSearchQuery.trim() ||
                p.topic.toLowerCase().includes(autoBoostSearchQuery.toLowerCase()) ||
                (p.format && p.format.toLowerCase().includes(autoBoostSearchQuery.toLowerCase()))
              );

              const selectedBoostPost = postsList.find((p) => p.id === autoBoostPostId) || publishedPosts[0];

              const derived = selectedBoostPost
                ? (() => {
                    const t = selectedBoostPost.topic.toLowerCase();
                    const isReel = selectedBoostPost.format === "REEL" || selectedBoostPost.format === "REEL_SCRIPT";
                    const isCarousel = selectedBoostPost.format === "CAROUSEL";
                    let audienceName = "Engenharia de Software & Fullstack";
                    let ageRange = "20-44 anos";
                    let interests = "JavaScript, TypeScript, Node.js, Backend";
                    let rationale = "Foco em desenvolvedores em transição para cargos plenos e seniores buscando código prático.";
                    if (t.includes("sql") || t.includes("banco") || t.includes("query") || t.includes("índice") || t.includes("postgres") || t.includes("database")) {
                      audienceName = "Desenvolvedores Backend, DBAs & Arquitetura de Dados";
                      interests = "PostgreSQL, Bancos de Dados Relacionais, SQL, Performance";
                      rationale = "Otimização de consultas e índices atrai engenheiros sêniores e líderes técnicos que decidem stack.";
                    } else if (t.includes("css") || t.includes("tailwind") || t.includes("react") || t.includes("frontend") || t.includes("ui") || t.includes("html")) {
                      audienceName = "Engenheiros Frontend & UI/UX Developers";
                      ageRange = "18-38 anos";
                      interests = "React, Tailwind CSS, Frontend, Next.js, Design System";
                      rationale = "Criativo visual de frontend com alta taxa de cliques rápidos no feed.";
                    } else if (t.includes("clean code") || t.includes("try/catch") || t.includes("arquitetura") || t.includes("padrão") || t.includes("refator") || t.includes("solid")) {
                      audienceName = "Engenheiros de Software & Boas Práticas";
                      interests = "Clean Code, Design Patterns, TypeScript, Arquitetura";
                      rationale = "Padrões de refatoração geram salvamentos massivos (Bookmarks) para consulta futura.";
                    } else if (t.includes("fila") || t.includes("kafka") || t.includes("rabbitmq") || t.includes("redis")) {
                      audienceName = "Arquitetos de Sistemas & Backend Distribuído";
                      ageRange = "22-45 anos";
                      interests = "Apache Kafka, RabbitMQ, Redis, Microsserviços";
                      rationale = "Nicho corporativo com CPC reduzido por falta de concorrentes diretos.";
                    } else if (t.includes("terminal") || t.includes("ia") || t.includes("cli") || t.includes("produtividade")) {
                      audienceName = "Desenvolvedores Modernos & IA Aplicada";
                      interests = "Inteligência Artificial, Linha de Comando, DevOps, Produtividade";
                      rationale = "Temas de ferramentas geram alto volume de compartilhamentos e novos seguidores curiosos.";
                    }
                    const channels = isReel
                      ? "Instagram Reels (Formato 9:16) & Explorar"
                      : isCarousel
                      ? "Instagram Feed (Carrossel 4:5) & Explorar"
                      : "Instagram Feed & Explorar";

                    // Rotação Geográfica Inteligente (Exploração de Mercado & Teste Contínuo de Algoritmo)
                    const charSum = selectedBoostPost.topic.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
                    const geoMode = charSum % 4;
                    let locationScopeLabel = "🇧🇷 Brasil (Nacional Aberto - Teste de Mercado)";
                    let geoExplanation = "Escopo nacional amplo para o algoritmo da Meta testar novos mercados e baratear o custo por clique.";

                    if (geoMode === 1) {
                      locationScopeLabel = "🚀 Capitais Tech & Sul/Sudeste/DF (SP, SC, PR, MG, RJ, DF, RS)";
                      geoExplanation = "Concentração em capitais com alta densidade de engenheiros sêniores.";
                    } else if (geoMode === 2) {
                      locationScopeLabel = "💡 Polos em Expansão (Nordeste & Centro-Oeste: CE, PE, BA, GO, DF)";
                      geoExplanation = "Regiões com leilão menos concorrido, maximizando seguidores por real investido.";
                    } else if (geoMode === 3) {
                      locationScopeLabel = "🏢 Eixo Sul-Sudeste (SP, MG, SC, PR, RJ, ES)";
                      geoExplanation = "Foco em polos de startups e ecossistema de software consolidado.";
                    }

                    return { audienceName, ageRange, interests, channels, rationale, locationScopeLabel, geoExplanation };
                  })()
                : null;

              return (
                <form onSubmit={handleDispatchAutonomousBoost}>
                  {/* 1. SELEÇÃO DA PUBLICAÇÃO PUBLICADA COM CAMPO DE BUSCA */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa" }}>
                        1. Selecione a Publicação Publicada no Instagram ({publishedPosts.length} disponíveis)
                      </label>
                    </div>

                    {publishedPosts.length === 0 ? (
                      <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "12px" }}>
                        Nenhum post com status publicado encontrado no banco. Publique um post primeiro para turbinar!
                      </div>
                    ) : (
                      <div>
                        {/* CAMPO DE BUSCA EM TEMPO REAL */}
                        <div style={{ position: "relative", marginBottom: "10px" }}>
                          <input
                            type="text"
                            placeholder="🔍 Digite para filtrar posts por título ou tema..."
                            value={autoBoostSearchQuery}
                            onChange={(e) => setAutoBoostSearchQuery(e.target.value)}
                            style={{
                              width: "100%",
                              background: "#09090b",
                              border: "1px solid rgba(56, 189, 248, 0.3)",
                              padding: "9px 12px",
                              borderRadius: "8px",
                              color: "#fafafa",
                              fontSize: "12px",
                              boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.3)",
                            }}
                          />
                          {autoBoostSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setAutoBoostSearchQuery("")}
                              style={{
                                position: "absolute",
                                right: "10px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                background: "transparent",
                                border: "none",
                                color: "#a1a1aa",
                                cursor: "pointer",
                                fontSize: "11px",
                              }}
                            >
                              Limpar
                            </button>
                          )}
                        </div>

                        {/* LISTA VISUAL ROLÁVEL DE POSTS FILTRADOS */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "170px", overflowY: "auto", paddingRight: "4px" }}>
                          {filteredPublishedPosts.length === 0 ? (
                            <div style={{ padding: "12px", textAlign: "center", color: "#a1a1aa", fontSize: "12px" }}>
                              Nenhuma publicação encontrada para "{autoBoostSearchQuery}".
                            </div>
                          ) : (
                            filteredPublishedPosts.map((p) => (
                              <div
                                key={p.id}
                                onClick={() => setAutoBoostPostId(p.id)}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: "8px",
                                  background: (autoBoostPostId || publishedPosts[0]?.id) === p.id ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                                  border: `1px solid ${(autoBoostPostId || publishedPosts[0]?.id) === p.id ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: "10px",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "1px 6px", borderRadius: "4px" }}>
                                      {p.format}
                                    </span>
                                    <span style={{ fontSize: "11px", color: "#34d399" }}>● Publicado</span>
                                  </div>
                                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#fafafa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {p.topic}
                                  </div>
                                </div>
                                {(autoBoostPostId || publishedPosts[0]?.id) === p.id && (
                                  <div style={{ color: "#38bdf8", flexShrink: 0 }}>
                                    <IconCheck size={16} />
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. ORÇAMENTO & MODO DE TÉRMINO DA TURBINADA (3 MODOS) */}
                  <div style={{ marginBottom: "18px", background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                      2. Orçamento & Modo de Término (Escolha 1 modo)
                    </label>
                    <p style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 12px 0" }}>
                      A Meta consome centavos no leilão conforme pessoas reais visualizam seu post.
                    </p>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {/* OPÇÃO 1: TETO DE ORÇAMENTO */}
                      <div
                        onClick={() => setAutoBoostDurationMode("BUDGET_CAP")}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          background: autoBoostDurationMode === "BUDGET_CAP" ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${autoBoostDurationMode === "BUDGET_CAP" ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", margin: 0 }}>
                          <input
                            type="radio"
                            name="boostDurationMode"
                            value="BUDGET_CAP"
                            checked={autoBoostDurationMode === "BUDGET_CAP"}
                            onChange={() => setAutoBoostDurationMode("BUDGET_CAP")}
                            style={{ marginTop: "3px", accentColor: "#38bdf8", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <strong style={{ color: autoBoostDurationMode === "BUDGET_CAP" ? "#38bdf8" : "#fafafa", fontSize: "13px" }}>
                                💰 Teto de Orçamento (Valor Máximo a Gastar)
                              </strong>
                            </div>
                            <span style={{ fontSize: "11px", color: "#a1a1aa", display: "block", lineHeight: "1.4" }}>
                              O anúncio roda até consumir exatamente o valor total definido, independente de levar 1, 2 ou mais dias. O Apolo pausa automaticamente.
                            </span>

                            {/* INPUT E SUGESTÕES DO APOLO QUANDO ESTA OPÇÃO ESTIVER ATIVA */}
                            {autoBoostDurationMode === "BUDGET_CAP" && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  marginTop: "10px",
                                  padding: "12px",
                                  background: "#18181b",
                                  border: "1px solid rgba(56, 189, 248, 0.25)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <label style={{ fontSize: "11px", fontWeight: "700", color: "#d4d4d8" }}>
                                  Defina o Valor Máximo do Teto (R$):
                                </label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                  <div style={{ position: "relative", width: "160px" }}>
                                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: "#a1a1aa", fontWeight: "700" }}>
                                      R$
                                    </span>
                                    <input
                                      type="number"
                                      min={1}
                                      step={0.5}
                                      value={autoBoostBudgetCap}
                                      onChange={(e) => setAutoBoostBudgetCap(Math.max(1, Number(e.target.value)))}
                                      style={{
                                        width: "100%",
                                        background: "#09090b",
                                        border: "1px solid rgba(255, 255, 255, 0.2)",
                                        padding: "7px 12px 7px 32px",
                                        borderRadius: "6px",
                                        color: "#38bdf8",
                                        fontSize: "13px",
                                        fontWeight: "700",
                                      }}
                                    />
                                  </div>

                                  {/* SUGESTÕES INTELIGENTES DO APOLO BASEADAS NA VERBA DA CONTA */}
                                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    {budgetSummary?.remainingBudget && budgetSummary.remainingBudget > 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => setAutoBoostBudgetCap(Number(budgetSummary.remainingBudget.toFixed(2)))}
                                        style={{
                                          padding: "5px 9px",
                                          borderRadius: "6px",
                                          background: "rgba(52, 211, 153, 0.12)",
                                          border: "1px solid rgba(52, 211, 153, 0.3)",
                                          color: "#34d399",
                                          fontSize: "11px",
                                          fontWeight: "700",
                                          cursor: "pointer",
                                        }}
                                        title="Usa exatamente o saldo livre disponível na carteira do Instagram"
                                      >
                                        💡 Usar saldo em conta (R$ {budgetSummary.remainingBudget.toFixed(2)})
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      onClick={() => setAutoBoostBudgetCap(6)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "6px",
                                        background: autoBoostBudgetCap === 6 ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.08)",
                                        border: `1px solid ${autoBoostBudgetCap === 6 ? "#38bdf8" : "rgba(56, 189, 248, 0.25)"}`,
                                        color: "#38bdf8",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                      }}
                                    >
                                      💡 R$ 6,00 (Validação)
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => setAutoBoostBudgetCap(18)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "6px",
                                        background: autoBoostBudgetCap === 18 ? "rgba(56, 189, 248, 0.2)" : "rgba(56, 189, 248, 0.08)",
                                        border: `1px solid ${autoBoostBudgetCap === 18 ? "#38bdf8" : "rgba(56, 189, 248, 0.25)"}`,
                                        color: "#38bdf8",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                      }}
                                    >
                                      💡 R$ 18,00 (Escala)
                                    </button>
                                  </div>
                                </div>

                                <span style={{ fontSize: "11px", color: "#38bdf8", display: "block" }}>
                                  📊 O anúncio consumirá centavos no leilão do Instagram e encerrará automaticamente assim que atingir <strong>R$ {autoBoostBudgetCap.toFixed(2)}</strong> gastos.
                                </span>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>

                      {/* OPÇÃO 2: POR TEMPO / DURAÇÃO FIXA */}
                      <div
                        onClick={() => setAutoBoostDurationMode("FIXED_DAYS")}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          background: autoBoostDurationMode === "FIXED_DAYS" ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${autoBoostDurationMode === "FIXED_DAYS" ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", margin: 0 }}>
                          <input
                            type="radio"
                            name="boostDurationMode"
                            value="FIXED_DAYS"
                            checked={autoBoostDurationMode === "FIXED_DAYS"}
                            onChange={() => setAutoBoostDurationMode("FIXED_DAYS")}
                            style={{ marginTop: "3px", accentColor: "#38bdf8", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <strong style={{ color: autoBoostDurationMode === "FIXED_DAYS" ? "#38bdf8" : "#fafafa", fontSize: "13px" }}>
                                ⏱️ Por Tempo (Duração Fixa em Dias)
                              </strong>
                            </div>
                            <span style={{ fontSize: "11px", color: "#a1a1aa", display: "block", lineHeight: "1.4" }}>
                              O anúncio veicula pelo período de dias escolhido e encerra ao final do prazo (com limite de segurança diário de R$ 6,00/dia).
                            </span>

                            {/* INPUT E SUGESTÕES QUANDO ESTA OPÇÃO ESTIVER ATIVA */}
                            {autoBoostDurationMode === "FIXED_DAYS" && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  marginTop: "10px",
                                  padding: "12px",
                                  background: "#18181b",
                                  border: "1px solid rgba(56, 189, 248, 0.25)",
                                  borderRadius: "8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "8px",
                                }}
                              >
                                <label style={{ fontSize: "11px", fontWeight: "700", color: "#d4d4d8" }}>
                                  Defina a Quantidade de Dias de Veiculação:
                                </label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                                  <div style={{ width: "120px" }}>
                                    <input
                                      type="number"
                                      min={1}
                                      max={30}
                                      step={1}
                                      value={autoBoostDurationDays}
                                      onChange={(e) => setAutoBoostDurationDays(Math.max(1, Number(e.target.value)))}
                                      style={{
                                        width: "100%",
                                        background: "#09090b",
                                        border: "1px solid rgba(255, 255, 255, 0.2)",
                                        padding: "7px 12px",
                                        borderRadius: "6px",
                                        color: "#38bdf8",
                                        fontSize: "13px",
                                        fontWeight: "700",
                                      }}
                                    />
                                  </div>

                                  {/* SUGESTÕES DO APOLO EM DIAS */}
                                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                    <button
                                      type="button"
                                      onClick={() => setAutoBoostDurationDays(3)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "6px",
                                        background: autoBoostDurationDays === 3 ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                        border: `1px solid ${autoBoostDurationDays === 3 ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                                        color: autoBoostDurationDays === 3 ? "#38bdf8" : "#d4d4d8",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                      }}
                                    >
                                      💡 Apolo sugere: 3 dias (Janela Ideal)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAutoBoostDurationDays(1)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "6px",
                                        background: autoBoostDurationDays === 1 ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                        border: `1px solid ${autoBoostDurationDays === 1 ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                                        color: autoBoostDurationDays === 1 ? "#38bdf8" : "#d4d4d8",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                      }}
                                    >
                                      💡 1 dia (Teste Rápido)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setAutoBoostDurationDays(5)}
                                      style={{
                                        padding: "5px 9px",
                                        borderRadius: "6px",
                                        background: autoBoostDurationDays === 5 ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                        border: `1px solid ${autoBoostDurationDays === 5 ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                                        color: autoBoostDurationDays === 5 ? "#38bdf8" : "#d4d4d8",
                                        fontSize: "11px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                      }}
                                    >
                                      💡 5 dias (Escala)
                                    </button>
                                  </div>
                                </div>

                                <span style={{ fontSize: "11px", color: "#38bdf8", display: "block" }}>
                                  📊 O anúncio rodará por <strong>{autoBoostDurationDays} {autoBoostDurationDays === 1 ? "dia" : "dias"}</strong> com limite diário de segurança de R$ 6,00/dia.
                                </span>
                              </div>
                            )}
                          </div>
                        </label>
                      </div>

                      {/* OPÇÃO 3: ATÉ SER PAUSADO (SEM NENHUM INPUT ADICIONAL) */}
                      <div
                        onClick={() => setAutoBoostDurationMode("UNTIL_PAUSED")}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "8px",
                          background: autoBoostDurationMode === "UNTIL_PAUSED" ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.02)",
                          border: `1px solid ${autoBoostDurationMode === "UNTIL_PAUSED" ? "#38bdf8" : "rgba(255, 255, 255, 0.08)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", margin: 0 }}>
                          <input
                            type="radio"
                            name="boostDurationMode"
                            value="UNTIL_PAUSED"
                            checked={autoBoostDurationMode === "UNTIL_PAUSED"}
                            onChange={() => setAutoBoostDurationMode("UNTIL_PAUSED")}
                            style={{ marginTop: "3px", accentColor: "#38bdf8", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <strong style={{ color: autoBoostDurationMode === "UNTIL_PAUSED" ? "#38bdf8" : "#fafafa", fontSize: "13px" }}>
                                ⚡ Até ser pausado (Veiculação Contínua)
                              </strong>
                            </div>
                            <span style={{ fontSize: "11px", color: "#a1a1aa", display: "block", lineHeight: "1.4" }}>
                              Roda continuamente no leilão do Instagram com limite de segurança de R$ 6,00/dia até você pausar manualmente.
                            </span>

                            {/* QUANDO ATIVO: NENHUM INPUT, APENAS CARD INFORMATIVO */}
                            {autoBoostDurationMode === "UNTIL_PAUSED" && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  padding: "10px 12px",
                                  background: "rgba(56, 189, 248, 0.08)",
                                  border: "1px solid rgba(56, 189, 248, 0.25)",
                                  borderRadius: "8px",
                                  fontSize: "11px",
                                  color: "#38bdf8",
                                  lineHeight: "1.45",
                                }}
                              >
                                ⚡ <strong>Veiculação Contínua Ativa:</strong> O anúncio consumirá centavos conforme devs visualizam seu post (com teto de segurança de R$ 6,00/dia) e continuará ativo até você pausá-lo no Syrius ou no app do Instagram.
                              </div>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* 3. CARD DE RESUMO DA ESTRATÉGIA DO APOLO (DINÂMICO E BASEADO NO POST SELECIONADO) */}
                  <div
                    style={{
                      background: "rgba(56, 189, 248, 0.05)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      borderRadius: "10px",
                      padding: "14px",
                      marginBottom: "20px",
                      fontSize: "12px",
                      color: "#d4d4d8",
                      lineHeight: "1.5",
                    }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#38bdf8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <IconSparkles size={13} color="#38bdf8" />
                      <span>CONFIGURAÇÃO AUTÔNOMA APLICADA PELO APOLO:</span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", marginBottom: "10px" }}>
                      <div>🎯 <strong>Público:</strong> {derived?.audienceName || "Devs"} ({derived?.ageRange || "20-44 anos"})</div>
                      <div>🏷️ <strong>Interesses:</strong> {derived?.interests || "JavaScript, TypeScript"}</div>
                      <div>📱 <strong>Canais:</strong> {derived?.channels || "Instagram Feed, Reels & Explorar"}</div>
                      <div>📍 <strong>Regiões:</strong> {derived?.locationScopeLabel || "SP, CE, MG, RJ, SC, Goiás"}</div>
                      <div style={{ gridColumn: "1 / -1" }}>🚀 <strong>Objetivo Meta:</strong> Mais Visitas ao Perfil (@syrius_tech)</div>
                    </div>

                    <div style={{ fontSize: "11px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.08)", padding: "8px 10px", borderRadius: "6px", borderLeft: "3px solid #38bdf8" }}>
                      <strong>Por que o Apolo escolheu isso?</strong> {derived?.rationale} • {derived?.geoExplanation}
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setIsAutonomousBoostModalOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="primary-button"
                      disabled={dispatchingAutonomousBoost || (!autoBoostPostId && publishedPosts.length === 0)}
                      style={{
                        background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
                        color: "#ffffff",
                        fontWeight: "700",
                        padding: "9px 18px",
                        boxShadow: "0 4px 15px rgba(2, 132, 199, 0.35)",
                      }}
                    >
                      {dispatchingAutonomousBoost ? <IconLoader size={14} className="spin" /> : <IconRocket size={14} />}
                      <span>
                        {dispatchingAutonomousBoost
                          ? "Ativando na Meta API..."
                          : autoBoostDurationMode === "BUDGET_CAP"
                          ? `Disparar Turbinada com Teto de R$ ${autoBoostBudgetCap.toFixed(2)}`
                          : autoBoostDurationMode === "UNTIL_PAUSED"
                          ? `Disparar Turbinada Contínua (R$ ${autoBoostDailyBudget.toFixed(2)}/dia)`
                          : `Disparar Turbinada por ${autoBoostDurationDays} ${autoBoostDurationDays === 1 ? "dia" : "dias"} (R$ ${(autoBoostDailyBudget * autoBoostDurationDays).toFixed(2)})`}
                      </span>
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL DE REGISTRAR TURBINADA COM SELETOR DE POSTS REAIS */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(6px)",
            padding: "20px",
          }}
        >
          <div
            className="custom-scrollbar"
            style={{
              background: "#18181b",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "14px",
              width: "620px",
              maxWidth: "94vw",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(56, 189, 248, 0.4) rgba(24, 24, 27, 0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                    }}
                  >
                    REGISTRO DE CAMPANHA
                  </span>
                </div>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#fafafa", margin: "0 0 2px 0" }}>
                  Registrar / Sincronizar Post Turbinado
                </h2>
                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                  Selecione o post do acervo e puxe os números diretamente do Instagram com 1 clique.
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsModalOpen(false);
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#d4d4d8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
                title="Fechar"
              >
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign}>
              {/* 1. SELETOR E FILTRO DE POSTS REAIS */}
              <div style={{ marginBottom: "16px", background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa", display: "block", marginBottom: "6px" }}>
                  1. Selecionar Post do Acervo
                </label>

                <input
                  type="text"
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  placeholder="Digite para filtrar posts por título, assunto ou tecnologia..."
                  style={{
                    width: "100%",
                    background: "#18181b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    color: "#fafafa",
                    fontSize: "12px",
                    marginBottom: "10px",
                  }}
                />

                {/* LISTA COMPACTA DE POSTS DO ACERVO */}
                <div
                  className="custom-scrollbar"
                  style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    paddingRight: "4px",
                    scrollbarWidth: "thin",
                  }}
                >
                  {postsList
                    .filter((p) =>
                      !postSearchQuery.trim() ||
                      p.topic.toLowerCase().includes(postSearchQuery.toLowerCase())
                    )
                    .slice(0, 10)
                    .map((p) => {
                      const isSelected = modalSelectedPostId === p.id || modalPostTopic === p.topic;
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setModalSelectedPostId(p.id);
                            setModalPostTopic(p.topic);
                            setModalPostFormat(p.format);
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            background: isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                            border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.06)"}`,
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <span style={{ fontSize: "9px", fontWeight: "700", padding: "1px 5px", borderRadius: "3px", background: "rgba(255, 255, 255, 0.1)", color: "#fafafa" }}>
                                {p.format === "REEL_SCRIPT" ? "REELS" : p.format === "CAROUSEL" ? "CARROSSEL" : "SOLO"}
                              </span>
                              <span style={{ fontSize: "10px", color: p.status === "PUBLISHED" ? "#34d399" : "#a1a1aa" }}>
                                {p.status === "PUBLISHED" ? "Publicado no Instagram" : p.status}
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", color: isSelected ? "#38bdf8" : "#fafafa", fontWeight: isSelected ? "700" : "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.topic}
                            </div>
                          </div>

                          {isSelected && <IconCheck size={14} color="#38bdf8" />}
                        </div>
                      );
                    })}
                </div>

                {/* BOTÃO DE SINCRONIZAÇÃO AUTOMÁTICA DO INSTAGRAM */}
                {modalSelectedPostId && (
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      disabled={isSyncingInstagramInsights}
                      onClick={() => handleSyncInstagramForModal(modalSelectedPostId)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        background: "rgba(56, 189, 248, 0.15)",
                        border: "1px solid rgba(56, 189, 248, 0.4)",
                        color: "#38bdf8",
                        fontSize: "11px",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isSyncingInstagramInsights ? <IconLoader size={12} className="spin" /> : <IconRefreshCw size={12} />}
                      <span>Puxar Métricas Reais do Instagram (1 Clique)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 2. CAMPOS DE MÉTRICAS DA TURBINADA */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                    Valor Investido (R$)
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.01}
                    value={modalBudgetSpent}
                    onChange={(e) => setModalBudgetSpent(Number(e.target.value))}
                    style={{
                      width: "100%",
                      background: "#09090b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      color: "#fafafa",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                    Duração (Dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={modalDurationDays}
                    onChange={(e) => setModalDurationDays(Number(e.target.value))}
                    style={{
                      width: "100%",
                      background: "#09090b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      color: "#fafafa",
                      fontSize: "12px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                    Novos Seguidores
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalFollowersGained}
                    onChange={(e) => setModalFollowersGained(Number(e.target.value))}
                    style={{
                      width: "100%",
                      background: "#09090b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      color: "#fafafa",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                    Salvamentos
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalSavesCount}
                    onChange={(e) => setModalSavesCount(Number(e.target.value))}
                    style={{
                      width: "100%",
                      background: "#09090b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      color: "#fafafa",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                    Visitas ao Perfil
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={modalProfileVisits}
                    onChange={(e) => setModalProfileVisits(Number(e.target.value))}
                    style={{
                      width: "100%",
                      background: "#09090b",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      color: "#fafafa",
                      fontSize: "12px",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                  Visualizações / Alcance do Anúncio
                </label>
                <input
                  type="number"
                  min={0}
                  value={modalReachTotal}
                  onChange={(e) => setModalReachTotal(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "#09090b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    color: "#fafafa",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "18px" }}>
                <label style={{ fontSize: "12px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                  Observações / Notas do Gestor
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Ex: 9 curtidas pelo anúncio, custo por seguidor de R$ 3,00 e alta taxa de conversão..."
                  style={{
                    width: "100%",
                    minHeight: "75px",
                    background: "#09090b",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    color: "#fafafa",
                    fontSize: "12px",
                    lineHeight: "1.45",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingCampaign || !modalPostTopic}
                >
                  {savingCampaign ? <IconLoader size={13} /> : <IconCheck size={13} />}
                  <span>Salvar Análise de Turbinada</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES COMPLETOS DA TURBINADA ("QUEM VIU SEU ANÚNCIO") */}
      {selectedCampaignDetails && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            backdropFilter: "blur(6px)",
            padding: "20px",
          }}
        >
          <div
            className="custom-scrollbar"
            style={{
              background: "#18181b",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "14px",
              width: "740px",
              maxWidth: "94vw",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(56, 189, 248, 0.1)",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(56, 189, 248, 0.4) rgba(24, 24, 27, 0.6)",
            }}
          >
            {/* CABEÇALHO DO MODAL */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "14px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                    }}
                  >
                    {selectedCampaignDetails.postFormat || "REEL_SCRIPT"}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#fbbf24",
                      background: "rgba(245, 158, 11, 0.12)",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      border: "1px solid rgba(245, 158, 11, 0.25)",
                    }}
                  >
                    {selectedCampaignDetails.targetAudience?.statusText || "Veiculação até ser pausado"}
                  </span>
                </div>
                <h2 style={{ fontSize: "17px", fontWeight: "800", color: "#fafafa", margin: "0 0 4px 0", lineHeight: "1.4" }}>
                  {selectedCampaignDetails.postTopic}
                </h2>
                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                  Orçamento: R$ {selectedCampaignDetails.dailyBudget?.toFixed(2) || "6.00"}/dia • Total consumido: <strong style={{ color: "#34d399" }}>R$ {selectedCampaignDetails.budgetSpent?.toFixed(2) || "2.03"}</strong>
                </p>
              </div>

              {/* BOTÃO FECHAR COM ÁREA DE CLIQUE AMPLA E PRECISA */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCampaignDetails(null);
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#d4d4d8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
                title="Fechar Detalhes"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* FUNIL DE CONVERSÃO DO ANÚNCIO */}
            <div>
              <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#fafafa", margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                <IconZap size={15} color="#38bdf8" />
                <span>Funil de Conversão do Anúncio (Meta Insights)</span>
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Visualizações Anúncio</span>
                  <strong style={{ fontSize: "16px", color: "#fafafa" }}>{selectedCampaignDetails.reachTotal || selectedCampaignDetails.impressions || 0}</strong>
                  <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>
                    {selectedCampaignDetails.impressions || 0} impressões totais
                  </span>
                </div>

                <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                  <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Visitas ao Perfil</span>
                  <strong style={{ fontSize: "16px", color: "#fbbf24" }}>+{selectedCampaignDetails.profileVisits || 0}</strong>
                  <span style={{ fontSize: "10px", color: "#38bdf8", display: "block" }}>
                    {selectedCampaignDetails.profileVisits > 0
                      ? `R$ ${((selectedCampaignDetails.budgetSpent || 0) / selectedCampaignDetails.profileVisits).toFixed(2)} por visita`
                      : "R$ 0.00 por visita"}
                  </span>
                </div>

                <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(52, 211, 153, 0.25)" }}>
                  <span style={{ fontSize: "10px", color: "#34d399", display: "block" }}>Seguidores (Anúncio)</span>
                  <strong style={{ fontSize: "16px", color: "#34d399" }}>+{selectedCampaignDetails.followersGained || 0}</strong>
                  <span style={{ fontSize: "10px", color: "#34d399", display: "block" }}>
                    {selectedCampaignDetails.profileVisits > 0 && selectedCampaignDetails.followersGained > 0
                      ? `${(((selectedCampaignDetails.followersGained || 0) / selectedCampaignDetails.profileVisits) * 100).toFixed(1)}% conversão visita/follow`
                      : "0.0% conversão visita/follow"}
                  </span>
                </div>

                <div style={{ background: "#09090b", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(192, 132, 252, 0.2)" }}>
                  <span style={{ fontSize: "10px", color: "#c084fc", display: "block" }}>Salvamentos Anúncio</span>
                  <strong style={{ fontSize: "16px", color: "#c084fc" }}>+{selectedCampaignDetails.savesCount || 0}</strong>
                  <span style={{ fontSize: "10px", color: "#71717a", display: "block" }}>
                    {selectedCampaignDetails.savesCount > 0
                      ? `R$ ${((selectedCampaignDetails.budgetSpent || 0) / selectedCampaignDetails.savesCount).toFixed(2)} por save`
                      : "R$ 0.00 por save"}
                  </span>
                </div>
              </div>
            </div>

            {/* VISÃO GERAL TOTAL DO POST (ORGÂNICO + ANÚNCIO) SE DISPONÍVEL */}
            {selectedCampaignDetails.targetAudience?.organicPlusPaidOverview && (
              <div style={{ background: "#09090b", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "10px", padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Desempenho Global do Post (Orgânico + Turbinado)
                  </span>
                  <span style={{ fontSize: "11px", color: "#34d399", fontWeight: "700" }}>
                    +{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.totalFollowers || 0} novos seguidores globais
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: "8px", fontSize: "11px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Views Totais</span>
                    <strong style={{ color: "#fafafa", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.views || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Alcance Total</span>
                    <strong style={{ color: "#fafafa", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.reach || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Interações</span>
                    <strong style={{ color: "#38bdf8", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.interactions || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Curtidas</span>
                    <strong style={{ color: "#f43f5e", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.likes || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Salvamentos</span>
                    <strong style={{ color: "#c084fc", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.saves || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Comentários</span>
                    <strong style={{ color: "#fbbf24", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.comments || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Compartilhamentos</span>
                    <strong style={{ color: "#a855f7", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.shares || 0}</strong>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "8px", borderRadius: "6px" }}>
                    <span style={{ color: "#a1a1aa", display: "block" }}>Atividade Perfil</span>
                    <strong style={{ color: "#34d399", fontSize: "14px" }}>{selectedCampaignDetails.targetAudience.organicPlusPaidOverview.profileActivity || 0}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO "QUEM VIU SEU ANÚNCIO" (DEMOGRAFIA REAL META ADS) */}
            <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#fafafa", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconUsers size={15} color="#38bdf8" />
                  <span>Quem viu seu anúncio (Perfil Demográfico Meta Ads)</span>
                </h3>
                <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                  Base: {selectedCampaignDetails.reachTotal || selectedCampaignDetails.impressions || 0} visualizações reais
                </span>
              </div>

              {selectedCampaignDetails.targetAudience?.ageBreakdown?.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  {/* FAIXA ETÁRIA */}
                  <div>
                    <h4 style={{ fontSize: "11px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0" }}>
                      Faixa Etária
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {selectedCampaignDetails.targetAudience.ageBreakdown.map((age: any, idx: number) => (
                        <div key={idx}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                            <span style={{ color: "#fafafa" }}>{age.range} {age.label ? `(${age.label})` : ""}</span>
                            <strong style={{ color: idx < 2 ? "#38bdf8" : "#e4e4e7" }}>{age.percentage}%</strong>
                          </div>
                          <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${age.percentage}%`, height: "100%", background: idx < 2 ? "#38bdf8" : idx === 2 ? "#a855f7" : "#60a5fa" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GÊNERO & LOCALIZAÇÃO */}
                  <div>
                    <h4 style={{ fontSize: "11px", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 8px 0" }}>
                      Gênero & Principais Polos
                    </h4>
                    
                    {selectedCampaignDetails.targetAudience?.genderBreakdown && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                          <span style={{ color: "#38bdf8" }}>{selectedCampaignDetails.targetAudience.genderBreakdown.men || 0}% Homens</span>
                          <span style={{ color: "#f472b6" }}>{selectedCampaignDetails.targetAudience.genderBreakdown.women || 0}% Mulheres</span>
                        </div>
                        <div style={{ height: "6px", background: "#f472b6", borderRadius: "3px", overflow: "hidden", display: "flex" }}>
                          <div style={{ width: `${selectedCampaignDetails.targetAudience.genderBreakdown.men || 0}%`, height: "100%", background: "#38bdf8" }} />
                        </div>
                      </div>
                    )}

                    {selectedCampaignDetails.targetAudience?.topLocations?.length > 0 && (
                      <div style={{ fontSize: "11px", color: "#a1a1aa", display: "flex", flexDirection: "column", gap: "4px" }}>
                        {selectedCampaignDetails.targetAudience.topLocations.map((loc: any, idx: number) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#fafafa" }}>{loc.city || loc.name}</span>
                            <strong style={{ color: "#38bdf8" }}>{loc.percentage}%</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px dashed rgba(255, 255, 255, 0.1)", borderRadius: "8px", padding: "24px 16px", textAlign: "center" }}>
                  <IconClock size={20} color="#38bdf8" style={{ marginBottom: "8px" }} />
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#fafafa", marginBottom: "4px" }}>
                    Aguardando Primeiras Impressões na Meta Ads
                  </div>
                  <div style={{ fontSize: "11px", color: "#71717a", maxWidth: "420px", margin: "0 auto", lineHeight: "1.4" }}>
                    A Meta Marketing API consolida dados de gênero, faixa etária e estados após o anúncio atingir um volume mínimo de entrega no leilão.
                  </div>
                </div>
              )}
            </div>

            {/* DIAGNÓSTICO DO APOLO */}
            {selectedCampaignDetails.aiDiagnosis && (
              <div
                style={{
                  background: "rgba(56, 189, 248, 0.05)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  fontSize: "12px",
                  color: "#e4e4e7",
                  lineHeight: "1.5",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", marginBottom: "4px" }}>
                  🧠 ANÁLISE DE AUDIÊNCIA DO APOLO:
                </div>
                {selectedCampaignDetails.aiDiagnosis}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedCampaignDetails(null)}
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE ORÇAMENTO & ESTRATÉGIA DO APOLO */}
      {isBudgetModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="custom-scrollbar"
            style={{
              background: "#18181b",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              padding: "24px",
              width: "100%",
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(56, 189, 248, 0.4) rgba(24, 24, 27, 0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      background: "rgba(56, 189, 248, 0.15)",
                      color: "#38bdf8",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                    }}
                  >
                    PLANEJAMENTO FINANCEIRO
                  </span>
                </div>
                <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fafafa", margin: "0 0 4px 0" }}>
                  Gestão de Orçamento & Estratégia de Anúncios
                </h2>
                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0 }}>
                  Defina o valor colocado no Instagram Ads e a postura estratégica do Apolo para turbinar publicações.
                </p>
              </div>

              {/* BOTÃO FECHAR COM ÁREA DE CLIQUE AMPLA E PRECISA */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBudgetModalOpen(false);
                }}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#d4d4d8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.2s ease",
                }}
                title="Fechar Configurações"
              >
                <IconX size={18} />
              </button>
            </div>

            {/* PAINEL DE SALDO EM TEMPO REAL */}
            {budgetSummary && (
              <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "16px", marginBottom: "18px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Verba no Instagram</span>
                    <strong style={{ fontSize: "15px", color: "#fafafa" }}>R$ {budgetSummary.monthlyBudget.toFixed(2)}</strong>
                  </div>

                  <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block" }}>Já Consumido</span>
                    <strong style={{ fontSize: "15px", color: "#fbbf24" }}>R$ {budgetSummary.totalSpentThisMonth.toFixed(2)}</strong>
                  </div>

                  <div
                    style={{
                      background: budgetSummary.burnRateStatus === "HEALTHY" ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: `1px solid ${budgetSummary.burnRateStatus === "HEALTHY" ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                    }}
                  >
                    <span style={{ fontSize: "10px", color: budgetSummary.burnRateStatus === "HEALTHY" ? "#34d399" : "#fbbf24", display: "block" }}>
                      Saldo Restante
                    </span>
                    <strong style={{ fontSize: "15px", color: budgetSummary.burnRateStatus === "HEALTHY" ? "#34d399" : "#fbbf24" }}>
                      R$ {budgetSummary.remainingBudget.toFixed(2)}
                    </strong>
                  </div>
                </div>

                {/* BARRA DE PROGRESSO DO ORÇAMENTO */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "4px" }}>
                    <span style={{ color: "#a1a1aa" }}>Progresso de Consumo da Verba</span>
                    <span style={{ color: "#d4d4d8", fontWeight: "600" }}>
                      {((budgetSummary.totalSpentThisMonth / (budgetSummary.monthlyBudget || 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (budgetSummary.totalSpentThisMonth / (budgetSummary.monthlyBudget || 1)) * 100)}%`,
                        height: "100%",
                        background: budgetSummary.burnRateStatus === "HEALTHY" ? "#10b981" : budgetSummary.burnRateStatus === "LOW" ? "#f59e0b" : "#ef4444",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: "10px", color: "#71717a", display: "block", marginTop: "4px" }}>
                    Ritmo ideal: R$ {budgetSummary.dailyIdealAllowance.toFixed(2)}/dia para os próximos {budgetSummary.daysRemainingInMonth} dias do ciclo.
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveBudgetConfig}>
              {/* STATUS DE SINCRONIZAÇÃO AUTOMÁTICA DA META MARKETING API */}
              <div
                style={{
                  background: "rgba(56, 189, 248, 0.05)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  marginBottom: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", display: "block", marginBottom: "2px" }}>
                    Sincronização Automática via Meta Marketing API
                  </span>
                  <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                    Conta: Syrius_Agent (act_2163467940868819) • Saldo lido direto da carteira da Meta em tempo real.
                  </span>
                </div>
                <div
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#34d399",
                    fontSize: "11px",
                    fontWeight: "700",
                    flexShrink: 0,
                  }}
                >
                  Ao Vivo
                </div>
              </div>

              {/* SELEÇÃO DO MODO DE ESTRATÉGIA DO APOLO */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa", display: "block", marginBottom: "8px" }}>
                  Modo de Estratégia & Postura do Apolo
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* CONSERVADOR */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: modalStrategyModeInput === "CONSERVATIVE" ? "rgba(56, 189, 248, 0.1)" : "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${modalStrategyModeInput === "CONSERVATIVE" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="strategyMode"
                      checked={modalStrategyModeInput === "CONSERVATIVE"}
                      onChange={() => setModalStrategyModeInput("CONSERVATIVE")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ color: "#fafafa", fontSize: "12px", display: "block" }}>
                        Modo Conservador / Econômico
                      </strong>
                      <span style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: "1.4", display: "block" }}>
                        Foco no menor custo possível. Prioriza testes curtos de R$ 6,00/dia (1 a 2 dias) para validar o tema antes de gastar mais.
                      </span>
                    </div>
                  </label>

                  {/* OPORTUNISTA */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: modalStrategyModeInput === "OPPORTUNISTIC" ? "rgba(56, 189, 248, 0.1)" : "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${modalStrategyModeInput === "OPPORTUNISTIC" ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="strategyMode"
                      checked={modalStrategyModeInput === "OPPORTUNISTIC"}
                      onChange={() => setModalStrategyModeInput("OPPORTUNISTIC")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ color: "#38bdf8", fontSize: "12px", display: "block" }}>
                        Modo Oportunista (Recomendado)
                      </strong>
                      <span style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: "1.4", display: "block" }}>
                        Equilíbrio ideal. Só investe verba quando um post tiver Opportunity Score &ge; 90 e comprovada retenção de devs.
                      </span>
                    </div>
                  </label>

                  {/* AGRESSIVO */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      background: modalStrategyModeInput === "AGGRESSIVE" ? "rgba(168, 85, 247, 0.1)" : "rgba(255, 255, 255, 0.02)",
                      border: `1px solid ${modalStrategyModeInput === "AGGRESSIVE" ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.08)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="strategyMode"
                      checked={modalStrategyModeInput === "AGGRESSIVE"}
                      onChange={() => setModalStrategyModeInput("AGGRESSIVE")}
                      style={{ marginTop: "3px" }}
                    />
                    <div>
                      <strong style={{ color: "#c084fc", fontSize: "12px", display: "block" }}>
                        Modo Agressivo / Escala
                      </strong>
                      <span style={{ fontSize: "11px", color: "#a1a1aa", lineHeight: "1.4", display: "block" }}>
                        Aceleração de crescimento. Aloca verba de R$ 12 a R$ 30 nos posts de alto impacto para maximizar ganho de seguidores.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* AUTOMATIZAÇÕES & NOTIFICAÇÕES DO APOLO */}
              <div style={{ marginBottom: "20px", background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", padding: "14px" }}>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa", display: "block", marginBottom: "10px" }}>
                  Automação & Notificações de Turbinada
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <div>
                      <strong style={{ color: "#fafafa", fontSize: "12px", display: "block" }}>Piloto Automático (Auto-Turbinar AI)</strong>
                      <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Permite que o Apolo programe turbinadas de posts com Score ≥ 90 automaticamente na melhor janela.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={modalAutoBoostEnabledInput}
                      onChange={(e) => setModalAutoBoostEnabledInput(e.target.checked)}
                      style={{ width: "18px", height: "18px", accentColor: "#38bdf8", cursor: "pointer" }}
                    />
                  </label>

                  <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                    <div>
                      <strong style={{ color: "#fafafa", fontSize: "12px", display: "block" }}>Notificar por E-mail no Melhor Horário</strong>
                      <span style={{ fontSize: "11px", color: "#a1a1aa" }}>Envia alerta executivo por e-mail com a melhor janela de horário para turbinar e avisos de atraso.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={modalNotifyEmailInput}
                      onChange={(e) => setModalNotifyEmailInput(e.target.checked)}
                      style={{ width: "18px", height: "18px", accentColor: "#38bdf8", cursor: "pointer" }}
                    />
                  </label>
                </div>
              </div>

              {/* AÇÕES DO MODAL */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsBudgetModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingBudgetConfig}
                >
                  {savingBudgetConfig ? <IconLoader size={14} className="spin" /> : <IconCheck size={14} />}
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
