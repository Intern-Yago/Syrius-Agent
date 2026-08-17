import React, { useState, useEffect } from "react";
import { Post, UpdatePostData, ScheduleSlot } from "../types";
import { PostCard } from "../components/posts/PostCard";
import { PostModal } from "../components/posts/PostModal";
import { EditPostModal } from "../components/posts/EditPostModal";
import { IconLayers, IconLoader, IconRotateCcw, IconChevronLeft, IconChevronRight } from "../components/common/Icons";

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const POSTS_PER_PAGE = 6;

  async function loadPosts() {
    try {
      setLoading(true);
      setError(null);
      const result = await window.electronAPI.getPosts();
      setPosts(result);

      if (window.electronAPI.getSchedule) {
        const scheduleSlots = await window.electronAPI.getSchedule();
        setSlots(scheduleSlots);
      }
    } catch (err) {
      console.error("Erro ao carregar posts:", err);
      setError(err instanceof Error ? err.message : "Não foi possível carregar os posts.");
    } finally {
      setLoading(false);
    }
  }

  function getMatchingSlot(post: Post): ScheduleSlot | undefined {
    return slots.find(
      (s) =>
        s.postId === post.id ||
        s.topic.trim().toLowerCase() === post.topic.trim().toLowerCase() ||
        post.topic.toLowerCase().includes(s.topic.toLowerCase()) ||
        s.topic.toLowerCase().includes(post.topic.toLowerCase())
    );
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleDeletePost(post: Post) {
    if (deletingPost) return;

    const confirmed = window.confirm(
      `Tem certeza que deseja apagar o post "${post.topic}"?\n\nEssa ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      setDeletingPost(true);
      await window.electronAPI.deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setSelectedPost(null);
    } catch (err) {
      console.error("Erro ao apagar post:", err);
      window.alert(err instanceof Error ? err.message : "Não foi possível apagar o post.");
    } finally {
      setDeletingPost(false);
    }
  }

  async function handleUpdatePost(postId: string, data: UpdatePostData) {
    const updatedPost = await window.electronAPI.updatePost(postId, data);
    setPosts((current) => current.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
    setSelectedPost(updatedPost);
    setEditingPost(null);
  }

  return (
    <div className="posts-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">BIBLIOTECA DE CONTEÚDO</span>
          <h2>Publicações Geradas</h2>
          <p>Explore, inspecione os slides gerados pela IA ou edite textos e legendas.</p>
        </div>

        <button className="primary-button" onClick={loadPosts} disabled={loading}>
          {loading ? (
            <>
              <IconLoader size={12} />
              <span>Carregando...</span>
            </>
          ) : (
            <>
              <IconRotateCcw size={12} />
              <span>Atualizar Lista</span>
            </>
          )}
        </button>
      </div>

      {loading && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconLoader size={24} />
          </div>
          <h2>Carregando publicações...</h2>
          <p>Consultando registros no PostgreSQL e gerando links de mídia do MinIO.</p>
        </div>
      )}

      {!loading && error && (
        <div className="page-placeholder">
          <div className="placeholder-icon">!</div>
          <h2>Erro ao carregar posts</h2>
          <p>{error}</p>
          <button className="primary-button" onClick={loadPosts}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && posts.length === 0 && (
        <div className="page-placeholder">
          <div className="placeholder-icon">
            <IconLayers size={28} />
          </div>
          <h2>Nenhuma publicação cadastrada</h2>
          <p>O agente ainda não gerou nenhuma publicação no banco. Execute o pipeline para criar o primeiro post!</p>
          <button className="primary-button" onClick={loadPosts}>
            <IconRotateCcw size={12} />
            <span>Atualizar</span>
          </button>
        </div>
      )}

      {!loading && !error && posts.length > 0 && (
        <div className="posts-container">
          <div className="posts-summary">
            <span>{posts.length} {posts.length === 1 ? "publicação registrada" : "publicações registradas"}</span>
          </div>

          <div className="posts-grid">
            {posts
              .slice((currentPageNum - 1) * POSTS_PER_PAGE, currentPageNum * POSTS_PER_PAGE)
              .map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  slot={getMatchingSlot(post)}
                  onOpen={() => setSelectedPost(post)}
                />
              ))}
          </div>

          {Math.ceil(posts.length / POSTS_PER_PAGE) > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "24px" }}>
              <button
                className="slide-nav-button"
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(p - 1, 1))}
              >
                <IconChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <span style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: "600" }}>
                Página {currentPageNum} de {Math.ceil(posts.length / POSTS_PER_PAGE)}
              </span>

              <button
                className="slide-nav-button"
                disabled={currentPageNum === Math.ceil(posts.length / POSTS_PER_PAGE)}
                onClick={() => setCurrentPageNum((p) => Math.min(p + 1, Math.ceil(posts.length / POSTS_PER_PAGE)))}
              >
                <span>Próximo</span>
                <IconChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {selectedPost && (
        <PostModal
          post={selectedPost}
          slot={getMatchingSlot(selectedPost)}
          onClose={() => setSelectedPost(null)}
          onEdit={() => setEditingPost(selectedPost)}
          onDelete={() => handleDeletePost(selectedPost)}
          onPostUpdated={(updated) => {
            setSelectedPost(updated);
            setPosts((current) =>
              current.map((p) => (p.id === updated.id ? updated : p))
            );
          }}
          deleting={deletingPost}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={handleUpdatePost}
        />
      )}
    </div>
  );
}
