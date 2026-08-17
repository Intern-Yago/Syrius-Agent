import React, { useState, useEffect } from "react";
import { CommunityInteraction } from "../types";
import {
  IconMessageSquare,
  IconSparkles,
  IconCheck,
  IconExternalLink,
  IconLoader,
  IconPlus,
  IconX,
  IconPlay,
  IconChevronLeft,
  IconChevronRight,
} from "../components/common/Icons";

interface InteractionsPageProps {
  onNavigateToSchedule?: () => void;
}

export function InteractionsPage({ onNavigateToSchedule }: InteractionsPageProps) {
  const [interactions, setInteractions] = useState<CommunityInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "UNANSWERED" | "ANSWERED" | "CONVERTED_TO_POST">("ALL");
  const [autoReply, setAutoReply] = useState(false);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [generatingReplyFor, setGeneratingReplyFor] = useState<string | null>(null);
  const [convertingToPostFor, setConvertingToPostFor] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Modal para adicionar interação manualmente
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualAuthor, setManualAuthor] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualContent, setManualContent] = useState("");
  const [manualTopic, setManualTopic] = useState("");
  const [manualFormat, setManualFormat] = useState("CAROUSEL");
  const [manualUrl, setManualUrl] = useState("");
  const [manualType, setManualType] = useState<"COMMENT" | "QUESTION_STICKER" | "DIRECT_MESSAGE">("COMMENT");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      if (window.electronAPI?.getInteractions) {
        const list = await window.electronAPI.getInteractions();
        setInteractions(list);
      }
      if (window.electronAPI?.getInteractionsAutoReply) {
        const ar = await window.electronAPI.getInteractionsAutoReply();
        setAutoReply(ar);
      }
    } catch (err) {
      console.error("Erro ao carregar interações:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAutoReply() {
    const next = !autoReply;
    setAutoReply(next);
    if (window.electronAPI?.setInteractionsAutoReply) {
      await window.electronAPI.setInteractionsAutoReply(next);
      setNotification({
        type: next ? "success" : "info",
        message: next
          ? "🤖 Auto-Resposta com IA ativada! O agente responderá novos comentários automaticamente."
          : "Auto-Resposta desativada. As respostas agora aguardam aprovação manual.",
      });
      setTimeout(() => setNotification(null), 4000);
    }
  }

  async function handleGenerateAIReply(id: string) {
    try {
      setGeneratingReplyFor(id);
      const res = await window.electronAPI.generateInteractionReply(id);
      if (res.success && res.reply) {
        setReplyDrafts((prev) => ({ ...prev, [id]: res.reply || "" }));
      } else {
        setNotification({ type: "error", message: res.error || "Erro ao gerar resposta com IA." });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Falha na chamada de IA." });
    } finally {
      setGeneratingReplyFor(null);
    }
  }

  async function handleSendReply(id: string) {
    const text = replyDrafts[id];
    if (!text || !text.trim()) {
      alert("Por favor, digite ou gere uma resposta antes de enviar.");
      return;
    }

    try {
      const res = await window.electronAPI.sendInteractionReply({
        interactionId: id,
        replyText: text.trim(),
      });

      if (res.success) {
        setInteractions((prev) =>
          prev.map((i) =>
            i.id === id
              ? { ...i, status: "ANSWERED", replyText: text.trim(), repliedAt: new Date().toISOString() }
              : i
          )
        );
        setNotification({ type: "success", message: "✅ Resposta salva e enviada com sucesso!" });
        setTimeout(() => setNotification(null), 3000);
      } else {
        setNotification({ type: "error", message: res.error || "Erro ao enviar resposta." });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Erro ao enviar resposta." });
    }
  }

  async function handleConvertToPost(id: string, preferredFormat: string = "STORY_PHOTO") {
    try {
      setConvertingToPostFor(id);
      const res = await window.electronAPI.convertInteractionToPost({
        interactionId: id,
        preferredFormat,
      });

      if (res.success && res.createdSlot) {
        setInteractions((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, status: "CONVERTED_TO_POST", convertedSlotId: res.createdSlot.id } : i
          )
        );

        setNotification({
          type: "success",
          message: `🚀 Pergunta transformada em novo slot no Cronograma: "${res.createdSlot.topic}"!`,
        });
      } else {
        setNotification({ type: "error", message: res.error || "Erro ao transformar dúvida em post." });
      }
    } catch (err) {
      setNotification({ type: "error", message: "Erro ao converter para post." });
    } finally {
      setConvertingToPostFor(null);
    }
  }

  async function handleAddManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualAuthor.trim() || !manualContent.trim()) {
      alert("Informe o @ do autor e a dúvida/comentário.");
      return;
    }

    try {
      const res = await window.electronAPI.addManualInteraction({
        authorHandle: manualAuthor.trim(),
        authorName: manualName.trim() || undefined,
        content: manualContent.trim(),
        sourcePostTopic: manualTopic.trim() || undefined,
        sourcePostFormat: manualFormat,
        sourcePostUrl: manualUrl.trim() || undefined,
        type: manualType,
      });

      if (res.success && res.interaction) {
        setInteractions((prev) => [res.interaction!, ...prev]);
        setShowAddModal(false);
        setManualAuthor("");
        setManualName("");
        setManualContent("");
        setManualTopic("");
        setManualUrl("");
        setNotification({ type: "success", message: "Interação adicionada com sucesso!" });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      alert("Erro ao adicionar interação.");
    }
  }

  const filteredInteractions = interactions.filter((item) => {
    if (filterStatus === "ALL") return true;
    return item.status === filterStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInteractions.length / ITEMS_PER_PAGE));
  const paginatedInteractions = filteredInteractions.slice(
    (currentPageNum - 1) * ITEMS_PER_PAGE,
    currentPageNum * ITEMS_PER_PAGE
  );

  const unansweredCount = interactions.filter((i) => i.status === "UNANSWERED").length;

  return (
    <div className="page-container">
      {/* HEADER DA CENTRAL */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <span className="eyebrow">COMUNIDADE & ENGAJAMENTO</span>
          <h1>Central de Interações & Respostas com IA</h1>
          <p className="page-subtitle">
            Acompanhe dúvidas e comentários recebidos nos posts, stories e DMs. Responda com autoridade ou transforme perguntas em novos conteúdos!
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {/* TOGGLE AUTO-REPLY */}
          <button
            type="button"
            onClick={handleToggleAutoReply}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              background: autoReply ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${autoReply ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
              color: autoReply ? "#34d399" : "#a1a1aa",
              cursor: "pointer",
            }}
            title="Responder automaticamente comentários novos com respostas técnicas inteligentes geradas por IA"
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: autoReply ? "#10b981" : "#71717a",
              }}
            />
            <span>{autoReply ? "Auto-Resposta com IA: ATIVA" : "Auto-Resposta com IA: Desativada"}</span>
          </button>

          <button
            className="primary-button"
            onClick={() => setShowAddModal(true)}
            style={{ padding: "8px 14px", fontSize: "12px" }}
          >
            <IconPlus size={14} />
            <span>Adicionar Dúvida / DM</span>
          </button>
        </div>
      </div>

      {/* NOTIFICAÇÃO TOAST */}
      {notification && (
        <div
          style={{
            padding: "12px 18px",
            marginBottom: "16px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
          <span>{notification.message}</span>
          {onNavigateToSchedule && notification.message.includes("Cronograma") && (
            <button
              type="button"
              onClick={onNavigateToSchedule}
              style={{
                background: "transparent",
                border: "none",
                color: "#60a5fa",
                textDecoration: "underline",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "12px",
              }}
            >
              Ver no Cronograma →
            </button>
          )}
        </div>
      )}

      {/* BARRA DE FILTROS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "12px" }}>
        <button
          className={filterStatus === "ALL" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilterStatus("ALL")}
        >
          Todas as Interações ({interactions.length})
        </button>
        <button
          className={filterStatus === "UNANSWERED" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilterStatus("UNANSWERED")}
          style={{ color: unansweredCount > 0 ? "#fbbf24" : undefined }}
        >
          Aguardando Resposta ({unansweredCount})
        </button>
        <button
          className={filterStatus === "ANSWERED" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilterStatus("ANSWERED")}
        >
          Respondidas ({interactions.filter((i) => i.status === "ANSWERED").length})
        </button>
        <button
          className={filterStatus === "CONVERTED_TO_POST" ? "filter-btn active" : "filter-btn"}
          onClick={() => setFilterStatus("CONVERTED_TO_POST")}
        >
          Transformadas em Post ({interactions.filter((i) => i.status === "CONVERTED_TO_POST").length})
        </button>
      </div>

      {loading && (
        <div className="page-placeholder">
          <IconLoader size={24} />
          <h2>Carregando interações da comunidade...</h2>
        </div>
      )}

      {!loading && filteredInteractions.length === 0 && (
        <div className="page-placeholder">
          <IconMessageSquare size={32} />
          <h2>Nenhuma interação encontrada</h2>
          <p>Nenhum comentário ou dúvida recebida corresponde ao filtro selecionado.</p>
        </div>
      )}

      {/* GRID DE CARDS DE INTERAÇÕES */}
      {!loading && filteredInteractions.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {paginatedInteractions.map((item) => {
            const isAnswered = item.status === "ANSWERED";
            const isConverted = item.status === "CONVERTED_TO_POST";
            const isGenerating = generatingReplyFor === item.id;
            const isConverting = convertingToPostFor === item.id;
            const currentDraft = replyDrafts[item.id] !== undefined ? replyDrafts[item.id] : item.replyText || "";

            return (
              <div
                key={item.id}
                className="test-module-card"
                style={{
                  borderLeft: isConverted
                    ? "3px solid #a855f7"
                    : isAnswered
                    ? "3px solid #10b981"
                    : "3px solid #f59e0b",
                  background: "rgba(24, 24, 27, 0.65)",
                }}
              >
                {/* CABEÇALHO DO CARD: ORIGEM DO POST E LINK */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "700",
                        background:
                          item.type === "QUESTION_STICKER"
                            ? "rgba(236, 72, 153, 0.15)"
                            : item.type === "DIRECT_MESSAGE"
                            ? "rgba(59, 130, 246, 0.15)"
                            : "rgba(168, 85, 247, 0.15)",
                        border:
                          item.type === "QUESTION_STICKER"
                            ? "1px solid rgba(236, 72, 153, 0.3)"
                            : item.type === "DIRECT_MESSAGE"
                            ? "1px solid rgba(59, 130, 246, 0.3)"
                            : "1px solid rgba(168, 85, 247, 0.3)",
                        color:
                          item.type === "QUESTION_STICKER"
                            ? "#f472b6"
                            : item.type === "DIRECT_MESSAGE"
                            ? "#60a5fa"
                            : "#c084fc",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.type === "QUESTION_STICKER"
                        ? "Caixa de Perguntas (Story)"
                        : item.type === "DIRECT_MESSAGE"
                        ? "Direct Message (DM)"
                        : `Comentário (${item.sourcePostFormat || "Post"})`}
                    </span>

                    {/* TÍTULO DO POST DE ORIGEM */}
                    {item.sourcePostTopic && (
                      <span style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: "600" }}>
                        no post: <strong style={{ color: "#e4e4e7" }}>"{item.sourcePostTopic}"</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* LINK CLICÁVEL DO POST NO INSTAGRAM */}
                    {item.sourcePostUrl && (
                      <a
                        href={item.sourcePostUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "11px",
                          color: "#38bdf8",
                          textDecoration: "none",
                          fontWeight: "600",
                          background: "rgba(56, 189, 248, 0.1)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(56, 189, 248, 0.2)",
                        }}
                        title="Abrir post original no Instagram"
                      >
                        <span>Ver no Instagram</span>
                        <IconExternalLink size={11} />
                      </a>
                    )}

                    <span style={{ fontSize: "11px", color: "#71717a" }}>
                      {new Date(item.receivedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* CORPO: AUTOR E COMENTÁRIO */}
                <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "13px",
                      flexShrink: 0,
                    }}
                  >
                    {item.authorHandle.replace("@", "").slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <strong style={{ fontSize: "13px", color: "#fafafa" }}>{item.authorHandle}</strong>
                      {item.authorName && (
                        <span style={{ fontSize: "12px", color: "#71717a" }}>({item.authorName})</span>
                      )}
                    </div>

                    <p style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5", margin: 0 }}>
                      "{item.content}"
                    </p>
                  </div>
                </div>

                {/* ÁREA DE RESPOSTA / STATUS */}
                {isAnswered && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      marginBottom: "12px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", fontWeight: "700", color: "#34d399", textTransform: "uppercase" }}>
                        ✓ Resposta Enviada
                      </span>
                      {item.repliedAt && (
                        <span style={{ fontSize: "10px", color: "#6ee7b7" }}>
                          {new Date(item.repliedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: "12px", color: "#d1fae5", margin: 0, lineHeight: "1.4" }}>
                      {item.replyText}
                    </p>
                  </div>
                )}

                {/* CAMPO DE RESPOSTA EM DRAFT (SE NÃO RESPONDIDO OU EDITANDO) */}
                {!isAnswered && (
                  <div style={{ marginBottom: "12px" }}>
                    <textarea
                      rows={2}
                      className="form-textarea"
                      placeholder="Escreva sua resposta técnica ou clique em 'Gerar com IA'..."
                      value={currentDraft}
                      onChange={(e) => setReplyDrafts({ ...replyDrafts, [item.id]: e.target.value })}
                      style={{ fontSize: "12px", marginBottom: "8px" }}
                    />

                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="modal-action-button"
                        onClick={() => handleGenerateAIReply(item.id)}
                        disabled={isGenerating}
                        style={{ padding: "6px 12px", fontSize: "11px" }}
                        title="Deixar o Gemini redigir uma resposta de autoridade técnica sênior"
                      >
                        {isGenerating ? <IconLoader size={12} /> : <IconSparkles size={12} />}
                        <span>{isGenerating ? "Gerando Resposta..." : "Gerar Resposta com IA"}</span>
                      </button>

                      <button
                        type="button"
                        className="modal-action-button"
                        onClick={() => handleSendReply(item.id)}
                        style={{ padding: "6px 12px", fontSize: "11px", background: "#2563eb", color: "#fff", borderColor: "#3b82f6" }}
                      >
                        <IconCheck size={12} />
                        <span>Enviar Resposta</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* BOTÕES DE TRANSFORMAR EM NOVO POST / STORY */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "10px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleConvertToPost(item.id, "STORY_PHOTO")}
                      disabled={isConverting}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "rgba(168, 85, 247, 0.12)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        color: "#c084fc",
                        cursor: "pointer",
                      }}
                      title="Gerar uma arte vertical nos Stories respondendo a essa dúvida"
                    >
                      {isConverting ? <IconLoader size={11} /> : <IconSparkles size={11} />}
                      <span>Transformar em Story de Resposta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleConvertToPost(item.id, "CAROUSEL")}
                      disabled={isConverting}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        background: "rgba(56, 189, 248, 0.12)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        color: "#38bdf8",
                        cursor: "pointer",
                      }}
                      title="Criar um Carrossel completo no Feed aprofundando o tema dessa pergunta"
                    >
                      {isConverting ? <IconLoader size={11} /> : <IconPlay size={11} />}
                      <span>Transformar em Carrossel</span>
                    </button>
                  </div>

                  {isConverted && (
                    <span style={{ fontSize: "11px", color: "#c084fc", fontWeight: "700" }}>
                      ✓ Pauta adicionada ao Cronograma!
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* PAGINAÇÃO */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", marginTop: "16px" }}>
              <button
                className="slide-nav-button"
                disabled={currentPageNum === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(p - 1, 1))}
              >
                <IconChevronLeft size={14} />
                <span>Anterior</span>
              </button>

              <span style={{ fontSize: "12px", color: "#a1a1aa", fontWeight: "600" }}>
                Página {currentPageNum} de {totalPages}
              </span>

              <button
                className="slide-nav-button"
                disabled={currentPageNum === totalPages}
                onClick={() => setCurrentPageNum((p) => Math.min(p + 1, totalPages))}
              >
                <span>Próximo</span>
                <IconChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL PARA ADICIONAR DÚVIDA / INTERAÇÃO MANUALMENTE */}
      {showAddModal && (
        <div className="post-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "550px" }}>
            <div className="modal-header">
              <div>
                <span className="eyebrow">COMUNIDADE</span>
                <h2>Adicionar Dúvida ou DM da Comunidade</h2>
              </div>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <IconX size={18} />
              </button>
            </div>

            <form onSubmit={handleAddManualSubmit} className="edit-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    <span>Handle do Seguidor (@)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualAuthor}
                    onChange={(e) => setManualAuthor(e.target.value)}
                    placeholder="@dev_iniciante"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <span>Nome de Exibição</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Lucas Silva"
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">
                  <span>Tipo de Interação</span>
                </label>
                <select
                  className="form-select"
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value as any)}
                >
                  <option value="COMMENT">Comentário no Post do Feed</option>
                  <option value="QUESTION_STICKER">Caixa de Perguntas (Story)</option>
                  <option value="DIRECT_MESSAGE">Direct Message (DM)</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">
                  <span>Pergunta / Dúvida / Comentário</span>
                </label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Ex: Como funciona o index no PostgreSQL e quando não devo usar?"
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label className="form-label">
                    <span>Post de Origem (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualTopic}
                    onChange={(e) => setManualTopic(e.target.value)}
                    placeholder="Ex: Guia de PostgreSQL"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <span>Link do Post no Instagram (Opcional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://instagram.com/p/..."
                  />
                </div>
              </div>

              <div className="edit-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-modal-save">
                  <IconCheck size={14} />
                  <span>Salvar Interação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
