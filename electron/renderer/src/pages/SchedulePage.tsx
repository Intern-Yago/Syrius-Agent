import React, { useState, useEffect } from "react";
import { ScheduleSlot, Post } from "../types";
import {
  IconCalendar,
  IconPlus,
  IconSparkles,
  IconEdit,
  IconTrash,
  IconPlay,
  IconLoader,
  IconClock,
  IconTag,
  IconCheck,
  IconX,
  IconArrowUpRight,
  IconRefreshCw,
} from "../components/common/Icons";
import { EditSlotModal } from "../components/schedule/EditSlotModal";
import { getSlotTimingInfo, sortSlotsChronologically } from "../utils/scheduleTiming";
import { useModal } from "../context/ModalContext";
import { useActivities } from "../context/ActivitiesContext";

interface SchedulePageProps {
  onProduceSlot: (slot: ScheduleSlot) => void;
  onNavigate?: (page: string, targetId?: string) => void;
  generationQueue?: ScheduleSlot[];
  activeQueueSlot?: ScheduleSlot | null;
  onEnqueueSlot?: (slot: ScheduleSlot) => void;
  onEnqueueMultipleSlots?: (slots: ScheduleSlot[]) => void;
  onRemoveFromQueue?: (slotId: string) => void;
  onClearQueue?: () => void;
  onOpenRepoToPost?: () => void;
  onOpenExperiments?: () => void;
}

