import React, { useState, useEffect, useRef } from "react";
import {
  IconMessageSquare,
  IconSparkles,
  IconPlay,
  IconPause,
  IconCheck,
  IconLoader,
  IconTrash,
  IconSend,
  IconArrowUpRight,
  IconCalendar,
  IconTag,
  IconZap,
} from "../components/common/Icons";
import { useModal } from "../context/ModalContext";
import { useActivities } from "../context/ActivitiesContext";

interface ChatOption {
  optionNumber: number;
  title: string;
  summary: string;
  whyItEngages: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "clara";
  text: string;
  audioPath?: string;
  timestamp: string;
  actionTaken?: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT" | "REPLACED_PREVIOUS_PAUTA" | "CANCELED_PAUTA";
  dispatchedPauta?: {
    topic: string;
    format: string;
    narrativeAngle: string;
    objective: string;
    hook: string;
    reasoning: string;
    scheduledDay?: string;
    scheduledTime?: string;
    isUrgent?: boolean;
    canceledPreviousTopic?: string;
  };
  suggestedOptions?: ChatOption[];
}

interface AgencyMeetingPageProps {
  onProduceSlot?: (slot: any) => void;
  onNavigateToPosts?: () => void;
  onNavigateToSchedule?: () => void;
}

export function AgencyMeetingPage({ onProduceSlot, onNavigateToPosts, onNavigateToSchedule }: AgencyMeetingPageProps) {
  const { toast, showConfirm } = useModal();
  const { registerOrUpdateActivity } = useActivities();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [managerName, setManagerName] = useState("Clara");
  const [managerRole, setManagerRole] = useState("HEAD EDITORIAL SYRIUS");
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem("clara_voice_enabled") !== "false";
    } catch {
      return true;
    }
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isCanceledRef = useRef<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadChatHistory();
    loadManagerConfig();
  }, []);

  async function loadManagerConfig() {
    try {
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        if (s?.agencyManager?.name) setManagerName(s?.agencyManager.name);
        if (s?.agencyManager?.roleTitle) setManagerRole(s?.agencyManager.roleTitle);
      }
    } catch {}
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, transcribing]);

  async function loadChatHistory() {
    try {
      if (window.electronAPI?.agencyGetHistory) {
        const history = await window.electronAPI.agencyGetHistory();
        setMessages(history);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    }
  }

  function toggleVoice() {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    try {
      localStorage.setItem("clara_voice_enabled", String(next));
    } catch {}
    toast.info(next ? "Locução de voz da Clara ativada." : "Locução de voz da Clara desativada (Modo Silencioso).");
  }

  async function handleClearHistory() {
    const confirmed = await showConfirm({
      title: "Limpar Sala de Reunião",
      message: "Deseja reiniciar a conversa com a Gestora Clara? Isso apagará o histórico da sessão atual.",
      confirmText: "Sim, Reiniciar",
      cancelText: "Manter",
      type: "danger",
    });

    if (!confirmed) return;

    try {
      if (window.electronAPI?.agencyClearHistory) {
        await window.electronAPI.agencyClearHistory();
        setMessages([
          {
            id: "msg-welcome-fresh",
            sender: "clara",
            text: "Reunião reiniciada! Estou pronta para novas pautas. Me conta o que você gostaria de produzir ou que assunto quer colocar em pauta hoje.",
            timestamp: new Date().toISOString(),
            actionTaken: "NONE",
          },
        ]);
        toast.success("Histórico da reunião reiniciado com sucesso.");
      }
    } catch (err) {
      toast.error("Erro ao limpar histórico.");
    }
  }

  async function handleSendMessage(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text || loading || transcribing) return;

    setInputText("");
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      if (window.electronAPI?.agencySendMessage) {
        const res = await window.electronAPI.agencySendMessage({
          text,
          voiceEnabled,
        });

        if (res.success && res.claraMsg) {
          setMessages((prev) => {
            const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
            return [...filtered, res.userMsg || tempUserMsg, res.claraMsg];
          });

          if (res.claraMsg.audioPath && voiceEnabled) {
            playAudio(res.claraMsg.audioPath);
          }

          if (res.autoDispatched && res.dispatchedSlot) {
            const isReplaced = res.claraMsg.actionTaken === "REPLACED_PREVIOUS_PAUTA";
            toast.success(
              isReplaced
                ? `Pauta anterior cancelada e substituída por "${res.dispatchedSlot.topic}" no Cronograma!`
                : `Pauta aprovada por ${managerName} e agendada com sucesso: "${res.dispatchedSlot.topic}".`
            );
            if (onProduceSlot && res.dispatchedSlot.isUrgent) {
              onProduceSlot(res.dispatchedSlot);
            }
          }
        } else {
          toast.error(res.error || "Erro ao receber resposta da Gestora.");
        }
      }
    } catch (err) {
      toast.error(`Erro na comunicação: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  }

  const speechRecognitionRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>("");

  async function startRecording() {
    isCanceledRef.current = false;
    setIsPaused(false);
    liveTranscriptRef.current = "";
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript;
          }
          if (currentTranscript.trim()) {
            liveTranscriptRef.current = currentTranscript.trim();
            setInputText(currentTranscript.trim());
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("[WebSpeechAPI] Status nativo:", event.error);
        };

        recognition.start();
        speechRecognitionRef.current = recognition;
      } catch (e) {
        console.warn("[WebSpeechAPI] Inicialização:", e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        // Se a gravação foi cancelada pelo usuário estilo WhatsApp
        if (isCanceledRef.current) {
          audioChunksRef.current = [];
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const liveText = liveTranscriptRef.current.trim();
        if (liveText) {
          handleSendMessage(liveText);
        } else {
          await processRecordedAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      toast.error("Não foi possível acessar o microfone. Verifique as permissões de áudio do sistema.");
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      try {
        if (mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.pause();
        }
      } catch {}
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {}
      }
      clearInterval(recordingTimerRef.current);
      setIsPaused(true);
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      try {
        if (mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.resume();
        }
      } catch {}
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch {}
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      setIsPaused(false);
    }
  }

  function cancelRecording() {
    isCanceledRef.current = true;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    clearInterval(recordingTimerRef.current);
    audioChunksRef.current = [];
    liveTranscriptRef.current = "";
    setInputText("");
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    toast.info("Gravação de áudio cancelada.");
  }

  function stopRecordingAndSend() {
    isCanceledRef.current = false;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(recordingTimerRef.current);
    }
  }

  async function processRecordedAudio(blob: Blob) {
    try {
      setTranscribing(true);
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        if (window.electronAPI?.agencyTranscribeAudio) {
          const res = await window.electronAPI.agencyTranscribeAudio({
            audioBase64: base64Audio,
            mimeType: "audio/webm",
          });

          if (res.success && res.text) {
            handleSendMessage(res.text);
          } else {
            toast.error(res.error || "Não consegui compreender o áudio. Tente falar novamente mais próximo ao microfone.");
          }
        }
      };
    } catch (err) {
      toast.error("Erro ao processar gravação de voz.");
    } finally {
      setTranscribing(false);
    }
  }

  function playAudio(audioPath: string) {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audioUrl = `media://${audioPath}`;
    const audio = new Audio(audioUrl);
    audioPlayerRef.current = audio;
    setCurrentlyPlayingAudio(audioPath);

    audio.onended = () => {
      setCurrentlyPlayingAudio(null);
    };
    audio.onerror = () => {
      setCurrentlyPlayingAudio(null);
    };

    audio.play().catch(() => {
      setCurrentlyPlayingAudio(null);
    });
  }

  function stopAudio() {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setCurrentlyPlayingAudio(null);
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "1050px", margin: "0 auto", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* CABEÇALHO DA SALA DE REUNIÃO */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 20px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          marginBottom: "12px",
          flexShrink: 0,
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #ec4899, #a855f7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: "800",
              boxShadow: "0 0 15px rgba(236, 72, 153, 0.4)",
              position: "relative",
              flexShrink: 0,
            }}
          >
            {managerName.charAt(0).toUpperCase()}
            <div
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "11px",
                height: "11px",
                borderRadius: "50%",
                background: "#10b981",
                border: "2px solid #09090b",
              }}
              title={`${managerName} Online`}
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "15px", color: "#fafafa" }}>{managerName}</h2>
              <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(236, 72, 153, 0.15)", border: "1px solid rgba(236, 72, 153, 0.3)", color: "#f472b6", fontWeight: "700" }}>
                {managerRole}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#a1a1aa" }}>
              Converse naturalmente sobre ideias de pautas. {managerName} cuida de toda a estratégia de mídia, formatos e despacho.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
          <button
            type="button"
            onClick={toggleVoice}
            className="secondary-button"
            style={{
              padding: "7px 14px",
              fontSize: "12px",
              fontWeight: "600",
              borderColor: voiceEnabled ? "rgba(56, 189, 248, 0.4)" : "rgba(255, 255, 255, 0.1)",
              color: voiceEnabled ? "#38bdf8" : "#71717a",
            }}
            title="Ativar ou desativar leitura de voz neural feminina (Edge TTS)"
          >
            <span>{voiceEnabled ? "Voz Neural Feminina: Ativa" : "Modo Silencioso (Sem Voz)"}</span>
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            className="secondary-button"
            style={{ padding: "7px 12px", fontSize: "12px", color: "#71717a" }}
            title="Reiniciar a reunião e limpar histórico"
          >
            <IconTrash size={13} />
            <span>Limpar Reunião</span>
          </button>
        </div>
      </div>

      {/* FEED DE MENSAGENS (CHAT) COM SCROLL EXCLUSIVO */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          background: "rgba(24, 24, 27, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          borderRadius: "14px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          marginBottom: "12px",
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isPlaying = currentlyPlayingAudio === msg.audioPath;

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: isUser ? "flex-end" : "flex-start",
                maxWidth: "85%",
                alignSelf: isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  padding: "14px 18px",
                  borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: isUser ? "linear-gradient(135deg, #0284c7, #2563eb)" : "var(--bg-surface)",
                  border: isUser ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid var(--border-card)",
                  color: "#fafafa",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  boxShadow: isUser ? "0 4px 14px rgba(2, 132, 199, 0.25)" : "0 4px 14px rgba(0, 0, 0, 0.2)",
                  width: "100%",
                }}
              >
                {!isUser && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", paddingBottom: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#f472b6", textTransform: "uppercase" }}>
                      {managerName}
                    </span>

                    {msg.audioPath && (
                      <button
                        type="button"
                        onClick={() => (isPlaying ? stopAudio() : playAudio(msg.audioPath!))}
                        style={{
                          background: isPlaying ? "rgba(239, 68, 68, 0.2)" : "rgba(56, 189, 248, 0.15)",
                          border: `1px solid ${isPlaying ? "rgba(239, 68, 68, 0.4)" : "rgba(56, 189, 248, 0.3)"}`,
                          color: isPlaying ? "#f87171" : "#38bdf8",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <IconPlay size={10} />
                        <span>{isPlaying ? "Pausar Voz" : "Ouvir Resposta"}</span>
                      </button>
                    )}
                  </div>
                )}

                <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>

                {/* CARDS DE OPÇÕES DE PAUTAS SUGERIDAS (SE HOUVER) */}
                {msg.suggestedOptions && msg.suggestedOptions.length > 0 && (
                  <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {msg.suggestedOptions.map((opt) => (
                      <div
                        key={opt.optionNumber}
                        style={{
                          background: "#09090b",
                          border: "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: "10px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8" }}>
                            Opção {opt.optionNumber}: {opt.title}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleSendMessage(`Gostei da Opção ${opt.optionNumber}: "${opt.title}". Pode aprovar e agendar!`)}
                            className="primary-button"
                            style={{ padding: "4px 10px", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" }}
                          >
                            <IconCheck size={11} />
                            <span>Gostei desta!</span>
                          </button>
                        </div>

                        <p style={{ margin: 0, fontSize: "12px", color: "#d4d4d8", lineHeight: "1.4" }}>
                          {opt.summary}
                        </p>

                        <span style={{ fontSize: "11px", color: "#a1a1aa", fontStyle: "italic" }}>
                          Por que funciona: {opt.whyItEngages}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* BANNER DE DESPACHO AUTÔNOMO EFETUADO */}
                {msg.actionTaken && msg.actionTaken !== "NONE" && msg.dispatchedPauta && (
                  <div
                    style={{
                      marginTop: "12px",
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                        <IconCheck size={13} color="#34d399" />
                        <strong style={{ fontSize: "12px", color: "#34d399", textTransform: "uppercase" }}>
                          {msg.actionTaken === "REPLACED_PREVIOUS_PAUTA" ? "Pauta Substituída & Atualizada no Cronograma" : "Pauta Aprovada & Despachada para Produção"}
                        </strong>
                      </div>
                      <span style={{ fontSize: "11px", color: "#e4e4e7" }}>
                        {msg.dispatchedPauta.topic} • {msg.dispatchedPauta.format} ({msg.dispatchedPauta.scheduledDay || "Em breve"})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onNavigateToSchedule?.()}
                      className="secondary-button"
                      style={{ padding: "4px 10px", fontSize: "11px", color: "#34d399", borderColor: "rgba(16, 185, 129, 0.4)" }}
                    >
                      <span>Ver no Cronograma</span>
                    </button>
                  </div>
                )}
              </div>

              <span style={{ fontSize: "10px", color: "#71717a", marginTop: "4px", padding: "0 4px" }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", color: "#a1a1aa", fontSize: "13px" }}>
            <IconLoader className="spin" size={16} />
            <span>{managerName} está analisando métricas e elaborando a resposta...</span>
          </div>
        )}

        {transcribing && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", color: "#38bdf8", fontSize: "13px" }}>
            <IconLoader className="spin" size={16} />
            <span>Transcrevendo seu áudio com IA...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* BARRA DE ENTRADA MULTIMODAL (TEXTO + ÁUDIO) */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-card)",
          borderRadius: "14px",
          padding: "10px 14px",
          flexShrink: 0,
        }}
      >
        {isRecording ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 8px",
              gap: "10px",
              background: isPaused ? "rgba(245, 158, 11, 0.06)" : "rgba(239, 68, 68, 0.06)",
              border: `1px solid ${isPaused ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
              borderRadius: "12px",
            }}
          >
            {/* LADO ESQUERDO: CANCELAR + TIMER + ONDAS SONORAS */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
              <button
                type="button"
                onClick={cancelRecording}
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
                title="Cancelar e descartar áudio (estilo WhatsApp)"
              >
                <IconTrash size={15} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: isPaused ? "#fbbf24" : "#ef4444",
                    animation: isPaused ? "none" : "pulse 1s infinite",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: "700", color: isPaused ? "#fbbf24" : "#fafafa", fontFamily: "monospace" }}>
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
                </span>
                {isPaused && (
                  <span style={{ fontSize: "9px", color: "#fbbf24", fontWeight: "700", textTransform: "uppercase", background: "rgba(245, 158, 11, 0.15)", padding: "1px 5px", borderRadius: "4px" }}>
                    Pausado
                  </span>
                )}
              </div>

              {/* BARRAS DE ONDA SONORA ANIMADAS */}
              <div style={{ display: "flex", alignItems: "center", gap: "3px", height: "18px", flexShrink: 0 }}>
                {[12, 20, 8, 24, 14, 18, 6, 22, 10, 16].map((h, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: "3px",
                      height: isPaused ? "5px" : `${h}px`,
                      background: isPaused ? "rgba(251, 191, 36, 0.5)" : "#f472b6",
                      borderRadius: "2px",
                      transition: "height 0.2s ease",
                    }}
                  />
                ))}
              </div>

              {/* TRANSCRIÇÃO AO VIVO OU STATUS */}
              {inputText ? (
                <span style={{ fontSize: "11px", color: "#e4e4e7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                  "{inputText}"
                </span>
              ) : (
                <span style={{ fontSize: "11px", color: "#71717a", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {isPaused ? "Áudio pausado. Clique em Retomar para continuar." : "Gravando... Fale sua ideia"}
                </span>
              )}
            </div>

            {/* LADO DIREITO: PAUSAR/RETOMAR + ENVIAR */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeRecording}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    color: "#38bdf8",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                  title="Retomar gravação de áudio"
                >
                  <IconPlay size={13} />
                  <span>Retomar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseRecording}
                  style={{
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    color: "#fbbf24",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                  title="Pausar gravação de áudio"
                >
                  <IconPause size={13} />
                  <span>Pausar</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopRecordingAndSend}
                className="primary-button"
                style={{
                  background: "#10b981",
                  borderColor: "#059669",
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: "700",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
                title={`Concluir e Enviar para ${managerName}`}
              >
                <IconSend size={13} />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={startRecording}
              disabled={loading || transcribing}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(236, 72, 153, 0.15)",
                border: "1px solid rgba(236, 72, 153, 0.35)",
                color: "#f472b6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                transition: "all 0.15s ease",
              }}
              title="Falar pelo microfone (Web Speech API Nativa)"
            >
              <IconSparkles size={16} />
            </button>

            <input
              type="text"
              className="form-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Digite sua ideia de pauta ou use o microfone para falar com ${managerName}...`}
              disabled={loading || transcribing}
              style={{ flex: 1, padding: "10px 14px", fontSize: "13px" }}
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading || transcribing}
              className="primary-button"
              style={{ padding: "10px 18px", fontSize: "13px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              {loading ? <IconLoader className="spin" size={14} /> : <IconSend size={14} />}
              <span>Enviar</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
