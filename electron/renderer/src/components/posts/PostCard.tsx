import React from "react";
import { Post, ScheduleSlot } from "../../types";
import { formatDate } from "../../utils/formatters";
import { IconLayers, IconClock, IconLoader, IconArrowUpRight, IconPlay } from "../common/Icons";
import { getSlotTimingInfo } from "../../utils/scheduleTiming";
import { useActivities } from "../../context/ActivitiesContext";

interface PostCardProps {
  post: Post;
  slot?: ScheduleSlot | null;
  onOpen: () => void;
}

export function PostCard({ post, slot, onOpen }: PostCardProps) {
  const { isPostPublishing, getPostPublishingTask, isPostRegenerating, getPostRegeneratingTask } = useActivities();
  const firstSlide = post.slides[0];
  const isPublished = post.status.toUpperCase() === "PUBLISHED";
  const isPublishing = isPostPublishing(post.id);
  const isRegenerating = isPostRegenerating(post.id);
  const regeneratingTask = getPostRegeneratingTask(post.id);
  const publishingTask = getPostPublishingTask(post.id);
  const timingInfo = getSlotTimingInfo(slot, isPublished);

  return (
    <article
      className={`post-card ${isPublishing ? "post-card-publishing" : ""}`}
      onClick={onOpen}
      style={{
        border: isPublishing ? "1px solid #38bdf8" : undefined,
        boxShadow: isPublishing ? "0 0 20px rgba(56, 189, 248, 0.35)" : undefined,
        position: "relative",
      }}
    >
      <div className="post-card-cover">
        {post.videoUrl && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              background: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(56, 189, 248, 0.5)",
              color: "#38bdf8",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "10px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              backdropFilter: "blur(4px)",
              zIndex: 2,
            }}
          >
            <IconPlay size={10} />
            <span>Vídeo Reels</span>
          </div>
        )}

        {firstSlide?.imagePath ? (
          <img src={firstSlide.imagePath} alt={firstSlide.title} className="post-cover-image" />
        ) : (
          <div className="post-cover-empty">
            <IconLayers size={32} />
            <small>Sem imagem gerada</small>
          </div>
        )}

        <div className="post-cover-overlay">
          <span>
            {isPublishing
              ? `${publishingTask?.progress || 30}% concluído`
              : post.format === "SINGLE_IMAGE"
              ? "1 imagem"
              : post.format === "REEL_SCRIPT"
              ? `${post.slides.length} cenas`
              : `${post.slides.length} slides`}
          </span>
          <span>
            {isPublishing
              ? "Publicando..."
              : post.format === "SINGLE_IMAGE"
              ? "Ver post →"
              : post.format === "REEL_SCRIPT"
              ? "Ver roteiro →"
              : "Ver carrossel →"}
          </span>
        </div>
      </div>

      <div className="post-card-body">
        <div className="post-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span className="post-format">{post.format}</span>
            {post.narrativeAngle && (
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(168, 85, 247, 0.12)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  color: "#c084fc",
                }}
              >
                {post.narrativeAngle.replace("_", " ")}
              </span>
            )}
            {isPublishing ? (
              <span
                style={{
                  background: "rgba(56, 189, 248, 0.2)",
                  color: "#38bdf8",
                  border: "1px solid rgba(56, 189, 248, 0.5)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IconLoader size={11} />
                <span>Publicando...</span>
              </span>
            ) : isRegenerating ? (
              <span
                style={{
                  background: "rgba(168, 85, 247, 0.2)",
                  color: "#c084fc",
                  border: "1px solid rgba(168, 85, 247, 0.5)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IconLoader size={11} />
                <span>Refazendo Arte IA...</span>
              </span>
            ) : (
              <span className={`post-status post-status-${post.status.toLowerCase()}`}>
                {isPublished ? "Publicado" : post.status === "READY" ? "Pronto" : post.status}
              </span>
            )}

            {isPublished && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const url = post.instagramUrl || "https://www.instagram.com/syrius_tech/";
                  window.electronAPI?.openExternal?.(url);
                }}
                style={{
                  background: "linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(168, 85, 247, 0.15))",
                  border: "1px solid rgba(236, 72, 153, 0.4)",
                  color: "#f472b6",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                title="Abrir esta publicação diretamente no Instagram"
              >
                <span>Ver no Instagram</span>
                <IconArrowUpRight size={10} />
              </button>
            )}
          </div>

          {timingInfo && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "700",
                background: timingInfo.statusBg,
                color: timingInfo.statusColor,
                border: `1px solid ${timingInfo.statusBorder}`,
              }}
              title={timingInfo.isOverdue ? "Post pronto que já passou do horário planejado" : "Horário programado"}
            >
              <IconClock size={10} />
              <span>{timingInfo.formattedTiming}</span>
            </span>
          )}
        </div>

        <h3>{post.topic}</h3>

        {post.caption && <p className="post-caption">{post.caption}</p>}

        {post.hashtags.length > 0 && (
          <div className="post-hashtags">
            {post.hashtags.map((hashtag) => (
              <span key={hashtag} className="hashtag">
                {hashtag}
              </span>
            ))}
          </div>
        )}

        <div className="post-meta">
          <span>
            {post.format === "SINGLE_IMAGE"
              ? "Post Solo"
              : post.format === "REEL_SCRIPT"
              ? `${post.slides.length} cenas (Reels)`
              : `${post.slides.length} slides`}
          </span>
          <span>{formatDate(post.createdAt)}</span>
        </div>
      </div>
    </article>
  );
}
