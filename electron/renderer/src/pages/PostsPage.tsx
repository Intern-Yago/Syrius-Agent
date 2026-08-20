import React, { useState, useEffect, useMemo } from "react";
import { Post, UpdatePostData, ScheduleSlot } from "../types";
import { PostCard } from "../components/posts/PostCard";
import { PostModal } from "../components/posts/PostModal";
import { EditPostModal } from "../components/posts/EditPostModal";
import {
  IconLayers,
  IconLoader,
  IconRotateCcw,
  IconChevronLeft,
  IconChevronRight,
  IconActivity,
  IconArrowUpRight,
  IconSearch,
  IconX,
  IconCalendar,
  IconFilter,
} from "../components/common/Icons";
import { useActivities } from "../context/ActivitiesContext";
import { useModal } from "../context/ModalContext";
import { getSlotTimingInfo } from "../utils/scheduleTiming";

interface PostsPageProps {
  initialPostId?: string | null;
  onNavigateToActivities?: () => void;
  onOpenRepoToPost?: () => void;
  onOpenExperiments?: () => void;
}

export function PostsPage({
  initialPostId,
  onNavigateToActivities,
  onOpenRepoToPost,
  onOpenExperiments,
}: PostsPageProps) {
  const { activities, activeCount } = useActivities();
  const { showConfirm, toast } = useModal();
  const [posts, setPosts] = useState<Post[]>([]);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const POSTS_PER_PAGE = 6;

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formatFilter, setFormatFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "slides_desc" | "topic_asc">("newest");

  const activePublishingTasks = activities.filter(
    (a) => a.type === "publishing" && (a.status === "running" || a.status === "paused")
  );

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

      if (initialPostId) {
        const match = result.find((p) => p.id === initialPostId);
        if (match) setSelectedPost(match);
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
        (s.postId && s.postId === post.id) ||
        (post.slotId && post.slotId === s.id) ||
        (s.topic && post.topic && s.topic.trim().toLowerCase() === post.topic.trim().toLowerCase()) ||
        (post.topic && s.topic && post.topic.toLowerCase().includes(s.topic.toLowerCase())) ||
        (s.topic && post.topic && s.topic.toLowerCase().includes(post.topic.toLowerCase()))
    );
  }

  function isPostOverdue(post: Post): boolean {
    if (post.status.toUpperCase() === "PUBLISHED") return false;
    const matchingSlot = getMatchingSlot(post);
    if (!matchingSlot) return false;
    const timing = getSlotTimingInfo(matchingSlot, false);
    return Boolean(timing?.isOverdue);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  // Filtragem e ordenação computada
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // 1. Busca por Texto (Topic, Caption, Hashtags, Conteúdo dos Slides)
    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      result = result.filter((post) => {
        const inTopic = post.topic?.toLowerCase().includes(query);
        const inCaption = post.caption?.toLowerCase().includes(query);
        const inHashtags = post.hashtags?.some((h) => h.toLowerCase().includes(query));
        const inSlides = post.slides?.some(
          (s) => s.title?.toLowerCase().includes(query) || s.text?.toLowerCase().includes(query)
        );
        return inTopic || inCaption || inHashtags || inSlides;
      });
    }

    // 2. Filtro por Data Inicial (Desde)
    if (startDate) {
      const start = new Date(startDate + "T00:00:00");
      result = result.filter((post) => new Date(post.createdAt) >= start);
    }

    // 3. Filtro por Data Final (Até)
    if (endDate) {
      const end = new Date(endDate + "T23:59:59");
      result = result.filter((post) => new Date(post.createdAt) <= end);
    }

    // 4. Filtro por Formato
    if (formatFilter !== "ALL") {
      result = result.filter((post) => post.format === formatFilter);
    }

    // 5. Filtro por Status
    if (statusFilter === "OVERDUE") {
      result = result.filter(isPostOverdue);
    } else if (statusFilter !== "ALL") {
      result = result.filter((post) => post.status.toUpperCase() === statusFilter);
    }

    // 6. Ordenação
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "slides_desc") {
        return b.slides.length - a.slides.length;
      }
      if (sortBy === "topic_asc") {
        return a.topic.localeCompare(b.topic);
      }
      return 0;
    });

    return result;
  }, [posts, searchTerm, startDate, endDate, formatFilter, statusFilter, sortBy]);

  // Reseta para página 1 ao mudar qualquer filtro
  useEffect(() => {
    setCurrentPageNum(1);
  }, [searchTerm, startDate, endDate, formatFilter, statusFilter, sortBy]);

  const isFiltered = Boolean(
    searchTerm.trim() ||
      startDate ||
      endDate ||
      formatFilter !== "ALL" ||
      statusFilter !== "ALL" ||
      sortBy !== "newest"
  );

  function handleClearFilters() {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setFormatFilter("ALL");
    setStatusFilter("ALL");
    setSortBy("newest");
    setCurrentPageNum(1);
  }

  async function handleDeletePost(post: Post) {
    if (deletingPost) return;

    const confirmed = await showConfirm({
      title: "Apagar Publicação",
      message: `Tem certeza que deseja apagar o post "${post.topic}"?\n\nEssa ação removerá os slides e dados vinculados do banco de dados permanentemente.`,
      confirmText: "Apagar Post",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      setDeletingPost(true);
      await window.electronAPI.deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setSelectedPost(null);
      toast.success("Publicação apagada com sucesso.");
    } catch (err) {
      console.error("Erro ao apagar post:", err);
      toast.error(err instanceof Error ? err.message : "Não foi possível apagar o post.");
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {onOpenRepoToPost && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenRepoToPost}
              style={{
                borderColor: "rgba(56, 189, 248, 0.35)",
                color: "#38bdf8",
                fontSize: "12px",
                padding: "8px 14px",
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
                fontSize: "12px",
                padding: "8px 14px",
              }}
              title="Laboratório de Testes A/B de Capas e Ganchos"
            >
              <span>Testes A/B</span>
            </button>
          )}

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
      </div>

      {/* BANNER DE ATIVIDADES EM ANDAMENTO */}
      {activeCount > 0 && (
        <div
          style={{
            margin: "0 0 20px 0",
            padding: "12px 18px",
            borderRadius: "10px",
            background: "linear-gradient(90deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.05) 100%)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            boxShadow: "0 0 20px rgba(56, 189, 248, 0.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconLoader size={14} />
            </span>

            <div>
              <strong style={{ fontSize: "13px", color: "#38bdf8", display: "block" }}>
                {activePublishingTasks.length > 0
                  ? `Publicando "${activePublishingTasks[0].subtitle || "post"}" no Instagram (${activePublishingTasks[0].progress}%)`
                  : `${activities[0]?.title || "Atividade em andamento"}: ${activities[0]?.statusMessage || "Processando..."}`}
              </strong>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                {activeCount === 1 ? "1 processo ativo em background" : `${activeCount} processos ativos em background`}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {onOpenRepoToPost && (
              <button
                type="button"
                className="secondary-button"
                onClick={onOpenRepoToPost}
                style={{
                  borderColor: "rgba(56, 189, 248, 0.35)",
                  color: "#38bdf8",
                  fontSize: "11px",
                  padding: "6px 12px",
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
                  fontSize: "11px",
                  padding: "6px 12px",
                }}
                title="Laboratório de Testes A/B de Capas e Ganchos"
              >
                <span>Testes A/B</span>
              </button>
            )}

            {onNavigateToActivities && (
              <button
                type="button"
                className="secondary-button"
                onClick={onNavigateToActivities}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", padding: "6px 12px" }}
              >
                <IconActivity size={13} color="#38bdf8" />
                <span>Ver Central de Atividades</span>
                <IconArrowUpRight size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* BARRA DE PESQUISA, FILTROS E DATAS */}
      {!loading && !error && posts.length > 0 && (
        <div
          style={{
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* LINHA 1: CAMPO DE BUSCA + DATAS + ORDENAÇÃO */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            {/* CAMPO DE BUSCA TEXTUAL */}
            <div
              style={{
                flex: "1 1 300px",
                position: "relative",
                display: "flex",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: "12px",
                  color: "#71717a",
                  display: "flex",
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                <IconSearch size={15} />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por tema, legenda, hashtag ou slide..."
                style={{
                  width: "100%",
                  padding: "9px 34px 9px 36px",
                  borderRadius: "8px",
                  background: "rgba(0, 0, 0, 0.5)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#fafafa",
                  fontSize: "12px",
                  outline: "none",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#38bdf8")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(255, 255, 255, 0.12)")}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    background: "transparent",
                    border: "none",
                    color: "#a1a1aa",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Limpar busca"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>

            {/* SELETORES DE DATA (DESDE / ATÉ) */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "4px 10px",
                }}
              >
                <IconCalendar size={13} color="#a1a1aa" />
                <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Desde:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#fafafa",
                    fontSize: "11px",
                    outline: "none",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "8px",
                  padding: "4px 10px",
                }}
              >
                <IconCalendar size={13} color="#a1a1aa" />
                <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#fafafa",
                    fontSize: "11px",
                    outline: "none",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                />
              </div>
            </div>

            {/* ORDENAÇÃO */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                padding: "6px 10px",
              }}
            >
              <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "600" }}>Ordem:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#fafafa",
                  fontSize: "11px",
                  fontWeight: "600",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="newest" style={{ background: "#18181b", color: "#fafafa" }}>Mais Recentes</option>
                <option value="oldest" style={{ background: "#18181b", color: "#fafafa" }}>Mais Antigos</option>
                <option value="slides_desc" style={{ background: "#18181b", color: "#fafafa" }}>Mais Slides</option>
                <option value="topic_asc" style={{ background: "#18181b", color: "#fafafa" }}>Alfabética (A-Z)</option>
              </select>
            </div>
          </div>

          {/* LINHA 2: CHIPS DE FORMATO + CHIPS DE STATUS + CONTADOR & LIMPAR */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
              paddingTop: "10px",
              borderTop: "1px solid rgba(255, 255, 255, 0.05)",
            }}
          >
            {/* CHIPS DE FORMATO E STATUS */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", marginRight: "2px" }}>
                Formato:
              </span>
              {[
                { id: "ALL", label: `Todos` },
                { id: "CAROUSEL", label: `Carrossel (${posts.filter((p) => p.format === "CAROUSEL").length})` },
                { id: "SINGLE_IMAGE", label: `Post Solo (${posts.filter((p) => p.format === "SINGLE_IMAGE").length})` },
                { id: "REEL_SCRIPT", label: `Reels (${posts.filter((p) => p.format === "REEL_SCRIPT").length})` },
                { id: "STORY_PHOTO", label: `Stories (${posts.filter((p) => p.format === "STORY_PHOTO" || p.format === "STORIES").length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`filter-btn ${formatFilter === f.id ? "active" : ""}`}
                  onClick={() => setFormatFilter(f.id)}
                  style={{ fontSize: "11px", padding: "3px 10px" }}
                >
                  {f.label}
                </button>
              ))}

              <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", marginLeft: "8px", marginRight: "2px" }}>
                Status:
              </span>
              {[
                { id: "ALL", label: `Todos` },
                { id: "PUBLISHED", label: `Publicados (${posts.filter((p) => p.status.toUpperCase() === "PUBLISHED").length})` },
                { id: "READY", label: `Prontos (${posts.filter((p) => p.status.toUpperCase() === "READY").length})` },
                { id: "OVERDUE", label: `Atrasados (${posts.filter(isPostOverdue).length})`, isDanger: true },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`filter-btn ${statusFilter === s.id ? "active" : ""}`}
                  onClick={() => setStatusFilter(s.id)}
                  style={{
                    fontSize: "11px",
                    padding: "3px 10px",
                    borderColor: s.isDanger && statusFilter === s.id ? "rgba(239, 68, 68, 0.6)" : undefined,
                    background: s.isDanger && statusFilter === s.id ? "rgba(239, 68, 68, 0.2)" : undefined,
                    color: s.isDanger && statusFilter !== s.id ? "#f87171" : undefined,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* CONTADOR DE ITENS E BOTÃO LIMPAR */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                Exibindo <strong style={{ color: "#fafafa" }}>{filteredPosts.length}</strong> de {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>

              {isFiltered && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    color: "#f87171",
                    fontSize: "11px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <IconX size={11} />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {!loading && !error && posts.length > 0 && filteredPosts.length === 0 && (
        <div className="page-placeholder" style={{ padding: "60px 20px" }}>
          <div className="placeholder-icon">
            <IconSearch size={24} />
          </div>
          <h2>Nenhuma publicação encontrada</h2>
          <p>Nenhum post corresponde aos termos de busca ou filtros selecionados.</p>
          <button className="primary-button" onClick={handleClearFilters} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <IconX size={13} />
            <span>Limpar Todos os Filtros</span>
          </button>
        </div>
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <div className="posts-container">
          <div className="posts-grid">
            {filteredPosts
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

          {Math.ceil(filteredPosts.length / POSTS_PER_PAGE) > 1 && (
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
                Página {currentPageNum} de {Math.ceil(filteredPosts.length / POSTS_PER_PAGE)}
              </span>

              <button
                className="slide-nav-button"
                disabled={currentPageNum === Math.ceil(filteredPosts.length / POSTS_PER_PAGE)}
                onClick={() => setCurrentPageNum((p) => Math.min(p + 1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE)))}
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
