import React from "react";
import { Post, ScheduleSlot } from "../../types";
import { formatDate } from "../../utils/formatters";
import { IconLayers, IconClock } from "../common/Icons";
import { getSlotTimingInfo } from "../../utils/scheduleTiming";

interface PostCardProps {
  post: Post;
  slot?: ScheduleSlot | null;
  onOpen: () => void;
}

export function PostCard({ post, slot, onOpen }: PostCardProps) {
  const firstSlide = post.slides[0];
  const isPublished = post.status.toUpperCase() === "PUBLISHED";
  const timingInfo = getSlotTimingInfo(slot, isPublished);

  return (
    <article className="post-card" onClick={onOpen}>
      <div className="post-card-cover">
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
            {post.format === "SINGLE_IMAGE"
              ? "1 imagem"
              : post.format === "REEL_SCRIPT"
              ? `${post.slides.length} cenas`
              : `${post.slides.length} slides`}
          </span>
          <span>
            {post.format === "SINGLE_IMAGE"
              ? "Ver post →"
              : post.format === "REEL_SCRIPT"
              ? "Ver roteiro →"
              : "Ver carrossel →"}
          </span>
        </div>
      </div>

      <div className="post-card-body">
        <div className="post-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="post-format">{post.format}</span>
            <span className={`post-status post-status-${post.status.toLowerCase()}`}>
              {isPublished ? "Publicado" : post.status === "READY" ? "Pronto" : post.status}
            </span>
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
