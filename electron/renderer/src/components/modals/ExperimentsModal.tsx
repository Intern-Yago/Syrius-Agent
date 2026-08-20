import React, { useState, useEffect } from "react";
import { useModal } from "../../context/ModalContext";
import {
  IconX,
  IconLoader,
  IconSparkles,
  IconCheck,
  IconRotateCcw,
  IconTag,
  IconLayers,
  IconTrash,
} from "../common/Icons";

interface ExperimentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic?: string;
  onDispatchVariant?: (slot: {
    topic: string;
    format: string;
    objective: string;
    reasoning?: string;
    hook?: string;
    baseCopyPrompt?: string;
    baseVisualPrompt?: string;
  }) => void;
}

export function ExperimentsModal({
  isOpen,
  onClose,
  initialTopic = "",
  onDispatchVariant,
}: ExperimentsModalProps) {
  const { toast } = useModal();
  const [topic, setTopic] = useState(initialTopic);
  const [format, setFormat] = useState("CAROUSEL");
  const [targetVariable, setTargetVariable] = useState<"HOOK" | "VISUAL_DESIGN" | "CTA_SAVES" | "BODY_DENSITY">("HOOK");
  const [generating, setGenerating] = useState(false);
  const [variantResult, setVariantResult] = useState<any | null>(null);
  const [savedExperiments, setSavedExperiments] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"generator" | "history">("generator");

  useEffect(() => {
    if (initialTopic) setTopic(initialTopic);
  }, [initialTopic]);

  useEffect(() => {
    if (isOpen) {
      loadSavedExperiments();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function loadSavedExperiments() {
    try {
      const res = await window.electronAPI?.getExperiments?.();
      if (res?.success && res.experiments) {
        setSavedExperiments(res.experiments);
      }
    } catch {}
  }

  async function handleGenerateVariants() {
    if (!topic.trim()) {
      toast.error("Informe um tema para o experimento A/B.");
      return;
    }

    try {
      setGenerating(true);
      setVariantResult(null);
      const res = await window.electronAPI?.generateExperimentVariants?.({
        topic: topic.trim(),
        format,
        targetVariable,
      });

      if (res?.success && res.data) {
        setVariantResult(res.data);
        toast.success("Variantes A/B formuladas pela IA!");
      } else {
        toast.error(res?.error || "Erro ao gerar variantes A/B.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Falha ao formular variantes A/B.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveExperiment(chosenVariant: "A" | "B") {
    if (!variantResult) return;
    const variantData = chosenVariant === "A" ? variantResult.variantA : variantResult.variantB;

    try {
      await window.electronAPI?.saveExperiment?.({
        topic: variantResult.topic,
        format,
        targetVariable: variantResult.targetVariable,
        hypothesis: variantResult.hypothesis,
        plannedPromptDiff: `Variante escolhida: ${variantData.name} | Hook: ${variantData.hook} | Visual: ${variantData.visualDirection}`,
      });

      toast.success(`Experimento registrado no banco de dados!`);
      loadSavedExperiments();
    } catch (err: any) {
      toast.error("Erro ao salvar experimento.");
    }
  }

  async function handleDispatchToPipeline(chosenVariant: "A" | "B") {
    if (!variantResult) return;
    const variantData = chosenVariant === "A" ? variantResult.variantA : variantResult.variantB;
    const otherVariant = chosenVariant === "A" ? "B" : "A";
    const otherVariantData = chosenVariant === "A" ? variantResult.variantB : variantResult.variantA;

    await handleSaveExperiment(chosenVariant);

    // Agenda a outra variante automaticamente para daqui a 3 semanas (weekOffset: 3)
    try {
      if (window.electronAPI?.saveScheduleSlot) {
        await window.electronAPI.saveScheduleSlot(
          {
            id: `slot-ab-${Date.now()}`,
            dayOfWeek: "Segunda-feira",
            timeSlot: "18:30",
            editorialPillar: `Experimento A/B (Variante ${otherVariant})`,
            format,
            topic: variantResult.topic,
            objective: "AUTHORITY",
            reasoning: `Teste A/B comparativo em 3 semanas: ${otherVariantData.name} - ${otherVariantData.rationale}`,
            baseCopyPrompt: `FOCO DO TESTE A/B COMPARATIVO (${otherVariantData.name}): Use o gancho exato "${otherVariantData.hook}". Rationale: ${otherVariantData.rationale}`,
            baseVisualPrompt: otherVariantData.visualDirection,
            status: "PLANNED",
            weekOffset: 3,
            isCustom: true,
          } as any,
          3
        );
      }
    } catch (e) {
      console.warn("Erro ao agendar variante oposta para semana +3:", e);
    }

    if (onDispatchVariant) {
      onDispatchVariant({
        topic: variantResult.topic,
        format,
        objective: "AUTHORITY",
        hook: variantData.hook,
        reasoning: `${variantResult.hypothesis} (${variantData.rationale})`,
        baseCopyPrompt: `FOCO DO TESTE A/B (${variantData.name}): Use o gancho exato "${variantData.hook}". Rationale: ${variantData.rationale}`,
        baseVisualPrompt: variantData.visualDirection,
      });
      toast.success(`Variante ${chosenVariant} enviada para produção! A Variante ${otherVariant} foi agendada para daqui a 3 semanas para comparação real.`);
      onClose();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "90vh",
          backgroundColor: "#090d16",
          border: "1px solid rgba(168, 85, 247, 0.35)",
          borderRadius: "16px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(168, 85, 247, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(56, 189, 248, 0.08))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#fafafa" }}>
                Laboratório de Testes A/B de Capas & Ganchos
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                Crie variantes contrastantes (Técnica vs Provocativa) para descobrir o que mais retém seu público.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={() => setActiveTab("generator")}
              style={{
                background: activeTab === "generator" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                border: `1px solid ${activeTab === "generator" ? "#a855f7" : "transparent"}`,
                color: activeTab === "generator" ? "#f4f4f5" : "#94a3b8",
                fontSize: "12px",
                fontWeight: "700",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Novo Teste A/B
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              style={{
                background: activeTab === "history" ? "rgba(168, 85, 247, 0.2)" : "transparent",
                border: `1px solid ${activeTab === "history" ? "#a855f7" : "transparent"}`,
                color: activeTab === "history" ? "#f4f4f5" : "#94a3b8",
                fontSize: "12px",
                fontWeight: "700",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Histórico ({savedExperiments.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "6px" }}
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "18px" }}>
          {activeTab === "generator" ? (
            <>
              {/* FORM CONTROLS */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Tema do Conteúdo</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ex: Como evitar Memory Leaks em Node.js"
                    style={{ width: "100%", fontSize: "12px", padding: "8px 12px" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Formato</label>
                  <select
                    className="settings-input"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                    style={{ width: "100%", fontSize: "12px", padding: "8px 12px" }}
                  >
                    <option value="CAROUSEL">Carrossel (4:5)</option>
                    <option value="REEL_SCRIPT">Vídeo Reels (9:16)</option>
                    <option value="SINGLE_IMAGE">Post Solo (4:5)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#94a3b8", display: "block", marginBottom: "4px" }}>Variável do Teste</label>
                  <select
                    className="settings-input"
                    value={targetVariable}
                    onChange={(e) => setTargetVariable(e.target.value as any)}
                    style={{ width: "100%", fontSize: "12px", padding: "8px 12px" }}
                  >
                    <option value="HOOK">Gancho / Primeiros 3s</option>
                    <option value="VISUAL_DESIGN">Design / Estética de Capa</option>
                    <option value="CTA_SAVES">Chamada para Salvamentos</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={handleGenerateVariants}
                disabled={generating || !topic.trim()}
                style={{
                  padding: "10px",
                  background: "linear-gradient(135deg, #a855f7, #6366f1)",
                  borderColor: "#c084fc",
                }}
              >
                {generating ? <IconLoader className="spin" size={14} /> : <IconSparkles size={14} />}
                <span>{generating ? "Formulando Hipóteses Contrastantes com IA..." : "Gerar Variantes A/B com IA"}</span>
              </button>

              {/* VARIANT CARDS COMPARISON */}
              {variantResult && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "10px" }}>
                  {/* HYPOTHESIS BANNER */}
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: "rgba(168, 85, 247, 0.12)",
                      border: "1px solid rgba(168, 85, 247, 0.35)",
                    }}
                  >
                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#c084fc", textTransform: "uppercase" }}>
                      HIPÓTESE CIENTÍFICA FORMULADA
                    </span>
                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#f8fafc", fontWeight: "600" }}>
                      {variantResult.hypothesis}
                    </p>
                  </div>

                  {/* SIDE-BY-SIDE CARDS */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {/* VARIANTE A */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        background: "rgba(56, 189, 248, 0.04)",
                        border: "1px solid rgba(56, 189, 248, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "14px", color: "#38bdf8" }}>{variantResult.variantA.name}</strong>
                        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontWeight: "700" }}>
                          Pragmático
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Gancho (Hook):</span>
                        <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#ffffff", fontWeight: "700" }}>
                          "{variantResult.variantA.hook}"
                        </p>
                      </div>

                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Direção Visual:</span>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#cbd5e1" }}>
                          {variantResult.variantA.visualDirection}
                        </p>
                      </div>

                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Por que funciona:</span>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                          {variantResult.variantA.rationale}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleDispatchToPipeline("A")}
                        style={{
                          marginTop: "auto",
                          background: "linear-gradient(135deg, #0284c7, #0369a1)",
                          borderColor: "#38bdf8",
                        }}
                      >
                        <IconCheck size={13} />
                        <span>Escolher Variante A & Produzir</span>
                      </button>
                    </div>

                    {/* VARIANTE B */}
                    <div
                      style={{
                        padding: "16px",
                        borderRadius: "12px",
                        background: "rgba(168, 85, 247, 0.04)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong style={{ fontSize: "14px", color: "#c084fc" }}>{variantResult.variantB.name}</strong>
                        <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", fontWeight: "700" }}>
                          Viral / Quebra
                        </span>
                      </div>

                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Gancho (Hook):</span>
                        <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#ffffff", fontWeight: "700" }}>
                          "{variantResult.variantB.hook}"
                        </p>
                      </div>

                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Direção Visual:</span>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#cbd5e1" }}>
                          {variantResult.variantB.visualDirection}
                        </p>
                      </div>

                      <div>
                        <span style={{ fontSize: "10px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "700" }}>Por que funciona:</span>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                          {variantResult.variantB.rationale}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => handleDispatchToPipeline("B")}
                        style={{
                          marginTop: "auto",
                          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                          borderColor: "#a855f7",
                        }}
                      >
                        <IconCheck size={13} />
                        <span>Escolher Variante B & Produzir</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* HISTÓRICO DE EXPERIMENTOS */
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {savedExperiments.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                  Nenhum teste A/B registrado ainda. Crie seu primeiro experimento na aba anterior!
                </div>
              ) : (
                savedExperiments.map((exp) => (
                  <div
                    key={exp.id}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "10px",
                      background: "rgba(255, 255, 255, 0.02)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "13px", color: "#fafafa" }}>{exp.topic}</strong>
                        <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", fontWeight: "700" }}>
                          {exp.targetVariable}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: "700",
                            background:
                              exp.status === "VALIDATED"
                                ? "rgba(16, 185, 129, 0.15)"
                                : exp.status === "REFUTED"
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(234, 179, 8, 0.15)",
                            color:
                              exp.status === "VALIDATED"
                                ? "#34d399"
                                : exp.status === "REFUTED"
                                ? "#f87171"
                                : "#facc15",
                            border: `1px solid ${
                              exp.status === "VALIDATED"
                                ? "rgba(16, 185, 129, 0.3)"
                                : exp.status === "REFUTED"
                                ? "rgba(239, 68, 68, 0.3)"
                                : "rgba(234, 179, 8, 0.3)"
                            }`,
                          }}
                        >
                          {exp.status === "VALIDATED"
                            ? "Validado pelo Analytics"
                            : exp.status === "REFUTED"
                            ? "Refutado pelo Analytics"
                            : "Hipótese em Teste"}
                        </span>
                      </div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "12px", color: "#94a3b8" }}>{exp.hypothesis}</p>
                      {exp.previousResult && (
                        <div style={{ fontSize: "11px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.08)", padding: "4px 8px", borderRadius: "6px", marginTop: "4px" }}>
                          <strong>Resultado Empírico:</strong> {exp.previousResult}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await window.electronAPI?.deleteExperiment?.(exp.id);
                        loadSavedExperiments();
                        toast.success("Experimento removido.");
                      }}
                      style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(0, 0, 0, 0.3)",
          }}
        >
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