export function SchedulePage({
  onProduceSlot,
  onNavigate,
  generationQueue = [],
  activeQueueSlot = null,
  onEnqueueSlot,
  onEnqueueMultipleSlots,
  onRemoveFromQueue,
  onClearQueue,
  onOpenRepoToPost,
  onOpenExperiments,
}: SchedulePageProps) {
  const { showConfirm, showAlert, toast } = useModal();
  const { registerOrUpdateActivity, isPostPublishing, activities } = useActivities();
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiGenerationStage, setAiGenerationStage] = useState<string>("");
  const [editingSlot, setEditingSlot] = useState<Partial<ScheduleSlot> | null>(null);
  const [autoplay, setAutoplay] = useState<boolean>(() => {
    try {
      return localStorage.getItem("schedule_autoplay_enabled") === "true";
    } catch {
      return false;
    }
  });
  const [togglingAutoplay, setTogglingAutoplay] = useState(false);
  const [dismissedCompletion, setDismissedCompletion] = useState<boolean>(() => {
    try {
      return localStorage.getItem("schedule_dismissed_completion") === "true";
    } catch {
      return false;
    }
  });
  const [earlyPublishSlot, setEarlyPublishSlot] = useState<ScheduleSlot | null>(null);
  const [publishingEarly, setPublishingEarly] = useState(false);
  const [publishingDirectId, setPublishingDirectId] = useState<string | null>(null);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0);

  const [pendingSuggestion, setPendingSuggestion] = useState<{
    detectedManualSlots: string[];
    critiqueAndOptimization: string;
    suggestedAdjustedSlots: ScheduleSlot[];
  } | null>(null);

  const [pendingRecommendations, setPendingRecommendations] = useState<any[]>([]);

  function getMatchingPost(slot: ScheduleSlot): Post | undefined {
    return posts.find(
      (p) =>
        (slot.postId && p.id === slot.postId) ||
        (p.slotId && p.slotId === slot.id) ||
        (p.topic && slot.topic && p.topic.trim().toLowerCase() === slot.topic.trim().toLowerCase())
    );
  }

  function isSlotPublishing(slot: ScheduleSlot): boolean {
    if (publishingDirectId === slot.id) return true;
    const match = getMatchingPost(slot);
    const postId = slot.postId || match?.id;
    if (postId && isPostPublishing?.(postId)) return true;
    const isActivityRunning = activities.some(
      (a) =>
        a.type === "publishing" &&
        a.status === "running" &&
        (a.id === `publish-${postId}` ||
          a.subtitle === slot.topic ||
          a.subtitle === match?.topic)
    );
    return isActivityRunning;
  }

  const isWeekCompleted =
    slots.length > 0 &&
    slots.every((s) => {
      const match = getMatchingPost(s);
      return s.status === "PUBLISHED" || match?.status === "PUBLISHED" || s.status === "READY" || match?.status === "READY";
    });

  async function loadPendingRecommendations() {
    try {
      if (window.electronAPI?.getPendingRecommendations) {
        const list = await window.electronAPI.getPendingRecommendations();
        if (Array.isArray(list)) setPendingRecommendations(list);
      }
    } catch {}
  }

  async function loadSchedule(offset: number = selectedWeekOffset) {
    try {
      setLoading(true);
      if (!window.electronAPI?.getSchedule) {
        setSlots([]);
        return;
      }
      const data = await window.electronAPI.getSchedule(offset);
      setSlots(data);

      try {
        const allPosts = await window.electronAPI.getPosts?.();
        if (allPosts) setPosts(allPosts);
      } catch {}

      if (window.electronAPI?.getAutoplay) {
        const auto = await window.electronAPI.getAutoplay();
        setAutoplay(auto);
        try {
          localStorage.setItem("schedule_autoplay_enabled", String(auto));
        } catch {}
      }

      await loadPendingRecommendations();
    } catch (err) {
      console.error("Erro ao carregar cronograma:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule(selectedWeekOffset);
  }, [selectedWeekOffset]);

  // Sincronização em tempo real via IPC e atividades
  useEffect(() => {
    let unsubs: Array<(() => void) | undefined> = [];

    if (window.electronAPI?.onScheduleUpdate) {
      unsubs.push(
        window.electronAPI.onScheduleUpdate(() => {
          loadSchedule(selectedWeekOffset);
        })
      );
    }

    if (window.electronAPI?.onPublishProgress) {
      unsubs.push(
        window.electronAPI.onPublishProgress((task: any) => {
          if (task?.status === "completed" || task?.status === "error") {
            loadSchedule(selectedWeekOffset);
          }
        })
      );
    }

    if (window.electronAPI?.onSchedulePublishAlert) {
      unsubs.push(
        window.electronAPI.onSchedulePublishAlert(() => {
          loadSchedule(selectedWeekOffset);
        })
      );
    }

    return () => {
      unsubs.forEach((u) => u?.());
    };
  }, [selectedWeekOffset]);

  // Reage automaticamente quando uma atividade de publicação é concluída
  useEffect(() => {
    const hasCompletedPublish = activities.some(
      (a) => a.type === "publishing" && a.status === "completed"
    );
    if (hasCompletedPublish) {
      loadSchedule(selectedWeekOffset);
    }
  }, [activities, selectedWeekOffset]);

  // Polling suave em background a cada 4 segundos para manter o cronograma 100% atualizado
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        if (window.electronAPI?.getSchedule) {
          const freshSlots = await window.electronAPI.getSchedule(selectedWeekOffset);
          if (freshSlots && Array.isArray(freshSlots)) {
            setSlots(freshSlots);
          }
        }
        if (window.electronAPI?.getPosts) {
          const freshPosts = await window.electronAPI.getPosts();
          if (freshPosts && Array.isArray(freshPosts)) {
            setPosts(freshPosts);
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [selectedWeekOffset]);

  async function handleToggleAutoplay() {
    try {
      setTogglingAutoplay(true);
      const next = !autoplay;
      const updated = await window.electronAPI.setAutoplay(next);
      setAutoplay(updated);
      try {
        localStorage.setItem("schedule_autoplay_enabled", String(updated));
      } catch {}
      toast.info(updated ? "Publicação Automática (Autoplay) ATIVADA de forma fixa." : "Publicação Automática (Autoplay) DESATIVADA.");
    } catch (err) {
      toast.error(`Erro ao alterar Autoplay: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setTogglingAutoplay(false);
    }
  }

  async function handleSaveSlot(slot: ScheduleSlot) {
    try {
      const updated = await window.electronAPI.saveScheduleSlot(slot, selectedWeekOffset);
      setSlots(updated);
      setEditingSlot(null);
      toast.success("Slot atualizado com sucesso!");
    } catch (err) {
      toast.error(`Erro ao salvar slot: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    const confirmed = await showConfirm({
      title: "Remover Slot",
      message: "Tem certeza que deseja remover este slot da grade editorial?",
      confirmText: "Remover Slot",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      const updated = await window.electronAPI.deleteScheduleSlot(slotId, selectedWeekOffset);
      setSlots(updated);
      toast.success("Slot removido do cronograma.");
    } catch (err) {
      toast.error(`Erro ao remover slot: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleGenerateAI() {
    const isNext = selectedWeekOffset === 1;
    const confirmed = await showConfirm({
      title: isNext ? "Planejar Grade da Próxima Semana com IA" : "Planejar Grade da Semana Atual com IA",
      message: isNext
        ? "A inteligência artificial irá analisar obrigatoriamente as tendências em alta do momento (Radar Tech), o histórico do banco de dados e as diretrizes do perfil para estruturar a grade da próxima semana. Deseja continuar?"
        : "A inteligência artificial irá analisar obrigatoriamente as tendências em alta do momento (Radar Tech), o histórico do banco de dados e as diretrizes do perfil para estruturar a grade da semana atual. Deseja continuar?",
      confirmText: "Gerar Grade com IA",
      type: "primary",
    });
    if (!confirmed) return;

    const activityId = `schedule-ai-${Date.now()}`;
    const startTime = Date.now();

    try {
      setGeneratingAI(true);
      setAiGenerationStage("1/3: Consultando histórico e diretrizes do perfil...");

      registerOrUpdateActivity({
        id: activityId,
        type: "schedule_ai",
        title: isNext ? "Planejamento da Grade (Próxima Semana)" : "Planejamento da Grade Semanal",
        subtitle: "Consultando histórico de publicações e pautas salvas",
        targetPage: "schedule",
        status: "running",
        statusMessage: "1/3: Consultando histórico e diretrizes do perfil...",
        progress: 20,
        startedAt: startTime,
        canStop: false,
      });

      // Etapa 2 obrigatória: Analisando tendências do momento
      const t1 = setTimeout(() => {
        setAiGenerationStage("2/3: Analisando tendências do momento (Radar Tech)...");
        registerOrUpdateActivity({
          id: activityId,
          type: "schedule_ai",
          title: isNext ? "Planejamento da Grade (Próxima Semana)" : "Planejamento da Grade Semanal",
          subtitle: "Varredura obrigatória de tendências tech ativas do momento",
          targetPage: "schedule",
          status: "running",
          statusMessage: "2/3: Analisando tendências do momento (Radar Tech)...",
          progress: 50,
          startedAt: startTime,
          canStop: false,
        });
      }, 500);

      // Etapa 3: Criando matriz e gerando com Gemini
      const t2 = setTimeout(() => {
        setAiGenerationStage("3/3: Equilibrando quadros fixos e gerando grade com Gemini...");
        registerOrUpdateActivity({
          id: activityId,
          type: "schedule_ai",
          title: isNext ? "Planejamento da Grade (Próxima Semana)" : "Planejamento da Grade Semanal",
          subtitle: "Equilibrando formatos, quadros fixos e temas em alta",
          targetPage: "schedule",
          status: "running",
          statusMessage: "3/3: Equilibrando quadros fixos e gerando grade com Gemini...",
          progress: 80,
          startedAt: startTime,
          canStop: false,
        });
      }, 1200);

      const res = await window.electronAPI.generateScheduleAI({ weekOffset: selectedWeekOffset });
      clearTimeout(t1);
      clearTimeout(t2);

      if (res && res.slots) {
        setSlots(res.slots);
        if (res.aiSuggestion) {
          setPendingSuggestion(res.aiSuggestion);
        } else {
          setPendingSuggestion(null);
        }
        await loadPendingRecommendations();

        registerOrUpdateActivity({
          id: activityId,
          type: "schedule_ai",
          title: isNext ? "Planejamento da Grade (Próxima Semana)" : "Planejamento da Grade Semanal",
          subtitle: `${res.slots.length} slots planejados com base nas tendências do momento`,
          targetPage: "schedule",
          status: "completed",
          statusMessage: "Grade editorial semanal gerada com sucesso incorporando tendências tech!",
          progress: 100,
          startedAt: startTime,
          canStop: false,
        });

        toast.success(`Grade editorial ${isNext ? "da próxima semana" : "da semana atual"} planejada pela IA com sucesso!`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erro desconhecido";
      registerOrUpdateActivity({
        id: activityId,
        type: "schedule_ai",
        title: isNext ? "Planejamento da Grade (Próxima Semana)" : "Planejamento da Grade Semanal",
        subtitle: "Erro no planejamento com IA",
        targetPage: "schedule",
        status: "error",
        statusMessage: errMsg,
        errorLog: errMsg,
        progress: 0,
        startedAt: startTime,
        canStop: false,
        canRetry: true,
      });
      toast.error(`Erro ao gerar grade com IA: ${errMsg}`);
    } finally {
      setGeneratingAI(false);
      setAiGenerationStage("");
    }
  }

  async function handleAcceptSuggestion() {
    if (!pendingSuggestion?.suggestedAdjustedSlots) return;
    try {
      const updated = await window.electronAPI.saveScheduleAll(pendingSuggestion.suggestedAdjustedSlots, selectedWeekOffset);
      setSlots(updated);
      setPendingSuggestion(null);
      toast.success("Otimizações da IA aplicadas à grade com sucesso!");
    } catch (err) {
      toast.error(`Erro ao aplicar otimização: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  function handleDismissSuggestion() {
    setPendingSuggestion(null);
  }

  async function handleConfirmEarlyPublish() {
    if (!earlyPublishSlot) return;
    try {
      setPublishingEarly(true);
      if (earlyPublishSlot.postId) {
        const res = await window.electronAPI.publishPost(earlyPublishSlot.postId);
        if (res.success) {
          const updatedSlot: ScheduleSlot = { ...earlyPublishSlot, status: "PUBLISHED" };
          await window.electronAPI.saveScheduleSlot(updatedSlot);
          setSlots((current) => current.map((s) => (s.id === earlyPublishSlot.id ? updatedSlot : s)));
          toast.success("Post publicado no Instagram com sucesso!");
        } else {
          toast.error(`Erro ao publicar: ${res.error || "Falha desconhecida"}`);
        }
      } else {
        toast.warning("Este post ainda não possui conteúdo gerado no banco. Produza primeiro.");
      }
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setPublishingEarly(false);
      setEarlyPublishSlot(null);
    }
  }

  async function handleMarkStoryPublished(slot: ScheduleSlot) {
    try {
      if (slot.postId && window.electronAPI?.setPostStatus) {
        await window.electronAPI.setPostStatus(slot.postId, "PUBLISHED");
      }
      const updatedSlot: ScheduleSlot = { ...slot, status: "PUBLISHED" };
      await window.electronAPI.saveScheduleSlot(updatedSlot);
      setSlots((current) => current.map((s) => (s.id === slot.id ? updatedSlot : s)));
      toast.success("Story marcado como publicado no Instagram com sucesso!");
    } catch (err) {
      toast.error(`Erro ao atualizar status: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleUnmarkPublished(slot: ScheduleSlot) {
    const matchingPost = getMatchingPost(slot);
    const targetPostId = slot.postId || matchingPost?.id;

    const confirmed = await showConfirm({
      title: "Desmarcar como Publicado",
      message: `Deseja desmarcar a publicação "${slot.topic}"? O status voltará para Pronto/Planejado no cronograma para que você possa regerar ou republicar quando desejar.`,
      confirmText: "Sim, Desmarcar",
      cancelText: "Manter Publicado",
      type: "primary",
    });

    if (!confirmed) return;

    try {
      if (targetPostId && window.electronAPI?.setPostStatus) {
        await window.electronAPI.setPostStatus(targetPostId, "READY");
      }

      const updatedSlot: ScheduleSlot = {
        ...slot,
        status: matchingPost ? "READY" : "PLANNED",
        instagramUrl: undefined,
      };

      await window.electronAPI.saveScheduleSlot(updatedSlot, selectedWeekOffset);
      setSlots((current) => current.map((s) => (s.id === slot.id ? updatedSlot : s)));
      if (matchingPost) {
        setPosts((current) =>
          current.map((p) => (p.id === matchingPost.id ? { ...p, status: "READY", instagramUrl: undefined } : p))
        );
      }
      toast.success("Publicação desmarcada com sucesso! Slot restaurado para a grade ativa.");
    } catch (err) {
      toast.error(`Erro ao desmarcar publicação: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleDirectPublish(slot: ScheduleSlot) {
    if (!slot.postId) {
      toast.warning("Este post ainda não possui conteúdo gerado no banco de dados. Produza primeiro.");
      return;
    }

    const isStory =
      slot.format === "STORY_PHOTO" ||
      slot.format === "STORY" ||
      slot.format === "STORIES" ||
      slot.editorialPillar?.toLowerCase().includes("caixinha") ||
      slot.editorialPillar?.toLowerCase().includes("quiz");

    if (isStory) {
      const choice = await showConfirm({
        title: "Publicação de Story Interativo (Caixinha / Quiz)",
        message: "A API do Instagram não suporta a inserção automática de stickers de Caixinha de Perguntas ou Quiz. Se você já postou o Story no aplicativo do Instagram com o sticker, clique em 'Marcar como Publicado'. Se deseja enviar apenas a imagem de fundo via API, clique em 'Publicar via API'.",
        confirmText: "Marcar como Publicado (Feito no App)",
        cancelText: "Publicar Imagem via API",
        type: "primary",
      });

      if (choice) {
        await handleMarkStoryPublished(slot);
        return;
      }
    }

    try {
      setPublishingDirectId(slot.id);
      const res = await window.electronAPI.publishPost(slot.postId);
      if (res.success) {
        const updatedSlot: ScheduleSlot = { ...slot, status: "PUBLISHED" };
        await window.electronAPI.saveScheduleSlot(updatedSlot);
        setSlots((current) => current.map((s) => (s.id === slot.id ? updatedSlot : s)));
        toast.success("Post publicado no Instagram com sucesso!");
      } else {
        toast.error(`Erro ao publicar: ${res.error || "Falha desconhecida"}`);
      }
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setPublishingDirectId(null);
    }
  }

  function getFormatBadgeColor(format: string) {
    switch (format?.toUpperCase()) {
      case "CAROUSEL":
        return { bg: "rgba(37, 99, 235, 0.15)", border: "rgba(37, 99, 235, 0.3)", color: "#60a5fa", label: "Carrossel" };
      case "SINGLE_IMAGE":
        return { bg: "rgba(147, 51, 234, 0.15)", border: "rgba(147, 51, 234, 0.3)", color: "#c084fc", label: "Post Solo" };
      case "REEL_SCRIPT":
        return { bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.3)", color: "#fbbf24", label: "Roteiro Reels" };
      case "STORY_PHOTO":
        return { bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.3)", color: "#34d399", label: "Story Foto" };
      default:
        return { bg: "rgba(113, 113, 122, 0.15)", border: "rgba(113, 113, 122, 0.3)", color: "#a1a1aa", label: format };
    }
  }

  function getSlotStatusBadge(status: string) {
    switch (status) {
      case "PUBLISHED":
        return { label: "Publicado", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" };
      case "READY":
      case "SCHEDULED":
        return { label: "Pronto & Agendado", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" };
      default:
        return { label: "Planejado", bg: "rgba(255, 255, 255, 0.05)", color: "#a1a1aa", border: "rgba(255, 255, 255, 0.1)" };
    }
  }

  const sortedSlots = sortSlotsChronologically(slots);

  const unproducedSlots = sortedSlots.filter((slot) => {
    const match = getMatchingPost(slot);
    const postExists = Boolean(match);
    const isPublished = slot.status === "PUBLISHED" || match?.status === "PUBLISHED";
    const isReady = postExists && (slot.status === "READY" || match?.status === "READY");
    const isEnqueued = generationQueue.some((q) => q.id === slot.id);
    const isRunning = activeQueueSlot?.id === slot.id;
    return !isPublished && !isReady && !isEnqueued && !isRunning;
  });

  return (
    <div className="posts-page-container">
      <div className="page-header">
        <div>
          <div className="section-tag">
            <span className="section-dot" />
            <span>EDITORIAL MATRIX & CALENDAR</span>
          </div>
          <h2>Cronograma Semanal de Publicações</h2>
          <p>
            Grade planejada para equilibrar autoridade, engajamento, compartilhamentos e topo de funil no Instagram.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* TOGGLE AUTOPLAY DAEMON */}
          <button
            type="button"
            onClick={handleToggleAutoplay}
            disabled={togglingAutoplay}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: autoplay ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${autoplay ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.12)"}`,
              color: autoplay ? "#34d399" : "#a1a1aa",
            }}
            title="Quando ativado, o agente verifica os horários em background e produz os posts sozinho."
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: autoplay ? "#10b981" : "#71717a",
                boxShadow: autoplay ? "0 0 8px #10b981" : "none",
              }}
            />
            <span>{autoplay ? "Autoplay Ativo" : "Autoplay Desativado"}</span>
          </button>

          {/* GERAR TODOS EM FILA */}
          {unproducedSlots.length > 0 && onEnqueueMultipleSlots && (
            <button
              type="button"
              className="primary-button"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                borderColor: "#38bdf8",
              }}
              onClick={() => onEnqueueMultipleSlots(unproducedSlots)}
              title="Colocar todos os posts pendentes da grade na fila de geração automática"
            >
              <IconSparkles size={13} />
              <span>Gerar Grade em Fila ({unproducedSlots.length})</span>
            </button>
          )}

          <button
            className="secondary-button"
            onClick={handleGenerateAI}
            disabled={generatingAI || loading}
            style={{
              borderColor: generatingAI ? "rgba(56, 189, 248, 0.5)" : undefined,
              color: generatingAI ? "#38bdf8" : undefined,
            }}
          >
            {generatingAI ? (
              <>
                <IconLoader className="spin" size={13} />
                <span>{aiGenerationStage || "Analisando tendências..."}</span>
              </>
            ) : (
              <>
                <IconSparkles size={13} />
                <span>Planejar Grade com IA</span>
              </>
            )}
          </button>

          {onOpenRepoToPost && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenRepoToPost}
              style={{
                borderColor: "rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
              }}
              title="Dissecar repositório do GitHub e gerar publicação técnica"
            >
              <span>Repo-to-Post</span>
            </button>
          )}

          {onOpenExperiments && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenExperiments}
              style={{
                borderColor: "rgba(168, 85, 247, 0.35)",
                color: "#c084fc",
              }}
              title="Laboratório de Testes A/B de Capas e Ganchos"
            >
              <span>Testes A/B</span>
            </button>
          )}

          <button
            className="primary-button"
            onClick={() => setEditingSlot({ dayOfWeek: "Segunda-feira", timeSlot: "18:30", format: "CAROUSEL", weekOffset: selectedWeekOffset })}
          >
            <IconPlus size={13} />
            <span>Novo Slot</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE VISUALIZAÇÃO: SEMANA ATUAL VS PRÓXIMA SEMANA */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          marginBottom: "20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: "14px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedWeekOffset(0)}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: selectedWeekOffset === 0 ? "rgba(147, 51, 234, 0.18)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${selectedWeekOffset === 0 ? "#a855f7" : "rgba(255, 255, 255, 0.1)"}`,
            color: selectedWeekOffset === 0 ? "#f4f4f5" : "#a1a1aa",
          }}
        >
          Semana Atual
        </button>

        <button
          type="button"
          onClick={() => setSelectedWeekOffset(1)}
          style={{
            padding: "8px 18px",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: "700",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: selectedWeekOffset === 1 ? "rgba(56, 189, 248, 0.18)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${selectedWeekOffset === 1 ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
            color: selectedWeekOffset === 1 ? "#f4f4f5" : "#a1a1aa",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>Próxima Semana</span>
          {pendingRecommendations.length > 0 && (
            <span
              style={{
                background: "#38bdf8",
                color: "#09090b",
                fontSize: "10px",
                fontWeight: "800",
                borderRadius: "10px",
                padding: "1px 6px",
              }}
            >
              {pendingRecommendations.length} {pendingRecommendations.length === 1 ? "pauta" : "pautas"}
            </span>
          )}
        </button>

        {selectedWeekOffset === 1 && slots.length > 0 && (
          <button
            type="button"
            className="secondary-button"
            style={{ marginLeft: "auto", fontSize: "12px", padding: "6px 14px" }}
            onClick={async () => {
              const confirmed = await showConfirm({
                title: "Aplicar como Semana Atual?",
                message: "Esta ação promoverá toda a grade planejada da próxima semana para se tornar a semana atual ativa.",
                confirmText: "Sim, Promover Grade",
                cancelText: "Cancelar",
              });
              if (confirmed) {
                try {
                  if (window.electronAPI?.advanceWeek) {
                    const res = await window.electronAPI.advanceWeek();
                    setSelectedWeekOffset(0);
                    setSlots(res.slots);
                    toast.success("Grade da próxima semana promovida com sucesso para a semana atual!");
                  }
                } catch (err) {
                  toast.error(`Erro ao promover grade: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
                }
              }
            }}
          >
            Promover para Semana Atual
          </button>
        )}
      </div>

      {/* BANNER DE PLANEJAMENTO INTELIGENTE COM IA & ANÁLISE DE TENDÊNCIAS */}
      {generatingAI && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            boxShadow: "0 0 25px rgba(56, 189, 248, 0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.2)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
              }}
            >
              <IconLoader className="spin" size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                <strong style={{ fontSize: "14px", color: "#fafafa" }}>Planejamento Editorial com Inteligência Artificial</strong>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.2)",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    color: "#38bdf8",
                    fontWeight: "700",
                  }}
                >
                  Etapa Obrigatória
                </span>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#38bdf8", fontWeight: "600" }}>
                {aiGenerationStage || "Analisando tendências do momento (Radar Tech)..."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "11px",
                color: "#c084fc",
                background: "rgba(147, 51, 234, 0.15)",
                border: "1px solid rgba(147, 51, 234, 0.3)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontWeight: "600",
              }}
            >
              Radar de Tendências Tech
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "#34d399",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontWeight: "600",
              }}
            >
              Memória RAG & Histórico
            </span>
          </div>
        </div>
      )}

      {/* BANNER DE FILA DE PRODUÇÃO ATIVA */}
      {(activeQueueSlot || generationQueue.length > 0) && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(99, 102, 241, 0.12))",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: "12px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(56, 189, 248, 0.2)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
              }}
            >
              <IconLoader className="spin" size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Fila de Produção Sequencial Ativa
                </span>
                {generationQueue.length > 0 && (
                  <span style={{ fontSize: "11px", background: "rgba(255, 255, 255, 0.08)", padding: "2px 6px", borderRadius: "4px", color: "#e4e4e7", fontWeight: "700" }}>
                    +{generationQueue.length} na fila
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "#f4f4f5", fontWeight: "600" }}>
                {activeQueueSlot ? `Produzindo agora: "${activeQueueSlot.topic}" (${activeQueueSlot.format})` : "Aguardando próximo item da fila..."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => onNavigate?.("home")}
              className="secondary-button"
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Ver Pipeline no Dashboard
            </button>
            {onClearQueue && (
              <button
                type="button"
                onClick={onClearQueue}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                Limpar Fila
              </button>
            )}
          </div>
        </div>
      )}

      {/* BANNER CONSULTIVO ESTRATÉGICO IA */}
      {pendingSuggestion && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(147, 51, 234, 0.12))",
            border: "1px solid rgba(147, 51, 234, 0.35)",
            borderRadius: "14px",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IconSparkles size={16} color="#c084fc" />
              <strong style={{ fontSize: "13px", color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Consultoria Estratégica IA • Proposta de Otimização
              </strong>
            </div>

            <button
              type="button"
              onClick={handleDismissSuggestion}
              style={{ background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
              title="Fechar sugestão e manter minhas escolhas"
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.6", margin: 0 }}>
            {pendingSuggestion.critiqueAndOptimization}
          </p>

          {pendingSuggestion.detectedManualSlots && pendingSuggestion.detectedManualSlots.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Pautas manuais mantidas:</span>
              {pendingSuggestion.detectedManualSlots.map((m, idx) => (
                <span
                  key={idx}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "5px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#f4f4f5",
                    fontSize: "11px",
                  }}
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingTop: "4px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={handleAcceptSuggestion}
              style={{
                background: "#9333ea",
                borderColor: "#a855f7",
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IconCheck size={13} />
              <span>Aceitar Otimização da IA</span>
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleDismissSuggestion}
              style={{ padding: "8px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <IconX size={13} />
              <span>Manter Minhas Escolhas (Recusar)</span>
            </button>
          </div>
        </div>
      )}

      {/* BANNER DE PAUTAS PRIORITÁRIAS SALVAS EM MEMÓRIA PARA A PRÓXIMA SEMANA */}
      {pendingRecommendations.length > 0 && (
        <div
          style={{
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", maxWidth: "800px" }}>
            <IconLightbulb size={18} color="#38bdf8" />
            <div>
              <strong style={{ fontSize: "13px", color: "#38bdf8", display: "block", marginBottom: "4px" }}>
                {pendingRecommendations.length} {pendingRecommendations.length === 1 ? "Pauta Prioritária do Analytics salva" : "Pautas Prioritárias do Analytics salvas"} em Memória para a Próxima Semana:
              </strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                {pendingRecommendations.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      color: "#f4f4f5",
                    }}
                  >
                    <strong>{p.topic}</strong> ({p.suggestedDay} às {p.suggestedTime})
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={async () => {
              try {
                if (window.electronAPI?.clearPendingRecommendations) {
                  await window.electronAPI.clearPendingRecommendations();
                  setPendingRecommendations([]);
                  toast.info("Memória de pautas pendentes limpa.");
                }
              } catch {}
            }}
            style={{ fontSize: "11px", padding: "4px 10px", color: "#71717a" }}
            title="Limpar pautas pendentes da memória"
          >
            Limpar Fila
          </button>
        </div>
      )}

      {/* BANNER DE CONCLUSÃO DA GRADE & ATIVAÇÃO DE PUBLICAÇÃO AUTOMÁTICA */}
      {isWeekCompleted && !autoplay && !dismissedCompletion && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(56, 189, 248, 0.12))",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            borderRadius: "14px",
            padding: "20px 24px",
            marginBottom: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ fontSize: "13px", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Produção Semanal Concluída com Sucesso
            </strong>

            <button
              type="button"
              onClick={() => {
                setDismissedCompletion(true);
                try {
                  localStorage.setItem("schedule_dismissed_completion", "true");
                } catch {}
              }}
              style={{ background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}
              title="Dispensar aviso"
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: "13px", color: "#e4e4e7", margin: 0, lineHeight: "1.5" }}>
            Todos os posts desta grade foram gerados e validados pelo Quality Control. Deseja que o sistema publique automaticamente no Instagram nos horários programados (sem precisar de aprovação manual em cada um)?
          </p>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", paddingTop: "4px" }}>
            <button
              type="button"
              className="primary-button"
              style={{ background: "#10b981", borderColor: "#059669", padding: "8px 16px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={async () => {
                try {
                  await window.electronAPI.saveSettings({ autoPublish: true });
                  await window.electronAPI.setAutoplay(true);
                  setAutoplay(true);
                  setDismissedCompletion(true);
                  try {
                    localStorage.setItem("schedule_dismissed_completion", "true");
                  } catch {}
                  toast.success("Publicação Automática e Autoplay ATIVADOS com sucesso! O robô postará sozinho nos horários programados.");
                } catch (err) {
                  toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
                }
              }}
            >
              <IconCheck size={13} />
              <span>Ativar Publicação Automática</span>
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setDismissedCompletion(true);
                try {
                  localStorage.setItem("schedule_dismissed_completion", "true");
                } catch {}
                handleGenerateAI();
              }}
              style={{ padding: "8px 14px", fontSize: "12px" }}
            >
              <span>Manter Aprovação Manual e Planejar Próxima Semana</span>
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconLoader size={24} />
          </div>
          <h2>Carregando cronograma...</h2>
          <p>Buscando sua grade editorial autônoma...</p>
        </div>
      )}

      {!loading && slots.length === 0 && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconCalendar size={32} />
          </div>
          <h2>Nenhum post planejado</h2>
          <p>Clique no botão acima para planejar sua grade semanal com Inteligência Artificial.</p>
        </div>
      )}

      {!loading && sortedSlots.length > 0 && (
        <div className="tests-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {sortedSlots.map((slot) => {
            const matchingPost = getMatchingPost(slot);
            const postExists = Boolean(matchingPost);
            const isPublished = slot.status === "PUBLISHED" || matchingPost?.status === "PUBLISHED";
            const isReady = postExists && (slot.status === "READY" || matchingPost?.status === "READY");
            const isCurrentlyProducing = activeQueueSlot?.id === slot.id;
            const queueIndex = generationQueue?.findIndex((q) => q.id === slot.id) ?? -1;
            const isEnqueued = queueIndex >= 0;

            const formatBadge = getFormatBadgeColor(slot.format);
            const statusBadge = isPublished
              ? { label: "Publicado", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "rgba(16, 185, 129, 0.3)" }
              : isCurrentlyProducing
              ? { label: "Gerando Agora...", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" }
              : isEnqueued
              ? { label: `Na Fila (${queueIndex + 1}/${generationQueue.length})`, bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "rgba(245, 158, 11, 0.3)" }
              : isReady
              ? { label: "Pronto & Agendado", bg: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "rgba(56, 189, 248, 0.3)" }
              : { label: "Planejado", bg: "rgba(255, 255, 255, 0.05)", color: "#a1a1aa", border: "rgba(255, 255, 255, 0.1)" };

            const timingInfo = getSlotTimingInfo(slot);

            return (
              <div
                key={slot.id}
                className="test-module-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: isCurrentlyProducing
                    ? "rgba(56, 189, 248, 0.6)"
                    : isEnqueued
                    ? "rgba(245, 158, 11, 0.4)"
                    : isPublished
                    ? "rgba(16, 185, 129, 0.3)"
                    : isReady
                    ? "rgba(56, 189, 248, 0.3)"
                    : timingInfo?.isOverdue
                    ? "rgba(239, 68, 68, 0.4)"
                    : undefined,
                  boxShadow: isCurrentlyProducing
                    ? "0 0 20px rgba(56, 189, 248, 0.2)"
                    : undefined,
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <IconClock size={13} color="#a1a1aa" />
                      <span style={{ fontSize: "12px", fontWeight: "700", color: "#f4f4f5" }}>
                        {slot.dayOfWeek} às {slot.timeSlot}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <span
                        onClick={isPublished ? () => handleUnmarkPublished(slot) : undefined}
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: statusBadge.bg,
                          border: `1px solid ${statusBadge.border}`,
                          color: statusBadge.color,
                          cursor: isPublished ? "pointer" : "default",
                          transition: "all 0.15s ease",
                        }}
                        title={isPublished ? "Clique para desmarcar publicação" : undefined}
                      >
                        {statusBadge.label}
                      </span>

                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: formatBadge.bg,
                          border: `1px solid ${formatBadge.border}`,
                          color: formatBadge.color,
                          textTransform: "uppercase",
                        }}
                      >
                        {formatBadge.label}
                      </span>

                      {slot.narrativeAngle && (
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background: "rgba(56, 189, 248, 0.12)",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            color: "#38bdf8",
                          }}
                        >
                          {slot.narrativeAngle.replace("_", " ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {slot.editorialPillar && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "5px", background: "rgba(147, 51, 234, 0.12)", border: "1px solid rgba(147, 51, 234, 0.3)", color: "#c084fc", fontSize: "11px", fontWeight: "700", marginBottom: "8px" }}>
                      <IconTag size={11} color="#c084fc" />
                      <span>{slot.editorialPillar}</span>
                    </div>
                  )}

                  {matchingPost ? (
                    <div
                      onClick={() => onNavigate?.("posts", matchingPost.id)}
                      style={{
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "flex-start",
                        gap: "6px",
                        marginBottom: "8px",
                        transition: "all 0.15s ease",
                      }}
                      title="Clique para abrir e inspecionar esta publicação na página de Posts"
                    >
                      <h3 style={{ fontSize: "15px", color: "#f4f4f5", lineHeight: "1.4", margin: 0 }}>
                        {slot.topic}
                      </h3>
                    </div>
                  ) : (
                    <h3 style={{ fontSize: "15px", color: "#f4f4f5", lineHeight: "1.4", marginBottom: "8px" }}>
                      {slot.topic}
                    </h3>
                  )}

                  <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5", marginBottom: "14px" }}>
                    {slot.reasoning}
                  </p>
                </div>

                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
                  {isPublished ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => handleUnmarkPublished(slot)}
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: "rgba(16, 185, 129, 0.12)",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          color: "#34d399",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "all 0.15s ease",
                        }}
                        title="Clique para desmarcar como publicado e retornar para a grade ativa"
                      >
                        <IconCheck size={12} color="#34d399" />
                        <span>Publicado (Desmarcar)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = slot.instagramUrl || matchingPost?.instagramUrl || "https://www.instagram.com/syrius_tech/";
                          window.electronAPI?.openExternal?.(url);
                        }}
                        style={{
                          padding: "8px 12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: "linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))",
                          border: "1px solid rgba(236, 72, 153, 0.4)",
                          color: "#f472b6",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          whiteSpace: "nowrap",
                        }}
                        title="Abrir publicação diretamente no Instagram"
                      >
                        <span>Ver no Instagram</span>
                        <IconArrowUpRight size={11} />
                      </button>
                    </div>
                  ) : isCurrentlyProducing ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                      <button
                        type="button"
                        disabled
                        className="btn-slot-produce"
                        style={{
                          flex: 1,
                          background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(99, 102, 241, 0.2))",
                          borderColor: "rgba(56, 189, 248, 0.4)",
                          color: "#38bdf8",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <IconLoader className="spin" size={13} />
                        <span>Gerando com IA...</span>
                      </button>
                    </div>
                  ) : isEnqueued ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                      <button
                        type="button"
                        disabled
                        style={{
                          flex: 1,
                          padding: "8px 12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: "rgba(245, 158, 11, 0.15)",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                          color: "#fbbf24",
                          borderRadius: "8px",
                          cursor: "default",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <IconClock size={12} />
                        <span>Na Fila ({queueIndex + 1}/{generationQueue.length})</span>
                      </button>

                      {onRemoveFromQueue && (
                        <button
                          type="button"
                          onClick={() => onRemoveFromQueue(slot.id)}
                          style={{
                            padding: "8px 10px",
                            fontSize: "11px",
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#f87171",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
                          title="Cancelar este item da fila de geração"
                        >
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                  ) : isReady ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => (onEnqueueSlot ? onEnqueueSlot(slot) : onProduceSlot(slot))}
                        className="btn-secondary"
                        style={{
                          padding: "8px 12px",
                          fontSize: "11px",
                          fontWeight: "700",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          background: "rgba(147, 51, 234, 0.12)",
                          border: "1px solid rgba(147, 51, 234, 0.3)",
                          color: "#c084fc",
                        }}
                        title="Regerar e substituir a arte/texto deste post com IA"
                      >
                        <IconSparkles size={11} color="#c084fc" />
                        <span>Regerar</span>
                      </button>

                      {timingInfo?.isOverdue ? (
                        <button
                          className="btn-slot-produce"
                          style={{
                            flex: 1,
                            background: "#ea580c",
                            borderColor: "#f97316",
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "11px",
                            opacity: isSlotPublishing(slot) ? 0.7 : 1,
                            cursor: isSlotPublishing(slot) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => handleDirectPublish(slot)}
                          disabled={isSlotPublishing(slot)}
                          title="Post pronto e em atraso - publicar imediatamente no Instagram"
                        >
                          {isSlotPublishing(slot) ? <IconLoader size={12} className="spin" /> : null}
                          <span>{isSlotPublishing(slot) ? "Publicando..." : "Publicar Agora"}</span>
                        </button>
                      ) : timingInfo?.isDueNow ? (
                        <button
                          className="btn-slot-produce"
                          style={{
                            flex: 1,
                            background: "#0ea5e9",
                            borderColor: "#38bdf8",
                            color: "#fff",
                            fontWeight: "700",
                            fontSize: "11px",
                            opacity: isSlotPublishing(slot) ? 0.7 : 1,
                            cursor: isSlotPublishing(slot) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => handleDirectPublish(slot)}
                          disabled={isSlotPublishing(slot)}
                          title="Horário de publicação atingido - publicar agora no Instagram"
                        >
                          {isSlotPublishing(slot) ? <IconLoader size={12} className="spin" /> : null}
                          <span>{isSlotPublishing(slot) ? "Publicando..." : "Publicar Agora"}</span>
                        </button>
                      ) : (
                        <button
                          className="btn-slot-produce"
                          style={{
                            flex: 1,
                            background: "#0ea5e9",
                            borderColor: "#38bdf8",
                            fontSize: "11px",
                            opacity: isSlotPublishing(slot) ? 0.7 : 1,
                            cursor: isSlotPublishing(slot) ? "not-allowed" : "pointer",
                          }}
                          onClick={() => setEarlyPublishSlot(slot)}
                          disabled={isSlotPublishing(slot)}
                          title="Publicar este post imediatamente antes do dia/horário planejado"
                        >
                          {isSlotPublishing(slot) ? <IconLoader size={12} className="spin" /> : null}
                          <span>{isSlotPublishing(slot) ? "Publicando..." : "Publicar Antes"}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      className="btn-slot-produce"
                      style={{
                        flex: 1,
                        background: timingInfo?.isOverdue ? "rgba(239, 68, 68, 0.18)" : undefined,
                        borderColor: timingInfo?.isOverdue ? "rgba(239, 68, 68, 0.4)" : undefined,
                        color: timingInfo?.isOverdue ? "#f87171" : undefined,
                      }}
                      onClick={() => (onEnqueueSlot ? onEnqueueSlot(slot) : onProduceSlot(slot))}
                      title={timingInfo?.isOverdue ? "Slot em atraso - produzir imediatamente no pipeline" : "Produzir este post agora no pipeline"}
                    >
                      <IconPlay size={11} />
                      <span>{timingInfo?.isOverdue ? "Produzir Agora (Atrasado)" : "Produzir Agora"}</span>
                    </button>
                  )}

                  <button
                    className="btn-slot-edit"
                    onClick={async () => {
                      const targetOffset = selectedWeekOffset === 0 ? 1 : 0;
                      const targetLabel = targetOffset === 0 ? "Semana Atual" : "Próxima Semana";
                      try {
                        if (window.electronAPI?.moveSlotWeek) {
                          await window.electronAPI.moveSlotWeek(slot.id, targetOffset);
                          await loadSchedule(selectedWeekOffset);
                          toast.success(`Slot movido para a ${targetLabel}!`);
                        }
                      } catch (err) {
                        toast.error(`Erro ao mover slot: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
                      }
                    }}
                    title={selectedWeekOffset === 0 ? "Mover este slot para a Próxima Semana" : "Mover este slot para a Semana Atual"}
                    style={{
                      color: selectedWeekOffset === 0 ? "#38bdf8" : "#a855f7",
                      borderColor: selectedWeekOffset === 0 ? "rgba(56, 189, 248, 0.25)" : "rgba(168, 85, 247, 0.25)",
                    }}
                  >
                    <IconCalendar size={13} />
                  </button>

                  <button
                    className="btn-slot-edit"
                    onClick={() => setEditingSlot(slot)}
                    title="Editar Slot"
                  >
                    <IconEdit size={14} />
                  </button>

                  <button
                    className="btn-slot-delete"
                    onClick={() => handleDeleteSlot(slot.id)}
                    title="Remover Slot"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: PUBLICAR ANTES DO HORÁRIO PLANEJADO */}
      {earlyPublishSlot && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "460px", padding: "28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "22px" }}>⚠️</span>
              <h3 style={{ fontSize: "16px", color: "#fafafa", margin: 0 }}>
                Publicar Fora do Cronograma?
              </h3>
            </div>

            <p style={{ fontSize: "13px", color: "#d4d4d8", lineHeight: "1.6", marginBottom: "16px" }}>
              Este post está pronto e foi planejado estrategicamente para{" "}
              <strong style={{ color: "#38bdf8" }}>{earlyPublishSlot.dayOfWeek} às {earlyPublishSlot.timeSlot}</strong>.
            </p>

            <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "8px", padding: "10px 12px", marginBottom: "20px" }}>
              Publicá-lo hoje com antecedência pode competir com outros posts do dia e quebrar a cadência calculada para o algoritmo do Instagram.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setEarlyPublishSlot(null)}
                disabled={publishingEarly}
              >
                Cancelar e Manter no Horário
              </button>

              <button
                type="button"
                className="btn-modal-save"
                style={{ background: "#ea580c" }}
                onClick={handleConfirmEarlyPublish}
                disabled={publishingEarly}
              >
                {publishingEarly ? (
                  <>
                    <IconLoader size={13} />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <span>Sim, Publicar Agora</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSlot && (
        <EditSlotModal
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSave={handleSaveSlot}
        />
      )}
    </div>
  );
}
