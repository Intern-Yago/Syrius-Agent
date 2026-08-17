import React, { useState } from "react";
import { Post, UpdatePostData } from "../../types";
import { IconX, IconLoader, IconCheck } from "../common/Icons";

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSave: (postId: string, data: UpdatePostData) => Promise<void>;
}

export function EditPostModal({ post, onClose, onSave }: EditPostModalProps) {
  const [topic, setTopic] = useState(post.topic);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);

      const parsedHashtags = hashtags
        .split(/[\s,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

      await onSave(post.id, {
        topic,
        caption,
        hashtags: parsedHashtags,
      });
    } catch (err) {
      console.error("Erro ao atualizar post:", err);
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="post-modal-backdrop" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">{post.format}</span>
            <h2>Editar Publicação</h2>
          </div>

          <button className="modal-close" onClick={onClose} disabled={saving} title="Fechar">
            <IconX size={18} />
          </button>
        </div>

        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label">
              <span>Tema da Publicação</span>
            </label>
            <input
              className="form-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Tema ou título do post"
              disabled={saving}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <span>Legenda do Post</span>
            </label>
            <textarea
              className="form-textarea"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Texto explicativo e legenda técnica da publicação"
              rows={6}
              disabled={saving}
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <span>Hashtags</span>
            </label>
            <input
              className="form-input"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#docker #typescript #devops #backend"
              disabled={saving}
            />
            <small>Separe as hashtags por espaço ou vírgula.</small>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="edit-actions">
            <button type="button" className="btn-modal-cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-save" disabled={saving || !topic.trim()}>
              {saving ? (
                <>
                  <IconLoader size={13} />
                  <span>Salvando alterações...</span>
                </>
              ) : (
                <>
                  <IconCheck size={14} />
                  <span>Salvar Publicação</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
