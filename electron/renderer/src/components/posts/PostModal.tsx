import React, { useState, useEffect } from "react";
import { Post, ScheduleSlot } from "../../types";
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconEdit,
  IconTrash,
  IconLoader,
  IconLayers,
  IconCheck,
  IconDownload,
  IconCopy,
  IconClock,
  IconTag,
  IconAlertTriangle,
  IconArrowUpRight,
  IconRotateCcw,
  IconPlay,
  IconVolume2,
  IconSparkles,
} from "../common/Icons";
import { ImageLightboxModal } from "../common/ImageLightboxModal";
import { getSlotTimingInfo } from "../../utils/scheduleTiming";
import { useActivities } from "../../context/ActivitiesContext";
import { useModal } from "../../context/ModalContext";

interface PostModalProps {
  post: Post;
  slot?: ScheduleSlot | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPostUpdated?: (updated: Post) => void;
  deleting: boolean;
}

export function PostModal({
  post,
  slot,
  onClose,
  onEdit,
  onDelete,
  onPostUpdated,
  deleting,
}: PostModalProps) {
  const { showConfirm, toast } = useModal();
  const {
    isPostPublishing,
    getPostPublishingTask,
    isPostRegenerating,
    getPostRegeneratingTask,
    isPostVideoRegenerating,
    getPostVideoRegeneratingTask,
    publishPost: executePublishPost,
  } = useActivities();
  const [localPost, setLocalPost] = useState<Post>(post);
  const [cacheBuster, setCacheBuster] = useState<number>(() => Date.now());
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [localPublishing, setLocalPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [showRepublishDialog, setShowRepublishDialog] = useState(false);
  const [regenAttemptsBySlide, setRegenAttemptsBySlide] = useState<Record<number, number>>({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  const sortedSlides = [...(localPost.slides || [])].sort((a, b) => a.number - b.number);
  const isPublished = localPost.status.toUpperCase() === "PUBLISHED";
  const isPublishing = isPostPublishing(localPost.id) || localPublishing;
  const publishingTask = getPostPublishingTask(localPost.id);
  const timingInfo = getSlotTimingInfo(slot, isPublished);
  const slide = sortedSlides[currentSlide] || sortedSlides[0];

  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [regeneratingVideo, setRegeneratingVideo] = useState(false);
  const isSlideRegenerating = isPostRegenerating(localPost.id, slide?.number) || regeneratingImage;
  const regeneratingTask = getPostRegeneratingTask(localPost.id, slide?.number);
  const isVideoGenerating = isPostVideoRegenerating(localPost.id) || regeneratingVideo;
  const videoTask = getPostVideoRegeneratingTask(localPost.id);

  const isStory = localPost.format === "STORY_PHOTO" || localPost.format === "STORIES" || localPost.format === "STORY";
  const isReel = localPost.format === "REEL_SCRIPT" || localPost.format === "REEL";
  const isVerticalMedia = isStory || isReel;
  const [mediaTab, setMediaTab] = useState<"video" | "slides">(isReel && localPost.videoUrl ? "video" : "slides");

  const [editingSlideText, setEditingSlideText] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [savingSlideText, setSavingSlideText] = useState(false);

  useEffect(() => {
    if (slide) {
      setEditTitle(slide.title || "");
      setEditText(slide.text || "");
      setEditingSlideText(false);
    }
  }, [slide?.id, slide?.number]);

  async function handleSaveSlideText() {
    if (!slide) return;
    try {
      setSavingSlideText(true);
      const res = await window.electronAPI?.updateSlideText?.({
        postId: localPost.id,
        slideNumber: slide.number,
        title: editTitle,
        text: editText,
      });

      if (res?.success) {
        const updatedSlides = localPost.slides.map((s) =>
          s.number === slide.number ? { ...s, title: editTitle, text: editText } : s
        );
        const updatedPost = { ...localPost, slides: updatedSlides };
        setLocalPost(updatedPost);
        setCacheBuster(Date.now());
        setEditingSlideText(false);
        setNotification({
          type: "success",
          message: "Texto do slide atualizado e tipografia recomposta instantaneamente com Sharp!",
        });
        if (onPostUpdated) onPostUpdated(updatedPost);
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Erro ao salvar texto do slide.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Erro ao atualizar texto.",
      });
    } finally {
      setSavingSlideText(false);
    }
  }

  useEffect(() => {
    setCurrentSlide(0);
    setNotification(null);
    setShowRepublishDialog(false);
    if (isReel && localPost.videoUrl) {
      setMediaTab("video");
    } else {
      setMediaTab("slides");
    }
  }, [localPost.id, localPost.videoUrl, isReel]);

  // Atualização reativa automática quando a regeneração com IA é concluída
  useEffect(() => {
    if (!window.electronAPI?.onRegenerateProgress) return;
    const unsub = window.electronAPI.onRegenerateProgress((data) => {
      if (data.postId === localPost.id && data.status === "completed") {
        window.electronAPI?.getPosts?.().then((posts) => {
          const fresh = posts?.find((p) => p.id === localPost.id);
          if (fresh) {
            setLocalPost(fresh);
            setCacheBuster(Date.now());
            if (onPostUpdated) onPostUpdated(fresh);
          }
        });
      }
    });
    return unsub;
  }, [localPost.id, onPostUpdated]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (showRepublishDialog) setShowRepublishDialog(false);
        else onClose();
      }
      if (event.key === "ArrowRight") {
        setCurrentSlide((current) => Math.min(current + 1, sortedSlides.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setCurrentSlide((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, sortedSlides.length, showRepublishDialog]);

  if (!slide) return null;

  async function handleDownloadSlide() {
    if (!slide.imagePath) {
      setNotification({ type: "error", message: "Este slide não possui imagem renderizada." });
      return;
    }

    try {
      setDownloading(true);
      const safeTopic = post.topic
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .slice(0, 40);

      const defaultFilename = `${post.format.toLowerCase()}-${safeTopic}-slide-${slide.number}.png`;

      const res = await window.electronAPI.downloadImage({
        imageUrl: slide.imagePath,
        defaultFilename,
      });

      if (res.success) {
        setNotification({
          type: "success",
          message: `Imagem salva com sucesso em: ${res.path}`,
        });
      } else if (res.error && !res.error.includes("cancelado")) {
        setNotification({
          type: "error",
          message: `Erro ao salvar imagem: ${res.error}`,
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `Erro ao baixar: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      });
    } finally {
      setDownloading(false);
    }
  }

  async function handleExportAll() {
    try {
      setExportingAll(true);
      const res = await window.electronAPI.downloadAllPostImages(post.id);

      if (res.success) {
        setNotification({
          type: "success",
          message: `Exportadas ${res.count || 0} artes e o arquivo 'legenda.txt' para: ${res.path}`,
        });
      } else if (res.error && !res.error.includes("cancelada")) {
        setNotification({
          type: "error",
          message: `Erro na exportação: ${res.error}`,
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `Erro ao exportar: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      });
    } finally {
      setExportingAll(false);
    }
  }

  function handleCopyCaption() {
    const fullText = [
      post.caption || "",
      "",
      Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "",
    ]
      .join("\n")
      .trim();

    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2500);
  }

  async function handlePublish(options?: { deletePrevious?: boolean }) {
    if (isPublishing) return;
    setShowRepublishDialog(false);

    const settings = await window.electronAPI?.getSettings?.();
    const handleName = settings?.instagramHandle || "Instagram";

    const isDueOrOverdue = timingInfo?.isOverdue || timingInfo?.isDueNow;

    if (!isPublished && !isDueOrOverdue) {
      const confirmed = await showConfirm({
        title: "Confirmar Publicação no Instagram",
        message: `Deseja publicar "${post.topic}" agora no perfil @${handleName}? A mídia e a legenda serão despachadas diretamente via Meta Graph API.`,
        confirmText: "Publicar no Instagram",
        cancelText: "Cancelar",
        type: "primary",
      });

      if (!confirmed) {
        return;
      }
    }

    try {
      setLocalPublishing(true);
      setNotification({
        type: "info",
        message: options?.deletePrevious
          ? `Excluindo post anterior e enviando ${post.slides.length > 1 ? `${post.slides.length} slides do Carrossel` : "mídia"} para o Instagram...`
          : `Enviando ${post.slides.length > 1 ? `${post.slides.length} slides do Carrossel` : "mídia"} para a Meta Graph API...`,
      });

      const res = await executePublishPost(post.id, post.topic, post.format, options);

      if (res.success) {
        const updatedPost: Post = {
          ...post,
          status: "PUBLISHED",
          instagramUrl: res.permalink || post.instagramUrl,
        };

        setNotification({
          type: "success",
          message: `Publicação realizada com sucesso no perfil @${handleName}! ${post.slides.length > 1 ? `Carrossel oficial com ${post.slides.length} slides postado.` : ""}`,
        });

        if (onPostUpdated) {
          onPostUpdated(updatedPost);
        }
      } else {
        setNotification({
          type: "error",
          message: `Erro ao publicar na Meta API: ${res.error || "Falha desconhecida"}`,
        });
      }
    } catch (err) {
      setNotification({
        type: "error",
        message: `Erro na publicação: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      });
    } finally {
      setLocalPublishing(false);
    }
  }

  async function handleToggleManualStatus() {
    try {
      const nextStatus = isPublished ? "READY" : "PUBLISHED";
      const updated = await window.electronAPI?.setPostStatus?.(localPost.id, nextStatus as any);
      if (updated) {
        setLocalPost(updated);
        setNotification({
          type: "success",
          message: isPublished ? "Publicação retornada para a fila de agendados!" : "Publicação confirmada e marcada como Postada no Instagram!",
        });
        if (onPostUpdated) {
          onPostUpdated(updated);
        }
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Erro ao atualizar status do post.",
      });
    }
  }

  function handleRegenerateButtonClick() {
    if (!slide) return;
    const currentAttempts = regenAttemptsBySlide[slide.number] || 0;
    // Se o usuário já refez este slide 2 ou mais vezes, abre o modal de feedback da IA
    if (currentAttempts >= 2) {
      setFeedbackModalOpen(true);
    } else {
      setRegenAttemptsBySlide((prev) => ({
        ...prev,
        [slide.number]: currentAttempts + 1,
      }));
      handleRegenerateSlideImage();
    }
  }

  async function handleRegenerateSlideImage(customFeedback?: string) {
    if (isSlideRegenerating || !slide) return;
    try {
      setFeedbackModalOpen(false);
      setRegeneratingImage(true);
      setNotification({
        type: "info",
        message: customFeedback
          ? `Analisando feedback com a IA e gerando arte personalizada para o Slide ${slide.number}...`
          : `Gerando nova arte para o Slide ${slide.number} de ${localPost.slides.length} com Recraft IA...`,
      });

      const res = await window.electronAPI?.regenerateImage?.({
        postId: localPost.id,
        slideId: slide.id,
        slideNumber: slide.number,
        feedback: customFeedback,
      });

      if (res?.success && res.post) {
        const newTimestamp = Date.now();
        setCacheBuster(newTimestamp);
        setLocalPost(res.post);
        setFeedbackText("");
        setNotification({
          type: "success",
          message: customFeedback
            ? `Arte do Slide ${slide.number} corrigida com base no seu feedback com sucesso!`
            : `Nova arte do Slide ${slide.number} atualizada com sucesso!`,
        });
        if (onPostUpdated) {
          onPostUpdated(res.post);
        }
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Falha ao refazer imagem com IA.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Erro ao conectar com a IA de imagem.",
      });
    } finally {
      setRegeneratingImage(false);
    }
  }

  async function handleRegenerateVideo() {
    if (regeneratingVideo) return;
    try {
      setRegeneratingVideo(true);
      setNotification({
        type: "info",
        message: "Sintetizando voz neural e renderizando vídeo Reels com animação de código...",
      });

      const res = await window.electronAPI?.regenerateVideo?.({ postId: localPost.id });
      if (res?.success && res.post) {
        setCacheBuster(Date.now());
        setLocalPost(res.post);
        setNotification({
          type: "success",
          message: "Novo vídeo Reels MP4 renderizado e atualizado com sucesso!",
        });
        if (onPostUpdated) {
          onPostUpdated(res.post);
        }
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Falha ao renderizar vídeo Reels com IA.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Erro ao solicitar renderização do vídeo.",
      });
    } finally {
      setRegeneratingVideo(false);
    }
  }

  const slideImageUrl = slide?.imagePath || null;

  return (
    <div className="post-modal-backdrop" onClick={onClose}>
      <div className="post-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "850px" }}>
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span className="eyebrow">{post.format}</span>
              <span className={`badge-pill badge-${post.status.toLowerCase()}`}>
                {isPublished ? (
                  <>
                    <IconCheck size={11} /> Publicado
                  </>
                ) : (
                  post.status
                )}
              </span>
            </div>
            <h2>{post.topic}</h2>
          </div>

          <button className="modal-close" onClick={onClose} title="Fechar">
            <IconX size={18} />
          </button>
        </div>

        {/* BANNER DE PUBLICAÇÃO EM ANDAMENTO */}
        {isPublishing && (
          <div
            style={{
              padding: "12px 18px",
              margin: "0 24px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              color: "#38bdf8",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IconLoader className="spin" size={14} />
              <span>{publishingTask?.statusMessage || "Publicando mídia na Meta Graph API..."}</span>
            </div>
            <span style={{ fontWeight: "700" }}>{publishingTask?.progress || 40}%</span>
          </div>
        )}

        {/* BANNER DE RENDERIZAÇÃO DE VÍDEO EM ANDAMENTO */}
        {isVideoGenerating && (
          <div
            style={{
              padding: "12px 18px",
              margin: "0 24px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(56, 189, 248, 0.15))",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#c084fc",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <IconLoader className="spin" size={14} />
              <span>{videoTask?.statusMessage || "Gerando código e renderizando vídeo com IA..."}</span>
            </div>
            <span style={{ fontWeight: "700" }}>{videoTask?.progress || 50}%</span>
          </div>
        )}

        {/* NOTIFICAÇÃO / TOAST DENTRO DO MODAL */}
        {notification && (
          <div
            style={{
              padding: "12px 18px",
              margin: "0 24px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background:
                notification.type === "success"
                  ? "rgba(16, 185, 129, 0.15)"
                  : notification.type === "error"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(59, 130, 246, 0.15)",
              border:
                notification.type === "success"
                  ? "1px solid rgba(16, 185, 129, 0.4)"
                  : notification.type === "error"
                  ? "1px solid rgba(239, 68, 68, 0.4)"
                  : "1px solid rgba(59, 130, 246, 0.4)",
              color:
                notification.type === "success"
                  ? "#34d399"
                  : notification.type === "error"
                  ? "#f87171"
                  : "#60a5fa",
            }}
          >
            {notification.type === "info" && <IconLoader size={14} />}
            {notification.type === "success" && <IconCheck size={14} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* BANNER DE AGENDAMENTO EDITORIAL E STATUS DE ATRASO */}
        {timingInfo && slot && (
          <div
            style={{
              margin: "0 24px 16px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: timingInfo.isOverdue
                ? "rgba(239, 68, 68, 0.12)"
                : timingInfo.isDueNow
                ? "rgba(56, 189, 248, 0.15)"
                : isPublished
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(255, 255, 255, 0.04)",
              border: `1px solid ${
                timingInfo.isOverdue
                  ? "rgba(239, 68, 68, 0.35)"
                  : timingInfo.isDueNow
                  ? "rgba(56, 189, 248, 0.4)"
                  : isPublished
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(255, 255, 255, 0.1)"
              }`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: timingInfo.statusColor, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  {timingInfo.isOverdue ? (
                    <>
                      <IconAlertTriangle size={12} color={timingInfo.statusColor} />
                      <span>Publicação em Atraso</span>
                    </>
                  ) : timingInfo.isDueNow ? (
                    <>
                      <IconClock size={12} />
                      <span>Horário de Publicação Atingido</span>
                    </>
                  ) : isPublished ? (
                    <>
                      <IconCheck size={12} color="#34d399" />
                      <span>Publicado com Sucesso</span>
                    </>
                  ) : (
                    <>
                      <IconClock size={12} />
                      <span>Cronograma Editorial</span>
                    </>
                  )}
                </span>
                {slot.editorialPillar && (
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(147, 51, 234, 0.15)", color: "#c084fc", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <IconTag size={10} color="#c084fc" />
                    <span>{slot.editorialPillar}</span>
                  </span>
                )}
              </div>

              <div style={{ fontSize: "12px", color: "#e4e4e7" }}>
                Programado para: <strong>{slot.dayOfWeek} às {slot.timeSlot}</strong>
                {timingInfo.isOverdue && (
                  <span style={{ color: "#f87171", marginLeft: "6px" }}>
                    (Era para ter sido postado {slot.dayOfWeek} às {slot.timeSlot})
                  </span>
                )}
              </div>
            </div>

            {!isPublished && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="primary-button"
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  background: timingInfo.isOverdue ? "#ea580c" : undefined,
                  borderColor: timingInfo.isOverdue ? "#f97316" : undefined,
                  opacity: isPublishing ? 0.7 : 1,
                  cursor: isPublishing ? "not-allowed" : "pointer",
                }}
              >
                {isPublishing ? <IconLoader size={12} /> : null}
                <span>{isPublishing ? "Publicando..." : timingInfo.isOverdue ? "Publicar Agora Mesmo" : "Publicar no Instagram"}</span>
              </button>
            )}
          </div>
        )}

        {/* BANNER INFORMATIVO PARA STORIES INTERATIVOS (CAIXINHA / QUIZ) */}
        {isStory && (
          <div
            style={{
              margin: "0 24px 16px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "rgba(147, 51, 234, 0.12)",
              border: "1px solid rgba(147, 51, 234, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
              <IconTag size={16} color="#c084fc" />
              <div>
                <strong style={{ color: "#c084fc", fontSize: "12px", display: "block" }}>
                  Story Interativo (Caixinha de Perguntas / Quiz)
                </strong>
                <span style={{ fontSize: "11px", color: "#d4d4d8" }}>
                  A API do Instagram não suporta a criação de caixinhas ou enquetes automáticas. Baixe a arte para o celular e aplique o sticker de caixinha/quiz diretamente no aplicativo.
                </span>
              </div>
            </div>

            {!isPublished && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: "11px", padding: "6px 12px", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.4)", display: "inline-flex", alignItems: "center", gap: "5px" }}
                onClick={async () => {
                  try {
                    if (window.electronAPI?.setPostStatus) {
                      await window.electronAPI.setPostStatus(localPost.id, "PUBLISHED");
                    }
                    if (slot && window.electronAPI?.saveScheduleSlot) {
                      await window.electronAPI.saveScheduleSlot({ ...slot, status: "PUBLISHED" });
                    }
                    setLocalPost((prev) => ({ ...prev, status: "PUBLISHED" }));
                    setNotification({ type: "success", message: "Story marcado como publicado no Instagram com sucesso!" });
                  } catch (err) {
                    setNotification({ type: "error", message: "Erro ao atualizar status." });
                  }
                }}
              >
                <IconCheck size={12} />
                <span>Marcar como Publicado no App</span>
              </button>
            )}
          </div>
        )}

        <div className="modal-content">
          <div className="slide-preview" style={{ position: "relative", display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* SELETOR DE MÍDIA PARA REELS (VÍDEO MP4 VS ARTES) */}
            {isReel && (
              <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                <button
                  type="button"
                  onClick={() => setMediaTab("video")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: mediaTab === "video" ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${mediaTab === "video" ? "rgba(56, 189, 248, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                    color: mediaTab === "video" ? "#38bdf8" : "#94a3b8",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  <IconPlay size={13} />
                  <span>Vídeo Reels MP4</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMediaTab("slides")}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background: mediaTab === "slides" ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${mediaTab === "slides" ? "rgba(168, 85, 247, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
                    color: mediaTab === "slides" ? "#c084fc" : "#94a3b8",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                  }}
                >
                  <IconLayers size={13} />
                  <span>Capa & Artes ({post.slides.length})</span>
                </button>
              </div>
            )}

            {/* PLAYER DE VÍDEO COMPLETO INTERATIVO COM PLAY/PAUSE/SEEKING */}
            {isReel && mediaTab === "video" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {isVideoGenerating ? (
                  <div
                    style={{
                      padding: "48px 24px",
                      borderRadius: "12px",
                      border: "1px solid rgba(168, 85, 247, 0.4)",
                      background: "linear-gradient(135deg, #090d16 0%, #170d24 50%, #090d16 100%)",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "14px",
                      boxShadow: "0 0 30px rgba(168, 85, 247, 0.15)",
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        background: "rgba(168, 85, 247, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#c084fc",
                      }}
                    >
                      <IconLoader className="spin" size={26} />
                    </div>
                    <strong style={{ fontSize: "15px", color: "#f8fafc" }}>
                      {videoTask?.statusMessage || "Gerando código e renderizando vídeo Reels com IA..."}
                    </strong>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: "320px",
                        height: "6px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "999px",
                        overflow: "hidden",
                        marginTop: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: `${videoTask?.progress || 45}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, #38bdf8, #a855f7)",
                          borderRadius: "999px",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                      Sintetizando voz neural, animando digitação no VS Code e sincronizando legendas Whisper...
                    </p>
                  </div>
                ) : post.videoUrl ? (
                  <div
                    style={{
                      position: "relative",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      background: "#05070c",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
                    }}
                  >
                    <video
                      key={`${post.videoUrl}-${cacheBuster}`}
                      src={post.videoUrl}
                      controls
                      playsInline
                      style={{
                        width: "100%",
                        maxHeight: "440px",
                        borderRadius: "12px",
                        display: "block",
                        background: "#000",
                      }}
                    />
                    <div
                      style={{
                        padding: "8px 12px",
                        background: "rgba(15, 23, 42, 0.95)",
                        borderTop: "1px solid rgba(56, 189, 248, 0.2)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "11px",
                        color: "#94a3b8",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: "700" }}>
                        <IconPlay size={12} />
                        <span>Vídeo 9:16 (1080x1920 MP4)</span>
                      </div>
                      {post.audioUrl && (
                        <span style={{ color: "#a855f7", fontWeight: "700" }}>Locução ElevenLabs / Edge TTS</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "40px 24px",
                      borderRadius: "12px",
                      border: "1px dashed rgba(56, 189, 248, 0.3)",
                      background: "rgba(9, 13, 22, 0.6)",
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "rgba(56, 189, 248, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#38bdf8",
                      }}
                    >
                      <IconPlay size={20} />
                    </div>
                    <strong style={{ fontSize: "14px", color: "#f8fafc" }}>Nenhum Vídeo Renderizado Ainda</strong>
                    <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0, maxWidth: "280px" }}>
                      Gere a locução neural e a animação de código em formato vertical 9:16 com um clique.
                    </p>
                  </div>
                )}

                {/* BOTÃO PRINCIPAL: REGERAR VÍDEO COM IA */}
                <button
                  type="button"
                  onClick={handleRegenerateVideo}
                  disabled={isVideoGenerating}
                  className="primary-button"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    fontSize: "12px",
                    fontWeight: "700",
                    background: "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(168, 85, 247, 0.25))",
                    borderColor: "#38bdf8",
                    color: "#38bdf8",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: isVideoGenerating ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 15px rgba(56, 189, 248, 0.15)",
                  }}
                  title="Refazer a locução neural e renderizar novamente o vídeo Reels MP4 com animação de código"
                >
                  {isVideoGenerating ? <IconLoader className="spin" size={14} /> : <IconSparkles size={14} />}
                  <span>{isVideoGenerating ? "Renderizando Vídeo com IA..." : post.videoUrl ? "Regerar Vídeo com IA" : "Gerar Vídeo Reels com IA Agora"}</span>
                </button>

                {post.videoUrl && !isVideoGenerating && (
                  <button
                    type="button"
                    onClick={() => {
                      if (post.videoUrl) {
                        const cleanPath = post.videoUrl.replace(/^media:\/\/(local\/)?/, "");
                        window.electronAPI?.openExternal?.(cleanPath);
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "4px 8px",
                    }}
                    title="Abrir o arquivo no reprodutor de vídeo do seu computador"
                  >
                    <IconArrowUpRight size={11} />
                    <span>Abrir no Player Externo do Windows</span>
                  </button>
                )}
              </div>
            ) : (
              /* PREVIEW DE IMAGENS DO SLIDE / CAPA */
              <>
                {isSlideRegenerating ? (
                  <div
                    className={`slide-frame-container ${isVerticalMedia ? "is-vertical" : "is-standard"}`}
                    style={{
                      background: "linear-gradient(135deg, #090d16 0%, #0f172a 50%, #090d16 100%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "24px",
                      textAlign: "center",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      boxShadow: "0 0 25px rgba(56, 189, 248, 0.15)",
                    }}
                  >
                    <div
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        background: "rgba(56, 189, 248, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#38bdf8",
                        marginBottom: "16px",
                      }}
                    >
                      <IconLoader size={26} />
                    </div>
                    <div style={{ color: "#38bdf8", fontWeight: "700", fontSize: "14px", marginBottom: "6px" }}>
                      Gerando Nova Arte com IA...
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "11px", maxWidth: "230px", lineHeight: "1.4" }}>
                      {regeneratingTask?.statusMessage || `Recriando Slide ${slide.number} com Cloudflare Recraft v3 sem textos cortados.`}
                    </div>
                  </div>
                ) : slide.imagePath ? (
                  <div
                    className={`slide-frame-container ${isVerticalMedia ? "is-vertical" : "is-standard"}`}
                    style={{ cursor: "zoom-in" }}
                    onClick={() => setLightboxOpen(true)}
                    title="Clique na foto para expandir em tela cheia com zoom"
                  >
                    <img
                      src={slideImageUrl || slide.imagePath}
                      alt={slide.title}
                      key={`${slide.id}-${cacheBuster}`}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        right: "10px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        background: "rgba(0, 0, 0, 0.75)",
                        color: "#f4f4f5",
                        fontSize: "11px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      <span>Expandir Foto</span>
                    </div>
                  </div>
                ) : (
                  <div className="slide-preview-empty">
                    <IconLayers size={36} />
                    <span>Sem imagem</span>
                  </div>
                )}

                {/* BOTÕES DE AÇÃO DA ARTE */}
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  {slide.imagePath && (
                    <button
                      type="button"
                      onClick={handleDownloadSlide}
                      disabled={downloading || isSlideRegenerating}
                      style={{
                        flex: 1,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "600",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#fafafa",
                        cursor: isSlideRegenerating ? "not-allowed" : "pointer",
                      }}
                      title="Salvar esta arte no seu computador para editar ou postar com caixinha no celular"
                    >
                      {downloading ? <IconLoader size={13} /> : <IconDownload size={13} />}
                      <span>{downloading ? "Baixando..." : `Baixar Slide ${slide.number}`}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleRegenerateButtonClick}
                    disabled={isSlideRegenerating}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      background: isSlideRegenerating ? "rgba(56, 189, 248, 0.25)" : "rgba(56, 189, 248, 0.15)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      color: "#38bdf8",
                      cursor: isSlideRegenerating ? "not-allowed" : "pointer",
                    }}
                    title={`Gerar uma nova arte apenas para o Slide ${slide.number} de ${localPost.slides.length} usando Cloudflare Recraft AI`}
                  >
                    {isSlideRegenerating ? <IconLoader size={13} /> : <IconRotateCcw size={13} />}
                    <span>
                      {isSlideRegenerating
                        ? "Refazendo..."
                        : (isReel || isStory) && slide.number === 1
                        ? "Refazer Capa com IA"
                        : `Refazer Slide ${slide.number} com IA`}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleRequestFeedbackForSlide(slide.number)}
                  disabled={isSlideRegenerating}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    background: "rgba(56, 189, 248, 0.05)",
                    border: "1px dashed rgba(56, 189, 248, 0.3)",
                    color: "#94a3b8",
                    fontSize: "11px",
                    cursor: isSlideRegenerating ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "5px",
                    transition: "all 0.15s",
                  }}
                  title="Abrir formulário de feedback para instruir a IA sobre correções específicas na imagem"
                >
                  <span>Ajustar Detalhes com IA (Dizer o que mudar)</span>
                </button>

                {isSlideRegenerating && (
                  <div
                    style={{
                      marginTop: "6px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "rgba(56, 189, 248, 0.08)",
                      border: "1px solid rgba(56, 189, 248, 0.25)",
                      fontSize: "11px",
                      color: "#38bdf8",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <IconLoader size={13} />
                    <span>{regeneratingTask?.statusMessage || `Gerando nova arte para o Slide ${slide.number} em segundo plano...`}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="slide-info">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="slide-counter">
                SLIDE {String(currentSlide + 1).padStart(2, "0")} / {String(post.slides.length).padStart(2, "0")}
              </div>

              <button
                type="button"
                onClick={handleCopyCaption}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: copiedCaption ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${copiedCaption ? "#10b981" : "rgba(255, 255, 255, 0.1)"}`,
                  color: copiedCaption ? "#34d399" : "#a1a1aa",
                  cursor: "pointer",
                }}
                title="Copiar texto editorial completo do slide para a área de transferência"
              >
                {copiedCaption ? <IconCheck size={12} /> : <IconCopy size={12} />}
                <span>{copiedCaption ? "Copiado!" : "Copiar Legenda Completa"}</span>
              </button>
            </div>

            <div className="slide-content-block" style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase" }}>
                  CONTEÚDO DO SLIDE
                </span>
                {!editingSlideText ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTitle(slide.title || "");
                      setEditText(slide.text || "");
                      setEditingSlideText(true);
                    }}
                    style={{
                      background: "rgba(56, 189, 248, 0.1)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      color: "#38bdf8",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Editar título e texto deste slide e recompor a tipografia instantaneamente sem gastar tokens"
                  >
                    <IconEdit size={12} />
                    <span>Ajustar Texto (Instantâneo)</span>
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setEditingSlideText(false)}
                      disabled={savingSlideText}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#a1a1aa",
                        fontSize: "11px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSlideText}
                      disabled={savingSlideText}
                      style={{
                        background: "linear-gradient(135deg, #0284c7, #0369a1)",
                        border: "1px solid #38bdf8",
                        color: "#ffffff",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        cursor: savingSlideText ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {savingSlideText ? <IconLoader className="spin" size={11} /> : <IconCheck size={11} />}
                      <span>{savingSlideText ? "Recompondo..." : "Salvar & Recompor"}</span>
                    </button>
                  </div>
                )}
              </div>

              {editingSlideText ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "3px" }}>Título do Slide (Badge Superior)</label>
                    <input
                      type="text"
                      className="settings-input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      style={{ width: "100%", fontSize: "12px", padding: "6px 8px" }}
                      placeholder="Ex: SLIDE 01: ARQUITETURA LIMPA"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "3px" }}>Texto / Snippet do Slide</label>
                    <textarea
                      className="settings-input"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      style={{ width: "100%", fontSize: "12px", padding: "6px 8px", fontFamily: "monospace" }}
                      placeholder="Conteúdo textual ou código do slide..."
                    />
                  </div>
                  <small style={{ color: "#38bdf8", fontSize: "10px" }}>
                    Ao salvar, a camada SVG/Sharp recria a imagem em alta fidelidade imediatamente sem refazer a geração de IA.
                  </small>
                </div>
              ) : (
                <>
                  <h4>{slide.title}</h4>
                  <p>{slide.text}</p>
                </>
              )}
            </div>

            {slide.visualDirection && (
              <div className="visual-direction">
                <span>DIREÇÃO VISUAL</span>
                <p>{slide.visualDirection}</p>
              </div>
            )}

            <div className="modal-hashtags">
              <span>LEGENDA EDITORIAL:</span>
              <p className="caption-text">{post.caption || "Sem legenda."}</p>
              <div className="hashtags-list">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="hashtag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE SLIDES / CARROSSEL */}
        {post.slides.length > 1 && (
          <div className="modal-footer">
            <button
              className="slide-nav-button"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((current) => Math.max(current - 1, 0))}
            >
              <IconChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <div className="slide-dots">
              {post.slides.map((_, index) => (
                <button
                  key={index}
                  className={`slide-dot ${index === currentSlide ? "active" : ""}`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>

            <button
              className="slide-nav-button"
              disabled={currentSlide === post.slides.length - 1}
              onClick={() => setCurrentSlide((current) => Math.min(current + 1, post.slides.length - 1))}
            >
              <span>Próximo</span>
              <IconChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="modal-actions">
          {/* LADO ESQUERDO: AÇÕES DE PUBLICAÇÃO */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", flex: "1 1 auto" }}>
            {isPublished ? (
              <>
                <button
                  type="button"
                  className="modal-action-button"
                  style={{
                    background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                    borderColor: "#38bdf8",
                    color: "#fff",
                    fontWeight: "700",
                    cursor: isPublishing ? "not-allowed" : "pointer",
                  }}
                  onClick={() => setShowRepublishDialog(true)}
                  disabled={isPublishing}
                  title="Publicar novamente no Instagram com opções de exclusão da anterior"
                >
                  {isPublishing ? <IconLoader size={13} /> : <IconRotateCcw size={13} />}
                  <span>{isPublishing ? "Processando..." : `Republicar (${post.slides.length} Slides)`}</span>
                </button>

                <button
                  type="button"
                  className="modal-action-button"
                  style={{
                    background: "linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(168, 85, 247, 0.2))",
                    borderColor: "rgba(236, 72, 153, 0.45)",
                    color: "#f472b6",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const url = post.instagramUrl || "https://www.instagram.com/syrius_tech/";
                    window.electronAPI?.openExternal?.(url);
                  }}
                  title="Abrir esta publicação diretamente no Instagram no seu navegador"
                >
                  <span>Ver no Instagram</span>
                  <IconArrowUpRight size={13} />
                </button>

                <button
                  type="button"
                  className="modal-action-button"
                  style={{
                    background: "rgba(245, 158, 11, 0.12)",
                    borderColor: "rgba(245, 158, 11, 0.4)",
                    color: "#fbbf24",
                    cursor: "pointer",
                  }}
                  onClick={handleToggleManualStatus}
                  title="Desfazer e retornar para o status de Pronto / Não Publicado"
                >
                  <IconRotateCcw size={12} />
                  <span>Desmarcar Publicado</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className={`modal-action-button publish ${isPublishing ? "publishing" : ""}`}
                  style={{
                    background: isPublishing ? "rgba(37, 99, 235, 0.5)" : "#3b82f6",
                    cursor: isPublishing ? "not-allowed" : "pointer",
                  }}
                  onClick={() => handlePublish(false)}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <>
                      <IconLoader size={13} />
                      <span>Publicando na Meta API...</span>
                    </>
                  ) : (
                    <span>Publicar no Instagram</span>
                  )}
                </button>

                {/* CONFIRMAR PUBLICAÇÃO MANUAL (EX: STORY COM CAIXINHA OU POSTADO NO CELULAR) */}
                <button
                  type="button"
                  className="modal-action-button"
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.25))",
                    borderColor: "rgba(16, 185, 129, 0.5)",
                    color: "#34d399",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                  onClick={handleToggleManualStatus}
                  title="Marcar como postado no Instagram sem enviar pela API (ideal para Stories onde você adiciona a Caixinha de Perguntas ou stickers manualmente)"
                >
                  <span>Confirmar Publicação Manual</span>
                </button>
              </>
            )}
          </div>

          {/* LADO DIREITO: EXPORTAR, EDITAR E APAGAR */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="modal-action-button"
              style={{ background: "rgba(56, 189, 248, 0.1)", borderColor: "rgba(56, 189, 248, 0.3)", color: "#38bdf8" }}
              onClick={handleExportAll}
              disabled={exportingAll || isPublishing}
              title="Exportar todas as imagens e a legenda em uma pasta no seu computador"
            >
              {exportingAll ? <IconLoader size={13} /> : <IconDownload size={13} />}
              <span>{exportingAll ? "Exportando..." : "Exportar Artes"}</span>
            </button>

            <button className="modal-action-button edit" onClick={onEdit} disabled={isPublishing}>
              <IconEdit size={13} />
              <span>Editar</span>
            </button>

            <button className="modal-action-button delete" onClick={onDelete} disabled={deleting || isPublishing}>
              {deleting ? (
                <>
                  <IconLoader size={13} />
                  <span>Apagando...</span>
                </>
              ) : (
                <>
                  <IconTrash size={13} />
                  <span>Apagar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE IMAGEM EXPANDIDA / LIGHTBOX COM ZOOM E SETAS */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        slides={post.slides}
        initialIndex={currentSlide}
        postTopic={post.topic}
        format={post.format}
      />

      {/* MODAL DE FEEDBACK INTELIGENTE (O QUE TEM DE ERRADO COM A FOTO?) */}
      {feedbackModalOpen && (
        <div
          className="post-modal-backdrop"
          style={{ zIndex: 10005, background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(6px)" }}
          onClick={() => setFeedbackModalOpen(false)}
        >
          <div
            className="post-modal"
            style={{
              maxWidth: "540px",
              padding: "26px",
              textAlign: "left",
              background: "#0c101d",
              border: "1px solid rgba(56, 189, 248, 0.35)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8), 0 0 30px rgba(56, 189, 248, 0.15)",
              borderRadius: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "rgba(56, 189, 248, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38bdf8",
                }}
              >
                <IconRotateCcw size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: "800", margin: 0, color: "#f8fafc" }}>
                  O que tem de errado com a foto?
                </h3>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                  Slide {slide.number} • A IA do Gemini reescreverá o prompt baseado na sua crítica
                </span>
              </div>
            </div>

            <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: "1.5", margin: "0 0 14px" }}>
              Diga exatamente o que deseja mudar na imagem para a IA recalcular a composição:
            </p>

            {/* SUGESTÕES RÁPIDAS */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
              {[
                "Desenvolvedor com as mãos na cabeça em desespero",
                "Aumentar margens e respiro lateral sem cortes",
                "Focar no código da tela e iluminação dramática",
                "Trocar para layout minimalista escuro",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setFeedbackText(sug)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#94a3b8",
                    fontSize: "11px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#38bdf8";
                    e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Ex: Desenvolvedor com as mãos na cabeça, encarando a tela do notebook com cara de desespero. Texto grande e chamativo centralizado na tela..."
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                background: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                color: "#f8fafc",
                fontSize: "13px",
                lineHeight: "1.5",
                resize: "vertical",
                boxSizing: "border-box",
                outline: "none",
                marginBottom: "18px",
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                  color: "#fff",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onClick={() => handleRegenerateSlideImage(feedbackText)}
              >
                <span>Corrigir Prompt e Gerar Nova Arte</span>
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: "6px 8px",
                  }}
                  onClick={() => handleRegenerateSlideImage()}
                >
                  Refazer sem feedback
                </button>

                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "12px",
                    cursor: "pointer",
                    padding: "6px 8px",
                  }}
                  onClick={() => setFeedbackModalOpen(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO DE CONFIRMAÇÃO DE REPUBLICAÇÃO COM OPÇÃO DE APAGAR ANTERIOR */}
      {showRepublishDialog && (
        <div
          className="post-modal-backdrop"
          style={{ zIndex: 10000, background: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowRepublishDialog(false)}
        >
          <div
            className="post-modal"
            style={{
              maxWidth: "480px",
              padding: "24px",
              textAlign: "left",
              background: "#0f172a",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              borderRadius: "12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(56, 189, 248, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#38bdf8",
                }}
              >
                <IconRotateCcw size={18} />
              </div>
              <h3 style={{ fontSize: "17px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                Opções de Republicação no Instagram
              </h3>
            </div>

            <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.5", marginBottom: "20px" }}>
              Este post já foi publicado anteriormente. O que você deseja fazer com a postagem anterior no seu perfil?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
                }}
                onClick={() => handlePublish({ deletePrevious: true })}
              >
                <span>Apagar Anterior & Republicar Carrossel</span>
                <span
                  style={{
                    fontSize: "10px",
                    background: "rgba(0,0,0,0.25)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                  }}
                >
                  Recomendado
                </span>
              </button>

              <button
                type="button"
                style={{
                  background: "rgba(255, 255, 255, 0.07)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => handlePublish({ deletePrevious: false })}
              >
                <span>Manter Ambos & Publicar Novo Carrossel</span>
              </button>

              <button
                type="button"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  padding: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                  textAlign: "center",
                  marginTop: "4px",
                }}
                onClick={() => setShowRepublishDialog(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
