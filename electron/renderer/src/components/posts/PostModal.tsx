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
} from "../common/Icons";
import { ImageLightboxModal } from "../common/ImageLightboxModal";
import { getSlotTimingInfo } from "../../utils/scheduleTiming";

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const isPublished = post.status.toUpperCase() === "PUBLISHED";
  const timingInfo = getSlotTimingInfo(slot, isPublished);
  const slide = post.slides[currentSlide];

  useEffect(() => {
    setCurrentSlide(0);
    setNotification(null);
  }, [post.id]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setCurrentSlide((current) => Math.min(current + 1, post.slides.length - 1));
      }
      if (event.key === "ArrowLeft") {
        setCurrentSlide((current) => Math.max(current - 1, 0));
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, post.slides.length]);

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
          message: `✅ Exportadas ${res.count || 0} artes e o arquivo 'legenda.txt' para: ${res.path}`,
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

  async function handlePublish() {
    if (publishing || isPublished) return;

    const settings = await window.electronAPI?.getSettings?.();
    const handleName = settings?.instagramHandle || "Instagram";

    if (
      !window.confirm(
        `Confirmar publicação no Instagram?\n\nO post "${post.topic}" será publicado imediatamente no perfil ${handleName}.`
      )
    ) {
      return;
    }

    try {
      setPublishing(true);
      setNotification({
        type: "info",
        message: "Enviando mídias para a Meta Graph API...",
      });

      const res = await window.electronAPI.publishPost(post.id);

      if (res.success) {
        const updatedPost: Post = {
          ...post,
          status: "PUBLISHED",
        };

        setNotification({
          type: "success",
          message: `🎉 Publicação realizada com sucesso no perfil ${handleName}! Media ID: ${res.publishedMediaId}`,
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
      setPublishing(false);
    }
  }

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
                onClick={handlePublishPost}
                disabled={publishing}
                className="primary-button"
                style={{
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: "700",
                  background: timingInfo.isOverdue ? "#ea580c" : undefined,
                  borderColor: timingInfo.isOverdue ? "#f97316" : undefined,
                }}
              >
                {publishing ? <IconLoader size={12} /> : null}
                <span>{publishing ? "Publicando..." : timingInfo.isOverdue ? "Publicar Agora Mesmo" : "Publicar no Instagram"}</span>
              </button>
            )}
          </div>
        )}

        <div className="modal-content">
          <div className="slide-preview" style={{ position: "relative", display: "flex", flexDirection: "column", gap: "10px" }}>
            {slide.imagePath ? (
              <div
                style={{
                  position: "relative",
                  cursor: "zoom-in",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
                onClick={() => setLightboxOpen(true)}
                title="Clique na foto para expandir em tela cheia com zoom"
              >
                <img
                  src={slide.imagePath}
                  alt={slide.title}
                  style={{
                    borderRadius: "10px",
                    maxHeight: "400px",
                    width: "100%",
                    objectFit: "contain",
                    display: "block",
                    transition: "transform 0.2s ease",
                  }}
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

            {slide.imagePath && (
              <button
                type="button"
                onClick={handleDownloadSlide}
                disabled={downloading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#fafafa",
                  cursor: "pointer",
                  width: "100%",
                }}
                title="Salvar esta arte no seu computador para editar no Photoshop/Canva ou postar com caixinha no celular"
              >
                {downloading ? <IconLoader size={13} /> : <IconDownload size={13} />}
                <span>{downloading ? "Baixando..." : `Baixar Imagem do Slide ${slide.number}`}</span>
              </button>
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
                  gap: "5px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "600",
                  background: copiedCaption ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.06)",
                  border: `1px solid ${copiedCaption ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                  color: copiedCaption ? "#34d399" : "#a1a1aa",
                  cursor: "pointer",
                }}
              >
                {copiedCaption ? <IconCheck size={11} /> : <IconCopy size={11} />}
                <span>{copiedCaption ? "Legenda Copiada!" : "Copiar Legenda Completa"}</span>
              </button>
            </div>

            <h3>{slide.title}</h3>
            <p>{slide.text}</p>

            <div className="visual-direction">
              <span>DIREÇÃO VISUAL</span>
              <p>{slide.visualDirection}</p>
            </div>

            {post.caption && (
              <div style={{ marginTop: "12px", padding: "10px", borderRadius: "8px", background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                  Legenda Editorial:
                </span>
                <p style={{ fontSize: "12px", color: "#d4d4d8", lineHeight: "1.5", margin: 0, maxHeight: "100px", overflowY: "auto" }}>
                  {post.caption}
                </p>
              </div>
            )}

            {post.hashtags.length > 0 && (
              <div className="modal-hashtags">
                <span>HASHTAGS</span>
                <div className="post-hashtags">
                  {post.hashtags.map((hashtag) => (
                    <span key={hashtag} className="hashtag">
                      {hashtag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {post.slides.length > 1 && (
          <div className="modal-footer">
            <button
              className="slide-nav-button"
              disabled={currentSlide === 0}
              onClick={() => setCurrentSlide((current) => current - 1)}
            >
              <IconChevronLeft size={14} />
              <span>Anterior</span>
            </button>

            <div className="slide-dots">
              {post.slides.map((_, index) => (
                <button
                  key={index}
                  className={index === currentSlide ? "slide-dot active" : "slide-dot"}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>

            <button
              className="slide-nav-button"
              disabled={currentSlide === post.slides.length - 1}
              onClick={() => setCurrentSlide((current) => current + 1)}
            >
              <span>Próximo</span>
              <IconChevronRight size={14} />
            </button>
          </div>
        )}

        <div className="modal-actions" style={{ flexWrap: "wrap" }}>
          {/* BOTÃO DE PUBLICAÇÃO TRAVADO SE JÁ PUBLICADO */}
          <button
            className="modal-action-button"
            style={{
              background: isPublished
                ? "rgba(16, 185, 129, 0.15)"
                : publishing
                ? "rgba(37, 99, 235, 0.5)"
                : "#2563eb",
              color: isPublished ? "#34d399" : "#fff",
              borderColor: isPublished
                ? "rgba(16, 185, 129, 0.4)"
                : publishing
                ? "rgba(37, 99, 235, 0.5)"
                : "#3b82f6",
              cursor: isPublished || publishing ? "not-allowed" : "pointer",
            }}
            onClick={handlePublish}
            disabled={publishing || isPublished}
          >
            {publishing ? (
              <>
                <IconLoader size={13} />
                <span>Publicando na Meta API...</span>
              </>
            ) : isPublished ? (
              <>
                <IconCheck size={13} />
                <span>✓ Já Publicado no Instagram</span>
              </>
            ) : (
              <>
                <span>Publicar no Instagram ↗</span>
              </>
            )}
          </button>

          {/* EXPORTAR TODAS AS ARTES + LEGENDA */}
          <button
            type="button"
            className="modal-action-button"
            style={{ background: "rgba(56, 189, 248, 0.1)", borderColor: "rgba(56, 189, 248, 0.3)", color: "#38bdf8" }}
            onClick={handleExportAll}
            disabled={exportingAll || publishing}
            title="Exportar todas as imagens e a legenda em uma pasta no seu computador"
          >
            {exportingAll ? <IconLoader size={13} /> : <IconDownload size={13} />}
            <span>{exportingAll ? "Exportando..." : "Exportar Todas as Artes + Legenda"}</span>
          </button>

          <button className="modal-action-button edit" onClick={onEdit} disabled={publishing}>
            <IconEdit size={13} />
            <span>Editar</span>
          </button>

          <button className="modal-action-button delete" onClick={onDelete} disabled={deleting || publishing}>
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

      {/* MODAL DE IMAGEM EXPANDIDA / LIGHTBOX COM ZOOM E SETAS */}
      <ImageLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        slides={post.slides}
        initialIndex={currentSlide}
        postTopic={post.topic}
        format={post.format}
      />
    </div>
  );
}
