import React, { useState } from "react";
import { ScheduleSlot } from "../../types";
import {
  IconX,
  IconCheck,
  IconClock,
  IconLayers,
  IconZap,
  IconFlask,
  IconSparkles,
} from "../common/Icons";
import { useModal } from "../../context/ModalContext";

interface EditSlotModalProps {
  slot: Partial<ScheduleSlot> | null;
  onClose: () => void;
  onSave: (slot: ScheduleSlot) => void;
}

const DAYS = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

const FORMAT_OPTIONS = [
  {
    id: "CAROUSEL",
    title: "Carrossel Técnico",
    desc: "6 Slides progressivos • Foco em retenção e salvamentos",
    badge: "Autoridade",
  },
  {
    id: "SINGLE_IMAGE",
    title: "Post Solo",
    desc: "1 Arte de alto impacto (1080x1350) • Compartilhamentos rápidos",
    badge: "Impacto",
  },
  {
    id: "REEL_SCRIPT",
    title: "Roteiro de Reels",
    desc: "Vídeo curto 30-50s • Descoberta para não-seguidores",
    badge: "Viralidade",
  },
  {
    id: "STORY_PHOTO",
    title: "Story Foto",
    desc: "Arte vertical 1080x1920 • Interação e enquetes diárias",
    badge: "Story",
  },
];

const OBJECTIVES = [
  { id: "AUTHORITY", label: "Autoridade Técnica" },
  { id: "EDUCATION", label: "Educação & Boas Práticas" },
  { id: "VIRALITY", label: "Viralidade / Topo de Funil" },
  { id: "ENGAGEMENT", label: "Engajamento & Comunidade" },
];

export function EditSlotModal({ slot, onClose, onSave }: EditSlotModalProps) {
  if (!slot) return null;

  const [dayOfWeek, setDayOfWeek] = useState(slot.dayOfWeek || "Segunda-feira");
  const [timeSlot, setTimeSlot] = useState(slot.timeSlot || "18:30");
  const [editorialPillar, setEditorialPillar] = useState(slot.editorialPillar || "");
  const [format, setFormat] = useState(slot.format || "CAROUSEL");
  const [topic, setTopic] = useState(slot.topic || "");
  const [objective, setObjective] = useState(slot.objective || "AUTHORITY");
  const [reasoning, setReasoning] = useState(slot.reasoning || "");

  const SUGGESTED_PILLARS = [
    "Segunda da Arquitetura",
    "Pílula Rápida de Dev",
    "Desafio do Código (Quiz)",
    "Cheat Sheet Visual",
    "Papo de Carreira & Soft Skills",
    "Sábado da Caixinha",
    "Dicas & Curiosidades",
    "Code Review & Bastidores",
  ];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      toast.warning("Por favor, informe o tema da publicação.");
      return;
    }

    const updatedSlot: ScheduleSlot = {
      id: slot.id || `slot-${Date.now()}`,
      dayOfWeek,
      timeSlot,
      editorialPillar: editorialPillar.trim() || undefined,
      format,
      topic: topic.trim(),
      objective,
      reasoning: reasoning.trim() || `Slot estratégico planejado para ${dayOfWeek} às ${timeSlot}.`,
      status: (slot.status as any) || "PLANNED",
      postId: slot.postId,
      isCustom: true,
    };

    onSave(updatedSlot);
  }

  return (
    <div className="post-modal-backdrop" onClick={onClose}>
      <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="eyebrow">CRONOGRAMA EDITORIAL</span>
            <h2>{slot.id ? "Editar Slot de Publicação" : "Novo Slot no Cronograma"}</h2>
          </div>

          <button className="modal-close" onClick={onClose} title="Fechar">
            <IconX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-form">
          {/* DIA E HORÁRIO */}
          <div className="form-grid-2">
            <div className="form-field">
              <label className="form-label">
                <span>Dia da Semana</span>
              </label>
              <select
                className="form-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span>Horário Sugerido</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                placeholder="Ex: 18:30"
                required
              />
            </div>
          </div>

          {/* SELETOR DE FORMATO EM CARDS */}
          <div className="form-field">
            <label className="form-label">
              <span>Formato do Conteúdo</span>
            </label>
            <div className="form-format-cards">
              {FORMAT_OPTIONS.map((opt) => {
                const isActive = format === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    className={`format-card-btn ${isActive ? "active" : ""}`}
                    onClick={() => setFormat(opt.id)}
                  >
                    <div className="format-card-title">
                      <span>{opt.title}</span>
                    </div>
                    <span className="format-card-desc">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QUADRO FIXO / EDITORIA RECORRENTE */}
          <div className="form-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="form-label" style={{ margin: 0 }}>
                <span>Quadro Fixo / Editoria Semanal</span>
              </label>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                A IA manterá este quadro nas próximas semanas
              </span>
            </div>
            <input
              type="text"
              className="form-input"
              value={editorialPillar}
              onChange={(e) => setEditorialPillar(e.target.value)}
              placeholder="Ex: Segunda da Arquitetura, Sábado da Caixinha, Dicas & Curiosidades..."
            />

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
              {SUGGESTED_PILLARS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setEditorialPillar(p)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    background: editorialPillar === p ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${editorialPillar === p ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
                    color: editorialPillar === p ? "#38bdf8" : "#d4d4d8",
                    cursor: "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* TEMA */}
          <div className="form-field">
            <label className="form-label">
              <span>Tema ou Ideia Central desta Semana</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Guia de Docker Multi-stage Builds e Otimização"
              required
            />
          </div>

          {/* OBJETIVO ESTRATÉGICO */}
          <div className="form-field">
            <label className="form-label">
              <span>Objetivo Estratégico</span>
            </label>
            <div className="objective-pills">
              {OBJECTIVES.map((obj) => {
                const isActive = objective === obj.id;
                return (
                  <button
                    type="button"
                    key={obj.id}
                    className={`objective-pill-btn ${isActive ? "active" : ""}`}
                    onClick={() => setObjective(obj.id)}
                  >
                    {obj.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RACIOCÍNIO */}
          <div className="form-field">
            <label className="form-label">
              <span>Raciocínio & Justificativa da IA</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Ex: Segunda-feira é ideal para tutoriais densos de arquitetura com foco em salvamento."
            />
          </div>

          {/* AÇÕES */}
          <div className="edit-actions">
            <button type="button" className="btn-modal-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-modal-save">
              <IconCheck size={14} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
