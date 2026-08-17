import React, { useState, useEffect } from "react";
import { AppSettings, AnalyticsScheduleConfig } from "../types";
import {
  IconSettings,
  IconCheck,
  IconLoader,
  IconRotateCcw,
  IconSparkles,
  IconCopy,
  IconPlus,
  IconX,
  IconCalendar,
  IconClock,
  IconMoon,
  IconHand,
  IconTag,
  IconMail,
  IconSend,
} from "../components/common/Icons";

const INTERVAL_OPTIONS = [
  { value: 1, label: "1 Hora", desc: "Tempo real / Alta frequência" },
  { value: 6, label: "6 Horas", desc: "4x ao dia (Ideal para contas ativas)" },
  { value: 12, label: "12 Horas", desc: "2x ao dia (Manhã e noite)" },
  { value: 24, label: "24 Horas", desc: "1x ao dia (Padrão recomendado)", badge: "Recomendado" },
  { value: 48, label: "48 Horas", desc: "A cada 2 dias (Econômico)" },
];

const ALL_WEEKDAYS = [
  { id: "Segunda-feira", short: "Seg" },
  { id: "Terça-feira", short: "Ter" },
  { id: "Quarta-feira", short: "Qua" },
  { id: "Quinta-feira", short: "Qui" },
  { id: "Sexta-feira", short: "Sex" },
  { id: "Sábado", short: "Sáb" },
  { id: "Domingo", short: "Dom" },
];

