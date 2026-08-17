import React, { useState, useEffect } from "react";
import { ScheduleSlot } from "../types";
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
} from "../components/common/Icons";
import { EditSlotModal } from "../components/schedule/EditSlotModal";

interface SchedulePageProps {
  onProduceSlot: (slot: ScheduleSlot) => void;
}

export function SchedulePage({ onProduceSlot }: SchedulePageProps) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Partial<ScheduleSlot> | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [togglingAutoplay, setTogglingAutoplay] = useState(false);
  const [dismissedCompletion, setDismissedCompletion] = useState(false);
  const [earlyPublishSlot, setEarlyPublishSlot] = useState<ScheduleSlot | null>(null);
  const [publishingEarly, setPublishingEarly] = useState(false);

  const [pendingSuggestion, setPendingSuggestion] = useState<{
    detectedManualSlots: string[];
    critiqueAndOptimization: string;
    suggestedAdjustedSlots: ScheduleSlot[];
  } | null>(null);

  const isWeekCompleted = slots.length > 0 && slots.every((s) => s.status === "READY" || s.status === "PUBLISHED");

  async function loadSchedule() {
    try {
      setLoading(true);
      if (!window.electronAPI?.getSchedule) {
        setSlots([]);
        return;
      }
      const data = await window.electronAPI.getSchedule();
      setSlots(data);

      if (window.electronAPI?.getAutoplay) {
        const auto = await window.electronAPI.getAutoplay();
        setAutoplay(auto);
      }
    } catch (err) {
      console.error("Erro ao carregar cronograma:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, []);

  async function handleToggleAutoplay() {
    try {
      setTogglingAutoplay(true);
      const next = !autoplay;
      const updated = await window.electronAPI.setAutoplay(next);
      setAutoplay(updated);
    } catch (err) {
      alert(`Erro ao alterar Autoplay: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setTogglingAutoplay(false);
    }
  }

  async function handleSaveSlot(slot: ScheduleSlot) {
    try {
      const updated = await window.electronAPI.saveScheduleSlot(slot);
      setSlots(updated);
      setEditingSlot(null);
    } catch (err) {
      alert(`Erro ao salvar slot: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!window.confirm("Deseja remover este slot do cronograma?")) return;
    try {
      const updated = await window.electronAPI.deleteScheduleSlot(slotId);
      setSlots(updated);
    } catch (err) {
      alert(`Erro ao remover slot: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    }
  }

  async function handleGenerateAI() {
    if (!window.confirm("A inteligência artificial irá criar ou otimizar a grade semanal considerando as métricas do Analytics e preservando slots customizados. Deseja continuar?")) {
      return;
    }

    try {
      setGeneratingAI(true);
      const res = await window.electronAPI.generateScheduleAI();
      if (res && res.slots) {
        setSlots(res.slots);
        if (res.aiSuggestion) {
          setPendingSuggestion(res.aiSuggestion);
        } else {
          setPendingSuggestion(null);
        }
      }
    } catch (err) {
      alert(`Erro ao gerar grade com IA: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGeneratingAI(false);
    }
  }

  async function handleAcceptSuggestion() {
    if (!pendingSuggestion?.suggestedAdjustedSlots) return;
    try {
      const updated = await window.electronAPI.saveScheduleAll(pendingSuggestion.suggestedAdjustedSlots);
      setSlots(updated);
      setPendingSuggestion(null);
    } catch (err) {
      alert(`Erro ao aplicar otimização: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
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
          alert("Post publicado no Instagram com sucesso!");
        } else {
          alert(`Erro ao publicar: ${res.error || "Falha desconhecida"}`);
        }
      } else {
        alert("Este post ainda não possui conteúdo gerado no banco. Produza primeiro.");
      }
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setPublishingEarly(false);
      setEarlyPublishSlot(null);
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

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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

          <button
            className="secondary-button"
            onClick={handleGenerateAI}
            disabled={generatingAI || loading}
          >
            {generatingAI ? (
              <>
                <IconLoader size={13} />
                <span>Gerando Grade IA...</span>
              </>
            ) : (
              <>
                <IconSparkles size={13} />
                <span>Planejar Grade com IA</span>
              </>
            )}
          </button>

          <button
            className="primary-button"
            onClick={() => setEditingSlot({ dayOfWeek: "Segunda-feira", timeSlot: "18:30", format: "CAROUSEL" })}
          >
            <IconPlus size={13} />
            <span>Novo Slot</span>
          </button>
        </div>
      </div>

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
              <span style={{ fontSize: "18px" }}>💡</span>
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
                  📌 {m}
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

      {/* BANNER DE CONCLUSÃO DA GRADE & ATIVAÇÃO DE PUBLICAÇÃO AUTOMÁTICA */}
      {isWeekCompleted && !dismissedCompletion && (
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
              onClick={() => setDismissedCompletion(true)}
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
                  alert("Publicação Automática e Autoplay ATIVADOS com sucesso! O robô postará sozinho nos horários programados.");
                } catch (err) {
                  alert(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
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

      {!loading && slots.length > 0 && (
        <div className="tests-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
          {slots.map((slot) => {
            const formatBadge = getFormatBadgeColor(slot.format);
            const statusBadge = getSlotStatusBadge(slot.status);

            return (
              <div key={slot.id} className="test-module-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#a1a1aa", fontSize: "12px", fontWeight: "600" }}>
                      <IconClock size={13} />
                      <span>{slot.dayOfWeek} às {slot.timeSlot}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: statusBadge.bg,
                          border: `1px solid ${statusBadge.border}`,
                          color: statusBadge.color,
                        }}
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
                    </div>
                  </div>

                  {slot.editorialPillar && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "5px", background: "rgba(147, 51, 234, 0.12)", border: "1px solid rgba(147, 51, 234, 0.3)", color: "#c084fc", fontSize: "11px", fontWeight: "700", marginBottom: "8px" }}>
                      <IconTag size={11} color="#c084fc" />
                      <span>{slot.editorialPillar}</span>
                    </div>
                  )}

                  <h3 style={{ fontSize: "15px", color: "#f4f4f5", lineHeight: "1.4", marginBottom: "8px" }}>
                    {slot.topic}
                  </h3>

                  <p style={{ fontSize: "12px", color: "#a1a1aa", lineHeight: "1.5", marginBottom: "14px" }}>
                    {slot.reasoning}
                  </p>

                  <div className="test-card-meta" style={{ marginBottom: "16px" }}>
                    <span>Objetivo: <strong>{slot.objective}</strong></span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
                  {slot.status === "PUBLISHED" ? (
                    <button
                      type="button"
                      disabled
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        fontSize: "12px",
                        fontWeight: "700",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#34d399",
                        borderRadius: "8px",
                        cursor: "default",
                      }}
                    >
                      ✓ Já Publicado
                    </button>
                  ) : slot.status === "READY" || slot.status === "SCHEDULED" ? (
                    <button
                      className="btn-slot-produce"
                      style={{ flex: 1, background: "#0ea5e9", borderColor: "#38bdf8" }}
                      onClick={() => setEarlyPublishSlot(slot)}
                      title="Publicar este post imediatamente antes do dia/horário planejado"
                    >
                      <span>Publicar Antes do Horário</span>
                    </button>
                  ) : (
                    <button
                      className="btn-slot-produce"
                      style={{ flex: 1 }}
                      onClick={() => onProduceSlot(slot)}
                      title="Produzir este post agora no pipeline"
                    >
                      <IconPlay size={11} />
                      <span>Produzir Agora</span>
                    </button>
                  )}

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