const PRESET_GEMINI_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Equilíbrio ideal entre velocidade e qualidade" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Raciocínio complexo e máxima profundidade técnica" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", desc: "Ultrarrápido e estável" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", desc: "Janela de contexto gigante e precisão" },
  { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Exp)", desc: "Nova geração experimental Google DeepMind" },
];

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatedBios, setGeneratedBios] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [generatingHighlights, setGeneratingHighlights] = useState(false);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newModelInput, setNewModelInput] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  async function handleSendTestEmail() {
    try {
      setSendingTestEmail(true);
      setTestEmailFeedback(null);
      if (!window.electronAPI?.sendTestEmail) {
        throw new Error("API de e-mail não disponível.");
      }
      // Salva configurações atuais primeiro para garantir que o backend tenha os dados mais recentes
      if (settings) {
        await window.electronAPI.saveSettings(settings);
      }
      const res = await window.electronAPI.sendTestEmail(settings?.notificationEmail);
      setTestEmailFeedback(res);
    } catch (err) {
      setTestEmailFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Erro desconhecido ao enviar e-mail.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  }

  const [customModels, setCustomModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("social_agent_custom_models");
      return saved ? JSON.parse(saved) : ["gemini-3.5-flash"];
    } catch {
      return ["gemini-3.5-flash"];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("social_agent_custom_models", JSON.stringify(customModels));
    } catch {}
  }, [customModels]);

  const currentSchedule: AnalyticsScheduleConfig = settings?.analyticsSchedule || {
    mode: "WEEKDAYS",
    selectedDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
    timeSlot: "20:00",
    intervalHours: settings?.analyticsIntervalHours || 24,
    dayOfMonth: 1,
  };

  function updateSchedule(partial: Partial<AnalyticsScheduleConfig>) {
    if (!settings) return;
    const updatedSchedule: AnalyticsScheduleConfig = {
      ...currentSchedule,
      ...partial,
    };
    setSettings({
      ...settings,
      analyticsSchedule: updatedSchedule,
      analyticsIntervalHours: updatedSchedule.intervalHours || settings.analyticsIntervalHours || 24,
    });
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await window.electronAPI.getSettings();
        setSettings(data);
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleAddCustomModel(modelName: string) {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    const isPreset = PRESET_GEMINI_MODELS.some((m) => m.id === trimmed);
    if (!isPreset && !customModels.includes(trimmed)) {
      setCustomModels((prev) => [...prev, trimmed]);
    }
    if (settings) {
      setSettings({ ...settings, defaultGeminiModel: trimmed });
    }
    setNewModelInput("");
  }

  function handleRemoveCustomModel(modelName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCustomModels((prev) => prev.filter((m) => m !== modelName));
    if (settings && settings.defaultGeminiModel === modelName) {
      setSettings({ ...settings, defaultGeminiModel: "gemini-2.5-flash" });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!settings || saving) return;

    // Se o modelo digitado for customizado e não estiver na lista de cards, adiciona automaticamente
    if (settings.defaultGeminiModel) {
      const isPreset = PRESET_GEMINI_MODELS.some((m) => m.id === settings.defaultGeminiModel);
      if (!isPreset && !customModels.includes(settings.defaultGeminiModel)) {
        setCustomModels((prev) => [...prev, settings.defaultGeminiModel]);
      }
    }

    try {
      setSaving(true);
      setSuccessMessage(null);
      const saved = await window.electronAPI.saveSettings(settings);
      setSettings(saved);
      setSuccessMessage("Configurações salvas com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(`Erro ao salvar configurações: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleSyncProfile() {
    try {
      setSyncingProfile(true);
      const res = await window.electronAPI.getProfile();
      if (res.success && res.profile) {
        setSettings((current) => {
          if (!current) return current;
          return {
            ...current,
            instagramHandle: `@${res.profile.username}`,
            accountName: res.profile.name || res.profile.username,
            positioning: res.profile.biography || current.positioning,
          };
        });
        setSuccessMessage(`Perfil @${res.profile.username} sincronizado com sucesso da Meta API!`);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        alert(`Erro ao sincronizar perfil: ${res.error || "Não foi possível consultar a Meta API"}`);
      }
    } catch (err) {
      alert(`Erro ao sincronizar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setSyncingProfile(false);
    }
  }

  async function handleGenerateBio() {
    if (!settings) return;
    try {
      setGeneratingBio(true);
      const res = await window.electronAPI.generateBio({
        niche: settings.niche,
        positioning: settings.positioning,
        accountName: settings.accountName,
      });

      if (res.success && res.bios) {
        setGeneratedBios(res.bios);
      } else {
        alert(`Erro ao gerar bio: ${res.error || "Falha na geração"}`);
      }
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGeneratingBio(false);
    }
  }

  function handleCopyBio(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  }

  function handleApplyBio(text: string) {
    if (!settings) return;
    setSettings({ ...settings, positioning: text });
    setSuccessMessage("Bio aplicada ao campo de Posicionamento!");
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function handleGenerateHighlights() {
    if (!settings) return;
    try {
      setGeneratingHighlights(true);
      const res = await window.electronAPI.generateHighlights({
        niche: settings.niche,
        positioning: settings.positioning,
        accountName: settings.accountName,
      });
      if (res.success && res.highlights) {
        setHighlights(res.highlights);
      } else {
        alert(`Erro ao gerar destaques: ${res.error || "Falha desconhecida"}`);
      }
    } catch (err) {
      alert(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGeneratingHighlights(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="page-placeholder">
        <div className="placeholder-icon">
          <IconLoader size={28} />
        </div>
        <h2>Carregando configurações...</h2>
        <p>Lendo parâmetros do sistema e credenciais do Instagram.</p>
      </div>
    );
  }

  return (
    <div className="settings-page" style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      <div className="page-header" style={{ marginBottom: "28px" }}>
        <div>
          <span className="eyebrow">CONFIGURAÇÕES DO AGENTE</span>
          <h2>Preferências do Sistema & Perfil</h2>
          <p>Defina o intervalo do worker de métricas, perfil do Instagram e comportamento do pipeline.</p>
        </div>

        <button
          type="button"
          className="btn-modal-cancel"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={handleSyncProfile}
          disabled={syncingProfile}
        >
          {syncingProfile ? <IconLoader size={12} /> : <IconRotateCcw size={12} />}
          <span>Sincronizar com Meta API</span>
        </button>
      </div>

      {successMessage && (
        <div
          style={{
            padding: "12px 18px",
            marginBottom: "24px",
            borderRadius: "10px",
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            fontSize: "13px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconCheck size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* SEÇÃO 1: FREQUÊNCIA E AGENDAMENTO DO WORKER DE ANALYTICS */}
        <div
          style={{
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fafafa", margin: 0 }}>
                Frequência & Agendamento do Worker de Analytics
              </h3>
              <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700" }}>
                Modo: {currentSchedule.mode === "WEEKDAYS" ? "Dias da Semana" : currentSchedule.mode === "INTERVAL_HOURS" ? "Intervalo de Horas" : currentSchedule.mode === "WEEKLY" ? "1x por Semana" : currentSchedule.mode === "MONTHLY" ? "1x por Mês" : "Apenas Manual"}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#71717a", margin: 0 }}>
              Escolha exatamente quando o coletor em background deve buscar insights de audiência, alcance, engajamento e novos seguidores.
            </p>
          </div>

          {/* ABAS DE SELEÇÃO DE MODO */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", marginBottom: "20px" }}>
            {[
              { id: "WEEKDAYS", label: "Dias da Semana", icon: <IconCalendar size={14} />, desc: "Dias e hora fixa" },
              { id: "INTERVAL_HOURS", label: "Por Intervalo", icon: <IconClock size={14} />, desc: "A cada X horas" },
              { id: "WEEKLY", label: "1x por Semana", icon: <IconCalendar size={14} />, desc: "Dia semanal" },
              { id: "MONTHLY", label: "1x por Mês", icon: <IconMoon size={14} />, desc: "Dia do mês" },
              { id: "MANUAL", label: "Apenas Manual", icon: <IconHand size={14} />, desc: "Sob demanda" },
            ].map((tab) => {
              const isActive = currentSchedule.mode === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  className={`format-card-btn ${isActive ? "active" : ""}`}
                  onClick={() => updateSchedule({ mode: tab.id as any })}
                  style={{ padding: "10px 12px" }}
                >
                  <strong style={{ fontSize: "12px", color: isActive ? "#38bdf8" : "#fafafa", display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    {tab.icon}
                    <span>{tab.label}</span>
                  </strong>
                  <span style={{ fontSize: "10px", color: "#71717a" }}>{tab.desc}</span>
                </button>
              );
            })}
          </div>

          {/* PAINEL CONFIGURÁVEL POR MODO */}
          <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "16px" }}>
            {/* MODO 1: DIAS DA SEMANA */}
            {currentSchedule.mode === "WEEKDAYS" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa" }}>
                    1. Selecione os dias da semana para a análise automática:
                  </label>
                  {/* Presets rápidos */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => updateSchedule({ selectedDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"] })}
                      style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", cursor: "pointer" }}
                    >
                      Seg, Qua, Sex
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSchedule({ selectedDays: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"] })}
                      style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", cursor: "pointer" }}
                    >
                      Dias Úteis (Seg-Sex)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSchedule({ selectedDays: ["Sábado", "Domingo"] })}
                      style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", cursor: "pointer" }}
                    >
                      Fim de Semana
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {ALL_WEEKDAYS.map((day) => {
                    const isSelected = (currentSchedule.selectedDays || []).includes(day.id);
                    return (
                      <button
                        type="button"
                        key={day.id}
                        onClick={() => {
                          const currentDays = currentSchedule.selectedDays || [];
                          const nextDays = isSelected
                            ? currentDays.filter((d) => d !== day.id)
                            : [...currentDays, day.id];
                          updateSchedule({ selectedDays: nextDays.length > 0 ? nextDays : [day.id] });
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          background: isSelected ? "rgba(56, 189, 248, 0.15)" : "rgba(255, 255, 255, 0.03)",
                          border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                          color: isSelected ? "#38bdf8" : "#a1a1aa",
                        }}
                      >
                        {day.short} • {day.id}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <IconClock size={14} />
                    Horário da Análise:
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={currentSchedule.timeSlot || "20:00"}
                    onChange={(e) => updateSchedule({ timeSlot: e.target.value })}
                    style={{ width: "130px", padding: "6px 10px" }}
                  />
                  <span style={{ fontSize: "11px", color: "#71717a" }}>
                    (Horário local em que o relatório de métricas será gerado)
                  </span>
                </div>
              </div>
            )}

            {/* MODO 2: INTERVALO DE HORAS */}
            {currentSchedule.mode === "INTERVAL_HOURS" && (
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa", display: "block", marginBottom: "10px" }}>
                  Selecione o intervalo de repetição:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
                  {INTERVAL_OPTIONS.map((opt) => {
                    const isActive = (currentSchedule.intervalHours || settings.analyticsIntervalHours) === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        className={`format-card-btn ${isActive ? "active" : ""}`}
                        onClick={() => {
                          updateSchedule({ intervalHours: opt.value });
                          setSettings({ ...settings, analyticsIntervalHours: opt.value });
                        }}
                        style={{ padding: "12px" }}
                      >
                        <strong style={{ fontSize: "12px", color: isActive ? "#38bdf8" : "#fafafa", display: "block", marginBottom: "2px" }}>
                          {opt.label}
                        </strong>
                        <span style={{ fontSize: "10px", color: "#71717a" }}>{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MODO 3: 1X POR SEMANA */}
            {currentSchedule.mode === "WEEKLY" && (
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa" }}>
                    Toda:
                  </label>
                  <select
                    className="form-select"
                    value={currentSchedule.selectedDays?.[0] || "Domingo"}
                    onChange={(e) => updateSchedule({ selectedDays: [e.target.value] })}
                    style={{ width: "160px" }}
                  >
                    {ALL_WEEKDAYS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa" }}>
                    às:
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={currentSchedule.timeSlot || "22:00"}
                    onChange={(e) => updateSchedule({ timeSlot: e.target.value })}
                    style={{ width: "130px", padding: "6px 10px" }}
                  />
                </div>
              </div>
            )}

            {/* MODO 4: 1X POR MÊS */}
            {currentSchedule.mode === "MONTHLY" && (
              <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa" }}>
                    Todo dia:
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className="form-input"
                    value={currentSchedule.dayOfMonth || 1}
                    onChange={(e) => updateSchedule({ dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                    style={{ width: "80px", padding: "6px 10px" }}
                  />
                  <span style={{ fontSize: "12px", color: "#a1a1aa" }}>do mês</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#fafafa" }}>
                    às:
                  </label>
                  <input
                    type="time"
                    className="form-input"
                    value={currentSchedule.timeSlot || "23:00"}
                    onChange={(e) => updateSchedule({ timeSlot: e.target.value })}
                    style={{ width: "130px", padding: "6px 10px" }}
                  />
                </div>
              </div>
            )}

            {/* MODO 5: APENAS MANUAL */}
            {currentSchedule.mode === "MANUAL" && (
              <div style={{ color: "#a1a1aa", fontSize: "12px", lineHeight: "1.5" }}>
                <strong style={{ color: "#fafafa", display: "block", marginBottom: "4px" }}>
                  Auditoria em Background Desativada
                </strong>
                O coletor não rodará sozinho. Você pode disparar a análise e gerar relatórios a qualquer momento clicando no botão <strong>"Executar Auditoria Agora"</strong> na aba <em>Analytics & IA</em>.
              </div>
            )}

            {/* RESUMO DO AGENDAMENTO ATIVO */}
            {currentSchedule.mode !== "MANUAL" && (
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#38bdf8" }}>
                <IconCheck size={13} color="#38bdf8" />
                <span>
                  <strong>Configuração Ativa:</strong>{" "}
                  {currentSchedule.mode === "WEEKDAYS"
                    ? `Auditoria toda ${(currentSchedule.selectedDays || []).join(", ")} às ${currentSchedule.timeSlot || "20:00"}.`
                    : currentSchedule.mode === "INTERVAL_HOURS"
                    ? `Auditoria a cada ${currentSchedule.intervalHours || 24} horas.`
                    : currentSchedule.mode === "WEEKLY"
                    ? `Auditoria semanal todo(a) ${currentSchedule.selectedDays?.[0] || "Domingo"} às ${currentSchedule.timeSlot || "22:00"}.`
                    : `Auditoria mensal todo dia ${currentSchedule.dayOfMonth || 1} às ${currentSchedule.timeSlot || "23:00"}.`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SEÇÃO 2: IDENTIDADE DO PERFIL INSTAGRAM */}
        <div
          style={{
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fafafa", marginBottom: "4px" }}>
                Informações do Perfil & Marca
              </h3>
              <p style={{ fontSize: "12px", color: "#71717a", margin: 0 }}>
                Dados utilizados pelos agentes de IA para criar conteúdo com tom de voz e branding alinhados à sua conta.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={handleGenerateBio}
              disabled={generatingBio}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {generatingBio ? <IconLoader size={12} /> : <IconSparkles size={12} />}
              <span>{generatingBio ? "Gerando Opções..." : "Gerar Sugestões de Bio com IA"}</span>
            </button>
          </div>

          {/* SUGESTÕES DE BIO GERADAS */}
          {generatedBios.length > 0 && (
            <div
              style={{
                background: "rgba(56, 189, 248, 0.05)",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Sugestões de Biografia para o Instagram (Copie e Cole no seu Perfil)
                </span>
                <button
                  type="button"
                  onClick={() => setGeneratedBios([])}
                  style={{ background: "transparent", border: "none", color: "#71717a", cursor: "pointer", fontSize: "14px" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {generatedBios.map((bioText, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#09090b",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <pre
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#e4e4e7",
                        whiteSpace: "pre-wrap",
                        fontFamily: "inherit",
                        lineHeight: "1.5",
                        flex: 1,
                      }}
                    >
                      {bioText}
                    </pre>

                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleCopyBio(bioText, idx)}
                        style={{ padding: "6px 10px", fontSize: "11px" }}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <IconCheck size={12} color="#34d399" />
                            <span style={{ color: "#34d399" }}>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <IconCopy size={12} />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn-slot-edit"
                        onClick={() => handleApplyBio(bioText)}
                        style={{ width: "auto", padding: "6px 10px", fontSize: "11px" }}
                        title="Usar esta bio no campo de Posicionamento"
                      >
                        Usar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid-2" style={{ marginBottom: "16px" }}>
            <div className="form-field">
              <label className="form-label">
                <span>Handle do Instagram</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={settings.instagramHandle}
                onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })}
                placeholder="Ex: @meu_perfil_tech"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                <span>Nome de Exibição da Conta</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={settings.accountName}
                onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                placeholder="Ex: Dev Tech Creator"
                required
              />
            </div>
          </div>

          <div className="form-field" style={{ marginBottom: "16px" }}>
            <label className="form-label">
              <span>Nicho / Tópicos de Foco</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={settings.niche}
              onChange={(e) => setSettings({ ...settings, niche: e.target.value })}
              placeholder="Ex: Engenharia de Software, Backend, Docker, DevOps e IA"
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <span>Posicionamento & Biografia da Conta</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={settings.positioning}
              onChange={(e) => setSettings({ ...settings, positioning: e.target.value })}
              placeholder="Ex: Desenvolvedor Full Stack compartilhando tutoriais práticos de arquitetura e computação em nuvem."
            />
          </div>
        </div>

        {/* SEÇÃO 3: DESTAQUES ESTRATÉGICOS (HIGHLIGHTS) */}
        <div
          style={{
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fafafa", marginBottom: "4px" }}>
                Estratégia de Destaques (Instagram Highlights)
              </h3>
              <p style={{ fontSize: "12px", color: "#71717a", margin: 0 }}>
                Estruture os 4 pilares permanentes do seu perfil para converter visitantes em seguidores fiéis.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={handleGenerateHighlights}
              disabled={generatingHighlights}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {generatingHighlights ? <IconLoader size={12} /> : <IconSparkles size={12} />}
              <span>{generatingHighlights ? "Planejando..." : "Planejar 4 Destaques com IA"}</span>
            </button>
          </div>

          {highlights.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginTop: "12px" }}>
              {highlights.map((hl, i) => (
                <div
                  key={i}
                  style={{
                    background: "#09090b",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <strong style={{ fontSize: "13px", color: "#38bdf8" }}>{hl.title}</strong>
                      <span style={{ fontSize: "9px", background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                        {hl.category}
                      </span>
                    </div>

                    <p style={{ fontSize: "11px", color: "#a1a1aa", margin: "0 0 10px 0", lineHeight: "1.4" }}>
                      {hl.purpose}
                    </p>

                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
                      <span style={{ fontSize: "10px", color: "#71717a", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>
                        Ideias de Stories:
                      </span>
                      <ul style={{ margin: 0, paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "3px" }}>
                        {hl.storyIdeas?.map((idea: string, idx: number) => (
                          <li key={idx} style={{ fontSize: "11px", color: "#d4d4d8", lineHeight: "1.3" }}>
                            {idea}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEÇÃO 4: MODELOS & AUTOMAÇÃO */}
        <div
          style={{
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "24px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#fafafa", marginBottom: "4px" }}>
              Modelo de IA & Comportamento de Publicação
            </h3>
            <p style={{ fontSize: "12px", color: "#71717a", margin: 0 }}>
              Ajuste o modelo de linguagem e as regras de publicação automática.
            </p>
          </div>

          <div className="form-field" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label className="form-label" style={{ margin: 0 }}>
                <span>Modelo Gemini de Redação & Estratégia</span>
              </label>
              <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
                Você pode escolher um modelo pré-definido ou digitar um customizado
              </span>
            </div>

            {/* PRESETS RÁPIDOS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px", marginBottom: "12px" }}>
              {PRESET_GEMINI_MODELS.map((m) => {
                const isSelected = settings.defaultGeminiModel === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    className={`format-card-btn ${isSelected ? "active" : ""}`}
                    onClick={() => setSettings({ ...settings, defaultGeminiModel: m.id })}
                    style={{ padding: "10px" }}
                  >
                    <strong style={{ fontSize: "12px", color: isSelected ? "#38bdf8" : "#fafafa", display: "block", marginBottom: "2px" }}>
                      {m.name}
                    </strong>
                    <span style={{ fontSize: "10px", color: "#71717a" }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* CARDS DE MODELOS SALVOS / PERSONALIZADOS */}
            {customModels.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <span style={{ fontSize: "11px", color: "#a1a1aa", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                  Modelos Salvos por Você (Clique para Selecionar):
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px" }}>
                  {customModels.map((customId) => {
                    const isSelected = settings.defaultGeminiModel === customId;
                    return (
                      <div
                        key={customId}
                        onClick={() => setSettings({ ...settings, defaultGeminiModel: customId })}
                        className={`format-card-btn ${isSelected ? "active" : ""}`}
                        style={{
                          padding: "10px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "12px", color: isSelected ? "#38bdf8" : "#fafafa", display: "block" }}>
                            {customId}
                          </strong>
                          <span style={{ fontSize: "9px", color: "#a855f7", fontWeight: "700" }}>Customizado</span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomModel(customId, e)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#71717a",
                            cursor: "pointer",
                            padding: "2px 4px",
                          }}
                          title="Remover este modelo salvo"
                        >
                          <IconX size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADICIONAR NOVO MODELO CUSTOMIZADO */}
            <div style={{ background: "#09090b", padding: "12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <label style={{ fontSize: "11px", color: "#a1a1aa", margin: 0, fontWeight: "600" }}>
                  Adicionar Novo Modelo Gemini (Cria um card salvo):
                </label>
                <span style={{ fontSize: "11px", color: "#38bdf8" }}>
                  Modelo Ativo: <strong>{settings.defaultGeminiModel}</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                <input
                  type="text"
                  className="form-input"
                  value={newModelInput}
                  onChange={(e) => setNewModelInput(e.target.value)}
                  placeholder="Ex: gemini-3.5-flash, gemini-exp-1206, etc."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomModel(newModelInput)}
                  disabled={!newModelInput.trim()}
                  className="primary-button"
                  style={{ padding: "8px 14px", fontSize: "11px", whiteSpace: "nowrap" }}
                >
                  <IconPlus size={12} />
                  <span>Criar Card do Modelo</span>
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              background: "#09090b",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
            }}
          >
            <div>
              <strong style={{ fontSize: "13px", color: "#fafafa", display: "block", marginBottom: "2px" }}>
                Publicação Automática Imediata
              </strong>
              <span style={{ fontSize: "11px", color: "#71717a" }}>
                Se ativado, o pipeline publica direto na Meta API após aprovação da IA. Se desativado (recomendado), o post aguarda revisão no painel.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, autoPublish: !settings.autoPublish })}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: settings.autoPublish ? "#10b981" : "rgba(255, 255, 255, 0.15)",
                background: settings.autoPublish ? "rgba(16, 185, 129, 0.15)" : "transparent",
                color: settings.autoPublish ? "#34d399" : "#a1a1aa",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {settings.autoPublish ? "ATIVADO" : "DESATIVADO"}
            </button>
          </div>
        </div>

        {/* SEÇÃO 5: NOTIFICAÇÕES & BRIEFING EXECUTIVO POR E-MAIL */}
        <div
          style={{
            background: "#111114",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div className="section-tag" style={{ color: "#38bdf8", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <IconMail size={13} />
                <span>RELATÓRIOS EXECUTIVOS AUTOMÁTICOS</span>
              </div>
              <h3 style={{ fontSize: "16px", color: "#fafafa", margin: "4px 0" }}>
                Notificações & Briefing Executivo por E-mail
              </h3>
              <p style={{ fontSize: "12px", color: "#71717a", margin: 0 }}>
                Receba o resumo de performance da sua conta, a análise individual post a post e os próximos passos estratégicos diretamente na sua caixa de entrada.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSettings({ ...settings, emailNotificationsEnabled: !settings.emailNotificationsEnabled })}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid",
                borderColor: settings.emailNotificationsEnabled ? "#38bdf8" : "rgba(255, 255, 255, 0.15)",
                background: settings.emailNotificationsEnabled ? "rgba(56, 189, 248, 0.15)" : "transparent",
                color: settings.emailNotificationsEnabled ? "#38bdf8" : "#a1a1aa",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <IconMail size={13} />
              <span>{settings.emailNotificationsEnabled ? "ENVIO DE E-MAIL ATIVADO" : "ENVIO DE E-MAIL DESATIVADO"}</span>
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#fafafa", marginBottom: "6px" }}>
                Seu E-mail de Destino:
              </label>
              <input
                type="email"
                className="form-input"
                placeholder="ex: yago.commercial@gmail.com"
                value={settings.notificationEmail || ""}
                onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                style={{ width: "100%" }}
              />
              <span style={{ fontSize: "11px", color: "#71717a", marginTop: "4px", display: "block" }}>
                Onde você quer receber os relatórios periódicos de crescimento e métricas.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#fafafa", marginBottom: "6px" }}>
                Testar Entrega de E-mail:
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail || !settings.notificationEmail}
                  className="secondary-button"
                  style={{ padding: "8px 16px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {sendingTestEmail ? <IconLoader size={13} /> : <IconSend size={13} />}
                  <span>{sendingTestEmail ? "Enviando Teste..." : "Enviar E-mail de Teste Agora"}</span>
                </button>
              </div>

              {testEmailFeedback && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    background: testEmailFeedback.success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                    border: `1px solid ${testEmailFeedback.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                    color: testEmailFeedback.success ? "#34d399" : "#f87171",
                  }}
                >
                  {testEmailFeedback.message}
                </div>
              )}
            </div>
          </div>

          {/* CREDENCIAIS SMTP CONFIGURÁVEIS */}
          <div style={{ background: "#09090b", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "10px", padding: "16px" }}>
            <strong style={{ fontSize: "13px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
              Configuração do Servidor SMTP (Opcional se usar .env)
            </strong>
            <p style={{ fontSize: "11px", color: "#71717a", margin: "0 0 12px" }}>
              Configure seu provedor SMTP (ex: Gmail App Password, Resend, Amazon SES, SendGrid). Para Gmail, use <em>smtp.gmail.com</em>, porta <em>587</em> e uma <em>Senha de Aplicativo (16 dígitos)</em> gerada no Google Security.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>SMTP Host</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="smtp.gmail.com"
                  value={settings.smtpConfig?.host || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtpConfig: { ...(settings.smtpConfig || { port: 587, user: "", pass: "" }), host: e.target.value },
                    })
                  }
                  style={{ width: "100%", fontSize: "12px", padding: "6px 10px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>Porta</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="587"
                  value={settings.smtpConfig?.port || 587}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtpConfig: { ...(settings.smtpConfig || { host: "", user: "", pass: "" }), port: parseInt(e.target.value) || 587 },
                    })
                  }
                  style={{ width: "100%", fontSize: "12px", padding: "6px 10px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>Usuário / E-mail SMTP</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="seu-email@gmail.com"
                  value={settings.smtpConfig?.user || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtpConfig: { ...(settings.smtpConfig || { host: "", port: 587, pass: "" }), user: e.target.value },
                    })
                  }
                  style={{ width: "100%", fontSize: "12px", padding: "6px 10px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#a1a1aa", marginBottom: "4px" }}>Senha de App / API Key</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••••••"
                  value={settings.smtpConfig?.pass || ""}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtpConfig: { ...(settings.smtpConfig || { host: "", port: 587, user: "" }), pass: e.target.value },
                    })
                  }
                  style={{ width: "100%", fontSize: "12px", padding: "6px 10px" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOTÃO SALVAR */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px" }}>
          <button type="submit" className="btn-modal-save" disabled={saving}>
            {saving ? (
              <>
                <IconLoader size={13} />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <IconCheck size={14} />
                <span>Salvar Todas as Configurações</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
