import React, { useState, useEffect, useRef } from "react";
import { AppSettings, AnalyticsScheduleConfig, VoiceCloningConfig } from "../types";
import { useActivities } from "../context/ActivitiesContext";
import { useModal } from "../context/ModalContext";
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
  IconMic,
  IconVolume2,
  IconCpu,
  IconPlay,
  IconStop,
  IconRefreshCw,
  IconTrash,
  IconAlertTriangle,
  IconUpload,
  IconTrendingUp,
} from "../components/common/Icons";

type SettingsTab = "profile" | "agency" | "voice" | "trending" | "analytics" | "models" | "email";

const EDGE_TTS_MANAGER_VOICES = [
  { id: "pt-BR-FranciscaNeural", name: "Francisca (Feminina)", desc: "Natural, fluida e clara (Padrão)", gender: "Feminina" },
  { id: "pt-BR-ThalitaNeural", name: "Thalita (Feminina)", desc: "Jovem, expressiva e moderna", gender: "Feminina" },
  { id: "pt-BR-BrendaNeural", name: "Brenda (Feminina)", desc: "Suave e amigável", gender: "Feminina" },
  { id: "pt-BR-ElzaNeural", name: "Elza (Feminina)", desc: "Dinâmica e confiante", gender: "Feminina" },
  { id: "pt-BR-GiovannaNeural", name: "Giovanna (Feminina)", desc: "Profissional e articulada", gender: "Feminina" },
  { id: "pt-BR-LeilaNeural", name: "Leila (Feminina)", desc: "Acolhedora e serena", gender: "Feminina" },
  { id: "pt-BR-LeticiaNeural", name: "Leticia (Feminina)", desc: "Direta e enérgica", gender: "Feminina" },
  { id: "pt-BR-ManuelaNeural", name: "Manuela (Feminina)", desc: "Elegante e pausada", gender: "Feminina" },
  { id: "pt-BR-YaraNeural", name: "Yara (Feminina)", desc: "Madura e executiva", gender: "Feminina" },
  { id: "pt-BR-AntonioNeural", name: "Antônio (Masculina)", desc: "Corporativo, firme e noticioso", gender: "Masculina" },
  { id: "pt-BR-DonatoNeural", name: "Donato (Masculina)", desc: "Enérgico e entusiasta", gender: "Masculina" },
  { id: "pt-BR-FabioNeural", name: "Fábio (Masculina)", desc: "Calmo e didático", gender: "Masculina" },
  { id: "pt-BR-HumbertoNeural", name: "Humberto (Masculina)", desc: "Voz firme de locutor", gender: "Masculina" },
  { id: "pt-BR-JulioNeural", name: "Júlio (Masculina)", desc: "Jovem e ágil", gender: "Masculina" },
  { id: "pt-BR-NicolauNeural", name: "Nicolau (Masculina)", desc: "Clássico e equilibrado", gender: "Masculina" },
  { id: "pt-BR-ValerioNeural", name: "Valério (Masculina)", desc: "Grave e institucional", gender: "Masculina" },
];

const MIN_RECORDING_SECONDS = 45; // 45s mínimo para permitir salvar
const TARGET_TRAINING_SECONDS = 180; // 3 minutos (meta de treinamento neural)

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
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "Equilíbrio ideal entre velocidade, precisão e estabilidade" },
  { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Preview)", desc: "Raciocínio complexo e máxima profundidade técnica" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Versão rápida anterior" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Raciocínio profundo anterior" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", desc: "Geração rápida multimodal" },
];

const VOICE_READING_SCRIPT = `Fala pessoal, sejam muito bem-vindos! Se você é desenvolvedor de software ou apaixonado por tecnologia, este conteúdo foi preparado especialmente para você.

Hoje nós vamos falar sobre arquitetura limpa, escalabilidade e boas práticas de engenharia no mundo real. Quando começamos a programar, nosso primeiro objetivo é fazer o código funcionar. No entanto, à medida que os sistemas crescem e passam a atender milhares de usuários simultâneos, detalhes como concorrência, consumo de memória RAM, latência de rede e isolamento de microsserviços tornam-se cruciais.

Imagine um cenário onde sua aplicação processa pagamentos e transações críticas em tempo real. Não basta apenas colocar blocos try/catch genéricos em volta das funções. É essencial projetar fluxos resilientes com filas assíncronas no RabbitMQ ou Kafka, caching inteligente com Redis e bancos de dados otimizados para alto volume de leitura e escrita.

Além disso, a evolução da inteligência artificial e dos agentes autônomos está transformando a criação de pipelines e a automação de processos. A chave para se destacar na engenharia de software moderna é aliar consistência, aprendizado contínuo e a capacidade de resolver problemas complexos com soluções simples e sustentáveis.

Se esse tipo de raciocínio técnico faz sentido para você, lembre-se de interagir, salvar este conteúdo para consultar depois e compartilhar com a sua equipe. Um forte abraço e até o próximo vídeo!`;

export function SettingsPage() {
  const { activities, registerOrUpdateActivity, stopActivity } = useActivities();
  const { toast } = useModal();

  // Tarefa de voz ativa persistente compartilhada com a página de Atividades
  const activeVoiceTask = activities.find(
    (a) => a.type === "voice_synthesis" && (a.status === "running" || a.status === "paused")
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingProfile, setSyncingProfile] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);
  const [generatedBios, setGeneratedBios] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newModelInput, setNewModelInput] = useState("");
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Estados do Gravador de Voz & Voice Studio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBase64, setRecordedAudioBase64] = useState<string | null>(null);
  const [cloningVoice, setCloningVoice] = useState(false);
  const [testingTTS, setTestingTTS] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0);
  const [ttsProgressStage, setTtsProgressStage] = useState("");
  const [testTtsText, setTestTtsText] = useState("Fala devs! No vídeo de hoje vamos entender porque você deve parar de usar try/catch para tudo no JavaScript.");
  const [synthesizedAudioUrl, setSynthesizedAudioUrl] = useState<string | null>(null);
  const [voiceFeedback, setVoiceFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [existingVoices, setExistingVoices] = useState<{ voice_id: string; name: string }[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  const isSynthesizing = testingTTS || !!activeVoiceTask;
  const effectiveProgress = activeVoiceTask ? activeVoiceTask.progress : ttsProgress;
  const effectiveStage = activeVoiceTask ? activeVoiceTask.statusMessage : ttsProgressStage;

  // Amostra de Voz Salva & Telemetria de Hardware
  const [savedVoiceSample, setSavedVoiceSample] = useState<{
    exists: boolean;
    audioBase64?: string;
    samplePath?: string;
    modifiedAt?: string;
    sizeKb?: number;
  } | null>(null);
  const [showNewRecording, setShowNewRecording] = useState(false);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [loadingHardware, setLoadingHardware] = useState(false);
  const [trainedModelInfo, setTrainedModelInfo] = useState<{
    trained: boolean;
    modelPath?: string;
    sizeMb?: number;
    trainedAt?: string;
    epochs?: number;
    finalLoss?: number;
    totalSeconds?: number;
  } | null>(null);
  const [isTrainingModel, setIsTrainingModel] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStage, setTrainingStage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const ttsProgressIntervalRef = useRef<any>(null);

  async function loadVoiceAndHardware() {
    try {
      const sample = await window.electronAPI.getSavedVoiceSample?.();
      if (sample) setSavedVoiceSample(sample);
    } catch {}

    try {
      const modelStatus = await window.electronAPI.getTrainedModelStatus?.();
      if (modelStatus) setTrainedModelInfo(modelStatus);
    } catch {}

    try {
      const last = await window.electronAPI.getLastSynthesizedAudio?.();
      if (last?.exists && last.audioBase64) {
        setSynthesizedAudioUrl(last.audioBase64);
      }
    } catch {}

    try {
      setLoadingHardware(true);
      const hw = await window.electronAPI.getHardwareInfo?.();
      if (hw) setHardwareInfo(hw);
    } catch {} finally {
      setLoadingHardware(false);
    }
  }

  useEffect(() => {
    loadVoiceAndHardware();
  }, []);

  const [customModels, setCustomModels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("social_agent_custom_models");
      return saved ? JSON.parse(saved) : ["gemini-3.6-flash"];
    } catch {
      return ["gemini-3.6-flash"];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("social_agent_custom_models", JSON.stringify(customModels));
    } catch {}
  }, [customModels]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await window.electronAPI.getSettings?.();
        if (data) setSettings(data);
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  function updateVoiceConfig(partial: Partial<VoiceCloningConfig>) {
    if (!settings) return;
    const current = settings.voiceConfig || {
      provider: "elevenlabs",
      voiceName: "Voz Syrius Tech",
      stability: 0.5,
      similarityBoost: 0.75,
    };
    setSettings({
      ...settings,
      voiceConfig: {
        ...current,
        ...partial,
      },
    });
  }

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
    setSuccessMessage(`Modelo "${trimmed}" adicionado e selecionado!`);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  function handleRemoveCustomModel(modelName: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCustomModels((prev) => prev.filter((m) => m !== modelName));
    if (settings && settings.defaultGeminiModel === modelName) {
      setSettings({ ...settings, defaultGeminiModel: "gemini-3.6-flash" });
    }
  }

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!settings || saving) return;

    if (settings.defaultGeminiModel) {
      const isPreset = PRESET_GEMINI_MODELS.some((m) => m.id === settings.defaultGeminiModel);
      if (!isPreset && !customModels.includes(settings.defaultGeminiModel)) {
        setCustomModels((prev) => [...prev, settings.defaultGeminiModel]);
      }
    }

    try {
      setSaving(true);
      setSuccessMessage(null);
      const saved = await window.electronAPI.saveSettings?.(settings);
      if (saved) setSettings(saved);
      setSuccessMessage("Configurações salvas com sucesso!");
      toast.success("Configurações salvas com sucesso!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      toast.error(`Erro ao salvar configurações: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }

function encodeWAV(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const channelData = audioBuffer.getChannelData(0);
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + channelData.length * bytesPerSample);
  const view = new DataView(wavBuffer);

  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + channelData.length * bytesPerSample, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, channelData.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < channelData.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return wavBuffer;
}

  // --- GRAVADOR DE MICROFONE ---
  async function startRecording() {
    try {
      setVoiceFeedback(null);
      setRecordedAudioUrl(null);
      setRecordedAudioBase64(null);
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        try {
          const arrayBuffer = await audioBlob.arrayBuffer();
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          const wavArrayBuffer = encodeWAV(audioBuffer);

          let binary = "";
          const bytes = new Uint8Array(wavArrayBuffer);
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const wavBase64 = window.btoa(binary);
          setRecordedAudioBase64(wavBase64);
        } catch {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = (reader.result as string).split(",")[1];
            setRecordedAudioBase64(base64String);
          };
          reader.readAsDataURL(audioBlob);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setVoiceFeedback({
        success: false,
        message: "Permissão de microfone negada ou microfone não detectado.",
      });
    }
  }

  function stopRecording() {
    if (recordingSeconds < MIN_RECORDING_SECONDS) {
      toast.warning(`Grave pelo menos ${MIN_RECORDING_SECONDS} segundos para que a IA capture seu timbre e cadência com clareza.`);
      return;
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  }

  async function handleSendToElevenLabs() {
    const apiKey = settings?.voiceConfig?.elevenLabsApiKey;
    if (!apiKey) {
      setVoiceFeedback({
        success: false,
        message: "Insira a sua API Key da ElevenLabs antes de calibrar a voz.",
      });
      return;
    }
    if (!recordedAudioBase64) {
      setVoiceFeedback({
        success: false,
        message: "Grave uma amostra de áudio pelo microfone antes de enviar.",
      });
      return;
    }

    try {
      setCloningVoice(true);
      setVoiceFeedback(null);
      const res = await window.electronAPI.cloneVoiceElevenLabs?.({
        apiKey,
        voiceName: settings?.voiceConfig?.voiceName || "Minha Voz (Syrius Tech)",
        audioBase64: recordedAudioBase64,
        mimeType: "audio/webm",
      });

      if (res?.success && res.voiceId) {
        updateVoiceConfig({
          provider: "elevenlabs",
          elevenLabsVoiceId: res.voiceId,
          lastCalibratedAt: new Date().toISOString(),
        });
        setVoiceFeedback({
          success: true,
          message: `Voz clonada com sucesso na ElevenLabs! Voice ID: ${res.voiceId}`,
        });
        handleListVoices(apiKey);
      } else {
        setVoiceFeedback({
          success: false,
          message: res?.error || "Erro ao calibrar voz na ElevenLabs.",
        });
      }
    } catch (err) {
      setVoiceFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Erro na comunicação.",
      });
    } finally {
      setCloningVoice(false);
    }
  }

  async function handleImportAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = URL.createObjectURL(file);
      setRecordedAudioUrl(url);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        setRecordedAudioBase64(base64String);
        setVoiceFeedback({
          success: true,
          message: `Arquivo "${file.name}" importado com sucesso! Clique em "Calibrar na ElevenLabs" ou "Salvar Amostra".`,
        });
      };
      reader.readAsDataURL(file);
    } catch {
      setVoiceFeedback({
        success: false,
        message: "Erro ao ler o arquivo de áudio selecionado.",
      });
    }
  }

  async function handleSaveLocalSample() {
    if (!recordedAudioBase64) {
      setVoiceFeedback({
        success: false,
        message: "Grave uma amostra de áudio pelo microfone antes de salvar.",
      });
      return;
    }

    try {
      setCloningVoice(true);
      setVoiceFeedback(null);
      const res = await window.electronAPI.saveLocalVoiceSample?.({
        audioBase64: recordedAudioBase64,
        mimeType: "audio/webm",
      });

      if (res?.success) {
        updateVoiceConfig({
          provider: "local",
          localSampleAudioPath: "voice-lab/amostra.wav",
          lastCalibratedAt: new Date().toISOString(),
        });
        setVoiceFeedback({
          success: true,
          message: `Amostra de voz salva com sucesso em "voice-lab/amostra.wav" para síntese local (XTTS/F5-TTS)!`,
        });
        setShowNewRecording(false);
        loadVoiceAndHardware();
      } else {
        setVoiceFeedback({
          success: false,
          message: res?.error || "Erro ao salvar amostra local.",
        });
      }
    } catch (err) {
      setVoiceFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Erro ao salvar amostra local.",
      });
    } finally {
      setCloningVoice(false);
    }
  }

  async function handleTrainVoiceModel() {
    const activityId = `voice-train-${Date.now()}`;
    const startTime = Date.now();

    registerOrUpdateActivity({
      id: activityId,
      type: "voice_training",
      title: "Treinamento Neural de Voz (Fine-Tuning)",
      subtitle: "Lapidando modelo neural personalizado com amostra de voz na RTX 2060",
      targetPage: "settings",
      status: "running",
      statusMessage: "Iniciando pipeline de calibração neural na GPU...",
      progress: 5,
      startedAt: startTime,
      canStop: true,
    });

    try {
      setIsTrainingModel(true);
      setTrainingProgress(5);
      setTrainingStage("Iniciando pipeline de treinamento neural da sua voz na GPU...");
      setVoiceFeedback(null);

      const unsubscribe = window.electronAPI?.onVoiceTrainProgress?.((data) => {
        setTrainingProgress(data.progress);
        setTrainingStage(data.stage);

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_training",
          title: "Treinamento Neural de Voz (Fine-Tuning)",
          subtitle: "Lapidando modelo neural personalizado com amostra de voz na RTX 2060",
          targetPage: "settings",
          status: "running",
          statusMessage: data.stage,
          progress: data.progress,
          startedAt: startTime,
          canStop: true,
        });
      });

      const res = await window.electronAPI?.trainVoiceModel?.({ epochs: 12 });
      if (unsubscribe) unsubscribe();

      if (res?.success) {
        setVoiceFeedback({
          success: true,
          message: "Modelo neural da sua voz treinado com sucesso! Ficará gravado permanentemente em disco (nunca desaprende após reiniciar o app).",
        });

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_training",
          title: "Treinamento Neural de Voz (Fine-Tuning)",
          subtitle: "Modelo neural salvo em voice-lab/models/minha_voz_calibrada.pth",
          targetPage: "settings",
          status: "completed",
          statusMessage: "Treinamento concluído com sucesso!",
          progress: 100,
          startedAt: startTime,
          canStop: false,
        });

        const status = await window.electronAPI?.getTrainedModelStatus?.();
        if (status) setTrainedModelInfo(status);
        loadVoiceAndHardware();
      } else {
        const errText = res?.error || "Erro durante o treinamento neural da sua voz.";
        setVoiceFeedback({
          success: false,
          message: errText,
        });

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_training",
          title: "Treinamento Neural de Voz (Fine-Tuning)",
          subtitle: "Falha no treinamento neural",
          targetPage: "settings",
          status: "error",
          statusMessage: errText,
          progress: 0,
          startedAt: startTime,
          errorLog: errText,
          canRetry: true,
        });
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : "Erro ao treinar modelo neural.";
      setVoiceFeedback({
        success: false,
        message: errText,
      });

      registerOrUpdateActivity({
        id: activityId,
        type: "voice_training",
        title: "Treinamento Neural de Voz (Fine-Tuning)",
        subtitle: "Falha no treinamento neural",
        targetPage: "settings",
        status: "error",
        statusMessage: errText,
        progress: 0,
        startedAt: startTime,
        errorLog: errText,
        canRetry: true,
      });
    } finally {
      setIsTrainingModel(false);
    }
  }

  async function handleCancelTTS() {
    try {
      if (ttsProgressIntervalRef.current) {
        clearInterval(ttsProgressIntervalRef.current);
        ttsProgressIntervalRef.current = null;
      }
      setTestingTTS(false);
      setTtsProgress(0);
      setTtsProgressStage("");

      if (activeVoiceTask) {
        stopActivity(activeVoiceTask.id);
      }
      if (window.electronAPI?.cancelVoiceTTS) {
        await window.electronAPI.cancelVoiceTTS();
      }

      setVoiceFeedback({
        success: false,
        message: "Síntese de voz interrompida com sucesso.",
      });
    } catch (err) {
      console.error("Erro ao cancelar TTS:", err);
    }
  }

  async function handleTestVoiceTTS() {
    const provider = settings?.voiceConfig?.provider || "elevenlabs";
    const apiKey = settings?.voiceConfig?.elevenLabsApiKey;
    const voiceId = settings?.voiceConfig?.elevenLabsVoiceId;

    if (provider === "elevenlabs" && !apiKey) {
      setVoiceFeedback({
        success: false,
        message: "Insira a sua API Key da ElevenLabs antes de testar ou selecione o modo Edge-TTS (Gratuito).",
      });
      return;
    }

    if (ttsProgressIntervalRef.current) {
      clearInterval(ttsProgressIntervalRef.current);
      ttsProgressIntervalRef.current = null;
    }

    const activityId = `voice-tts-${Date.now()}`;
    const startTime = Date.now();
    const estimatedDuration = provider === "local" ? 22000 : provider === "edge_tts" ? 1800 : 2500;

    registerOrUpdateActivity({
      id: activityId,
      type: "voice_synthesis",
      title: "Síntese de Voz (Voice Studio)",
      subtitle: testTtsText.length > 55 ? `${testTtsText.slice(0, 55)}...` : testTtsText,
      targetPage: "settings",
      status: "running",
      statusMessage: "Iniciando síntese de locução em áudio...",
      progress: 5,
      startedAt: startTime,
      canStop: true,
      meta: { provider, text: testTtsText },
    });

    try {
      setTestingTTS(true);
      setVoiceFeedback(null);
      setSynthesizedAudioUrl(null);
      setTtsProgress(5);
      setTtsProgressStage(
        provider === "local"
          ? "Carregando modelo neural e amostra de voz..."
          : provider === "edge_tts"
          ? "Conectando ao serviço neural Edge-TTS pt-BR..."
          : "Sintetizando voz na API ElevenLabs..."
      );

      ttsProgressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(0.92, elapsed / estimatedDuration);
        const percent = Math.round(5 + ratio * 87);
        setTtsProgress(percent);

        let stage = "Sintetizando áudio...";
        if (provider === "local") {
          if (percent < 25) {
            stage = "Analisando timbre e harmônicos da amostra...";
          } else if (percent < 75) {
            stage = `Calculando difusão acústica com a sua voz (${percent}%)...`;
          } else if (percent < 90) {
            stage = "Reconstruindo áudio HD no vocoder neural...";
          } else {
            stage = "Finalizando e codificando arquivo de áudio...";
          }
        } else if (provider === "edge_tts") {
          stage = "Processando locução neural pt-BR (Edge-TTS)...";
        } else {
          stage = "Sintetizando voz na nuvem ElevenLabs...";
        }
        setTtsProgressStage(stage);

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_synthesis",
          title: "Síntese de Voz (Voice Studio)",
          subtitle: testTtsText.length > 55 ? `${testTtsText.slice(0, 55)}...` : testTtsText,
          targetPage: "settings",
          status: "running",
          statusMessage: stage,
          progress: percent,
          startedAt: startTime,
          canStop: true,
          meta: { provider, text: testTtsText },
        });
      }, 150);

      const res = await window.electronAPI.testVoiceTTS?.({
        apiKey,
        voiceId,
        text: testTtsText,
        provider,
      });

      if (ttsProgressIntervalRef.current) {
        clearInterval(ttsProgressIntervalRef.current);
        ttsProgressIntervalRef.current = null;
      }
      setTtsProgress(100);
      setTtsProgressStage("Síntese concluída com sucesso!");

      if (res?.success && res.audioBase64) {
        setSynthesizedAudioUrl(res.audioBase64);
        setVoiceFeedback({
          success: true,
          message: provider === "edge_tts"
            ? "Áudio sintetizado com sucesso via Edge-TTS (Voz Neural pt-BR)! Ouça no player."
            : provider === "local"
            ? "Áudio sintetizado com sucesso com a sua voz clonada localmente! Ouça no player."
            : "Áudio sintetizado com sucesso com a sua voz via ElevenLabs! Ouça no player.",
        });

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_synthesis",
          title: "Síntese de Voz (Voice Studio)",
          subtitle: testTtsText.length > 55 ? `${testTtsText.slice(0, 55)}...` : testTtsText,
          targetPage: "settings",
          status: "completed",
          statusMessage: `Locução gerada com sucesso (${((Date.now() - startTime) / 1000).toFixed(1)}s)!`,
          progress: 100,
          startedAt: startTime,
          meta: { provider, text: testTtsText, audioBase64: res.audioBase64 },
        });
      } else if (res?.cancelled) {
        setVoiceFeedback({
          success: false,
          message: "Síntese interrompida.",
        });
      } else {
        const errorMsg = res?.error || "Erro ao sintetizar áudio de teste.";
        setVoiceFeedback({
          success: false,
          message: errorMsg,
        });

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_synthesis",
          title: "Síntese de Voz (Voice Studio)",
          subtitle: testTtsText.length > 55 ? `${testTtsText.slice(0, 55)}...` : testTtsText,
          targetPage: "settings",
          status: "error",
          statusMessage: errorMsg,
          progress: 0,
          startedAt: startTime,
          errorLog: errorMsg,
          canRetry: true,
          meta: { provider, text: testTtsText },
        });
      }
    } catch (err) {
      if (ttsProgressIntervalRef.current) {
        clearInterval(ttsProgressIntervalRef.current);
        ttsProgressIntervalRef.current = null;
      }
      const errorMsg = err instanceof Error ? err.message : "Erro no teste de áudio.";
      if (errorMsg !== "CANCELLED_BY_USER") {
        setVoiceFeedback({
          success: false,
          message: errorMsg,
        });

        registerOrUpdateActivity({
          id: activityId,
          type: "voice_synthesis",
          title: "Síntese de Voz (Voice Studio)",
          subtitle: testTtsText.length > 55 ? `${testTtsText.slice(0, 55)}...` : testTtsText,
          targetPage: "settings",
          status: "error",
          statusMessage: errorMsg,
          progress: 0,
          startedAt: startTime,
          errorLog: errorMsg,
          canRetry: true,
          meta: { provider, text: testTtsText },
        });
      }
    } finally {
      if (ttsProgressIntervalRef.current) {
        clearInterval(ttsProgressIntervalRef.current);
        ttsProgressIntervalRef.current = null;
      }
      setTimeout(() => {
        setTestingTTS(false);
      }, 400);
    }
  }

  async function handleListVoices(customKey?: string) {
    const apiKey = customKey || settings?.voiceConfig?.elevenLabsApiKey;
    if (!apiKey) return;
    try {
      setLoadingVoices(true);
      const res = await window.electronAPI.listElevenLabsVoices?.(apiKey);
      if (res?.success && res.voices) {
        setExistingVoices(res.voices);
      }
    } catch {
      // ignore
    } finally {
      setLoadingVoices(false);
    }
  }

  async function handleSyncProfile() {
    try {
      setSyncingProfile(true);
      const res = await window.electronAPI.getProfile?.();
      if (res?.success && res.profile) {
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
        toast.success(`Perfil @${res.profile.username} sincronizado com sucesso da Meta API!`);
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        toast.error(`Erro ao sincronizar perfil: ${res?.error || "Não foi possível consultar a Meta API"}`);
      }
    } catch (err) {
      toast.error(`Erro ao sincronizar: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setSyncingProfile(false);
    }
  }

  async function handleGenerateBio() {
    if (!settings) return;
    try {
      setGeneratingBio(true);
      const res = await window.electronAPI.generateBio?.({
        niche: settings.niche,
        positioning: settings.positioning,
        accountName: settings.accountName,
      });

      if (res?.success && res.bios) {
        setGeneratedBios(res.bios);
        toast.success("Sugestões de Biografia geradas com sucesso!");
      } else {
        toast.error(`Erro ao gerar bio: ${res?.error || "Falha na geração"}`);
      }
    } catch (err) {
      toast.error(`Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
    } finally {
      setGeneratingBio(false);
    }
  }

  async function handleSendTestEmail() {
    try {
      setSendingTestEmail(true);
      setTestEmailFeedback(null);
      if (settings) {
        await window.electronAPI.saveSettings?.(settings);
      }
      const res = await window.electronAPI.sendTestEmail?.(settings?.notificationEmail || "");
      setTestEmailFeedback(res);
    } catch (err) {
      setTestEmailFeedback({
        success: false,
        message: err instanceof Error ? err.message : "Erro ao enviar e-mail de teste.",
      });
    } finally {
      setSendingTestEmail(false);
    }
  }

  const [testingManagerVoiceId, setTestingManagerVoiceId] = useState<string | null>(null);
  const managerAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  function updateManagerConfig(patch: Partial<NonNullable<AppSettings["agencyManager"]>>) {
    setSettings((curr) => {
      if (!curr) return curr;
      const currentManager = curr.agencyManager || {
        name: "Clara",
        roleTitle: "HEAD EDITORIAL SYRIUS",
        edgeTtsVoice: "pt-BR-FranciscaNeural",
      };
      return {
        ...curr,
        agencyManager: {
          ...currentManager,
          ...patch,
        },
      };
    });
  }

  async function handlePreviewManagerVoice(voiceId: string) {
    try {
      setTestingManagerVoiceId(voiceId);
      const testText = `Olá! Sou ${settings?.agencyManager?.name || "Clara"}, seu gestor editorial aqui na Syrius. Como posso ajudar com suas próximas pautas?`;
      const res = await window.electronAPI.agencyPreviewVoice?.({
        voice: voiceId,
        text: testText,
      });
      if (res?.success && res.audioPath) {
        if (managerAudioPlayerRef.current) {
          managerAudioPlayerRef.current.pause();
        }
        const audio = new Audio(`media://${res.audioPath}`);
        managerAudioPlayerRef.current = audio;
        audio.onended = () => setTestingManagerVoiceId(null);
        audio.onerror = () => setTestingManagerVoiceId(null);
        audio.play().catch(() => setTestingManagerVoiceId(null));
      } else {
        setTestingManagerVoiceId(null);
      }
    } catch {
      setTestingManagerVoiceId(null);
    }
  }

  if (loading || !settings) {
    return (
      <div className="empty-state">
        <IconLoader className="spin" size={32} />
        <p>Carregando configurações...</p>
      </div>
    );
  }

  const currentProvider = settings.voiceConfig?.provider || "elevenlabs";

  return (
    <div className="settings-page">
      {/* HEADER PRINCIPAL */}
      <div className="page-header">
        <div>
          <span className="eyebrow">PREFERÊNCIAS & MARCA</span>
          <h2>Configurações do Sistema</h2>
          <p>Personalize os pilares editoriais da sua marca, clonagem de voz, automações e modelos de IA.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => handleSave()}
          disabled={saving}
          style={{ minWidth: "160px" }}
        >
          {saving ? (
            <>
              <IconLoader className="spin" size={14} />
              <span>Salvando...</span>
            </>
          ) : (
            <>
              <IconCheck size={14} />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </div>

      {/* TOAST DE FEEDBACK */}
      {successMessage && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#34d399",
            padding: "12px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(16, 185, 129, 0.2)",
          }}
        >
          <IconCheck size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* BARRA DE NAVEGAÇÃO EM ABAS (PILLS) */}
      <div className="settings-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`settings-tab-btn ${activeTab === "profile" ? "active-cyan" : ""}`}
        >
          <IconSettings size={15} />
          <span>Perfil & Marca</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("agency")}
          className={`settings-tab-btn ${activeTab === "agency" ? "active-purple" : ""}`}
        >
          <IconSparkles size={15} />
          <span>Gestor Editorial (Agência)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("voice");
            if (settings.voiceConfig?.elevenLabsApiKey && existingVoices.length === 0) {
              handleListVoices();
            }
          }}
          className={`settings-tab-btn ${activeTab === "voice" ? "active-purple" : ""}`}
        >
          <IconMic size={15} />
          <span>Clonagem de Voz & Reels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`settings-tab-btn ${activeTab === "analytics" ? "active-cyan" : ""}`}
        >
          <IconCalendar size={15} />
          <span>Agendamento de Análise</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("models")}
          className={`settings-tab-btn ${activeTab === "models" ? "active-cyan" : ""}`}
        >
          <IconCpu size={15} />
          <span>Modelos de IA & Motor</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("email")}
          className={`settings-tab-btn ${activeTab === "email" ? "active-cyan" : ""}`}
        >
          <IconMail size={15} />
          <span>Notificações & SMTP</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA: GESTOR EDITORIAL (SALA DE REUNIÃO)                  */}
      {/* ======================================================== */}
      {activeTab === "agency" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Identidade do Gestor Editorial</h3>
                <p>Personalize quem lidera a Sala de Reunião, analisa pautas com você e despacha a produção para o pipeline.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div className="settings-form-group">
                <label>Nome do Gestor / Gestora</label>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.agencyManager?.name || "Clara"}
                  onChange={(e) => updateManagerConfig({ name: e.target.value })}
                  placeholder="Ex: Clara, Helena, Lucas, Sofia..."
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Este nome será usado no chat da Sala de Reunião, nas notificações e na barra lateral.
                </span>
              </div>

              <div className="settings-form-group">
                <label>Cargo / Título Oficial</label>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.agencyManager?.roleTitle || "HEAD EDITORIAL SYRIUS"}
                  onChange={(e) => updateManagerConfig({ roleTitle: e.target.value })}
                  placeholder="Ex: HEAD EDITORIAL SYRIUS"
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Título exibido no cabeçalho e nos crachás do gestor.
                </span>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Voz Neural do Gestor (Edge TTS)</h3>
                <p>Escolha a voz neural brasileira usada nas respostas faladas da Sala de Reunião (100% gratuita e local).</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
              {EDGE_TTS_MANAGER_VOICES.map((v) => {
                const isSelected = (settings.agencyManager?.edgeTtsVoice || "pt-BR-FranciscaNeural") === v.id;
                const isPlaying = testingManagerVoiceId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => updateManagerConfig({ edgeTtsVoice: v.id })}
                    style={{
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: isSelected ? "rgba(236, 72, 153, 0.1)" : "var(--bg-surface)",
                      border: isSelected ? "1px solid rgba(236, 72, 153, 0.4)" : "1px solid var(--border-card)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "10px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "13px", color: isSelected ? "#f472b6" : "var(--text-primary)" }}>
                          {v.name}
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: v.gender === "Feminina" ? "rgba(236, 72, 153, 0.15)" : "rgba(56, 189, 248, 0.15)",
                            color: v.gender === "Feminina" ? "#f472b6" : "#38bdf8",
                            fontWeight: "700",
                          }}
                        >
                          {v.gender}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>
                        {v.desc}
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontSize: "11px", color: isSelected ? "#f472b6" : "var(--text-muted)", fontWeight: isSelected ? "700" : "400" }}>
                        {isSelected ? "Selecionada" : "Clique para selecionar"}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewManagerVoice(v.id);
                        }}
                        style={{
                          background: isPlaying ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)",
                          border: `1px solid ${isPlaying ? "rgba(239, 68, 68, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
                          color: isPlaying ? "#f87171" : "#fafafa",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {isPlaying ? <IconLoader className="spin" size={10} /> : <IconPlay size={10} />}
                        <span>{isPlaying ? "Ouvindo..." : "Testar Voz"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 1: PERFIL & IDENTIDADE DE MARCA                      */}
      {/* ======================================================== */}
      {activeTab === "profile" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Identidade do Instagram</h3>
                <p>Dados de identificação e posicionamento público do seu perfil oficial.</p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleSyncProfile}
                disabled={syncingProfile}
                style={{ fontSize: "12px", padding: "7px 14px" }}
              >
                {syncingProfile ? <IconLoader className="spin" size={13} /> : <IconRotateCcw size={13} />}
                <span>Sincronizar com Instagram</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div className="settings-form-group">
                <label>Instagram Handle</label>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.instagramHandle}
                  onChange={(e) => setSettings({ ...settings, instagramHandle: e.target.value })}
                  placeholder="@syrius_tech"
                />
              </div>

              <div className="settings-form-group">
                <label>Nome de Exibição</label>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.accountName}
                  onChange={(e) => setSettings({ ...settings, accountName: e.target.value })}
                  placeholder="Syrius Tech"
                />
              </div>
            </div>

            <div className="settings-form-group">
              <label>Nicho / Especialidade Técnica</label>
              <input
                type="text"
                className="settings-input"
                value={settings.niche}
                onChange={(e) => setSettings({ ...settings, niche: e.target.value })}
                placeholder="Engenharia de Software, Backend, Cloud & Arquitetura"
              />
            </div>

            <div className="settings-form-group" style={{ marginBottom: 0 }}>
              <label>Biografia / Posicionamento Atual</label>
              <textarea
                className="settings-textarea"
                rows={4}
                value={settings.positioning}
                onChange={(e) => setSettings({ ...settings, positioning: e.target.value })}
                placeholder="Descreva o foco e a proposta de valor do perfil..."
              />
            </div>
          </div>

          {/* GERADOR DE BIOGRAFIAS COM IA */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Gerador de Biografia de Alta Autoridade (IA)</h3>
                <p>Gera propostas concisas sem clichês de autoajuda para seu perfil.</p>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={handleGenerateBio}
                disabled={generatingBio}
                style={{ fontSize: "12px", padding: "7px 14px", background: "linear-gradient(135deg, #0ea5e9, #2563eb)" }}
              >
                {generatingBio ? <IconLoader className="spin" size={13} /> : <IconSparkles size={13} />}
                <span>Gerar 3 Ideias</span>
              </button>
            </div>

            {generatedBios.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {generatedBios.map((bio, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-card)",
                      borderRadius: "10px",
                      padding: "14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "14px",
                    }}
                  >
                    <pre
                      style={{
                        fontFamily: "inherit",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        whiteSpace: "pre-wrap",
                        margin: 0,
                        lineHeight: "1.6",
                      }}
                    >
                      {bio}
                    </pre>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          navigator.clipboard.writeText(bio);
                          setCopiedIndex(idx);
                          setTimeout(() => setCopiedIndex(null), 2000);
                        }}
                        style={{ padding: "6px 10px", fontSize: "11px" }}
                      >
                        {copiedIndex === idx ? <IconCheck size={12} /> : <IconCopy size={12} />}
                        <span>{copiedIndex === idx ? "Copiado!" : "Copiar"}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => {
                          setSettings({ ...settings, positioning: bio });
                          setSuccessMessage("Bio aplicada ao Posicionamento!");
                          setTimeout(() => setSuccessMessage(null), 2500);
                        }}
                        style={{ padding: "6px 12px", fontSize: "11px" }}
                      >
                        <span>Aplicar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: CLONAGEM DE VOZ & REELS (VOICE STUDIO)            */}
      {/* ======================================================== */}
      {activeTab === "voice" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* BANNER INFORMATIVO */}
          <div className="voice-banner">
            <div>
              <strong style={{ fontSize: "15px", color: "#fafafa", display: "block", marginBottom: "4px" }}>
                Voice Studio: Locução e Clonagem de Voz para Reels
              </strong>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                Clone a sua voz nativamente em português brasileiro (F5-TTS pt-BR) ou use a nuvem ElevenLabs / Edge-TTS.
              </p>
            </div>
          </div>

          {/* FEEDBACK DE VOZ */}
          {voiceFeedback && (
            <div
              style={{
                background: voiceFeedback.success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${voiceFeedback.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                color: voiceFeedback.success ? "#34d399" : "#f87171",
                padding: "14px 18px",
                borderRadius: "10px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {voiceFeedback.success ? <IconCheck size={16} /> : <IconX size={16} />}
              <span>{voiceFeedback.message}</span>
            </div>
          )}

          {/* CONFIGURAÇÃO DA ENGINE DE VOZ */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3 style={{ margin: 0 }}>Provedor de Voz & Opções</h3>
                <p style={{ margin: "2px 0 0" }}>Escolha entre clonagem personalizada da sua voz (Local / ElevenLabs) ou voz neural nativa gratuita (Edge-TTS).</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div className="settings-form-group">
                <label>Provedor de Síntese</label>
                <select
                  className="settings-input"
                  value={currentProvider}
                  onChange={(e) => updateVoiceConfig({ provider: e.target.value as any })}
                >
                  <option value="local">Modelo Local Brasileiro (F5-TTS pt-BR)</option>
                  <option value="elevenlabs">ElevenLabs (Clonagem Instantânea por API)</option>
                  <option value="edge_tts">Edge-TTS (Voz Neural pt-BR 100% Gratuita)</option>
                  <option value="disabled">Desativado (Sem locução em áudio)</option>
                </select>
              </div>

              <div className="settings-form-group">
                <label>Identificação da Voz</label>
                <input
                  type="text"
                  className="settings-input"
                  value={settings.voiceConfig?.voiceName || (currentProvider === "edge_tts" ? "Antônio (pt-BR Neural)" : "Minha Voz (Syrius Tech)")}
                  onChange={(e) => updateVoiceConfig({ voiceName: e.target.value })}
                  placeholder="Minha Voz (Syrius Tech)"
                />
              </div>
            </div>

            {/* SE ELEVENLABS: MOSTRA CREDENCIAIS E LISTA */}
            {currentProvider === "elevenlabs" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                  <div className="settings-form-group">
                    <label>ElevenLabs API Key</label>
                    <input
                      type="password"
                      className="settings-input"
                      value={settings.voiceConfig?.elevenLabsApiKey || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateVoiceConfig({ elevenLabsApiKey: val });
                        if (val.length > 20) {
                          handleListVoices(val);
                        }
                      }}
                      placeholder="xi-api-key..."
                    />
                  </div>

                  <div className="settings-form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <label style={{ margin: 0 }}>Voz da Conta (Voice ID)</label>
                      <button
                        type="button"
                        onClick={() => handleListVoices()}
                        disabled={loadingVoices}
                        style={{ background: "none", border: "none", color: "#38bdf8", fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      >
                        <IconRefreshCw size={11} className={loadingVoices ? "spin" : ""} />
                        <span>{loadingVoices ? "Carregando..." : "Atualizar Vozes da Conta"}</span>
                      </button>
                    </div>
                    {existingVoices.length > 0 ? (
                      <select
                        className="settings-input"
                        value={settings.voiceConfig?.elevenLabsVoiceId || ""}
                        onChange={(e) => {
                          const selectedId = e.target.value;
                          const found = existingVoices.find((v) => v.voice_id === selectedId);
                          updateVoiceConfig({
                            elevenLabsVoiceId: selectedId,
                            voiceName: found ? found.name : settings.voiceConfig?.voiceName,
                          });
                        }}
                      >
                        <option value="">Selecione uma voz autorizada da sua conta...</option>
                        {existingVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>
                            {v.name} ({v.voice_id.slice(0, 8)}...)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        className="settings-input"
                        value={settings.voiceConfig?.elevenLabsVoiceId || ""}
                        onChange={(e) => updateVoiceConfig({ elevenLabsVoiceId: e.target.value })}
                        placeholder="Clique em 'Atualizar Vozes da Conta' ou cole o Voice ID"
                      />
                    )}
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "16px", background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "6px", padding: "8px 12px" }}>
                  💡 <strong>Dica ElevenLabs Free Tier:</strong> Contas gratuitas da ElevenLabs só podem gerar áudio usando as <em>vozes padrão nativas da sua conta</em> (clique em <strong>Atualizar Vozes da Conta</strong> acima para listar). Para clonar sua própria voz gratuitamente e sem limites, escolha <strong>Edge-TTS</strong> ou <strong>Modelo Local</strong> no seletor de provedor.
                </div>
              </div>
            )}

            {/* SE MODELO LOCAL: SELETOR DE DISPOSITIVO (AUTO / GPU / CPU) E SLIDER NFE COM PRÓS E CONTRAS */}
            {currentProvider === "local" && (() => {
              const currentNFE = settings.voiceConfig?.nfeSteps || 12;
              const currentDevice = settings.voiceConfig?.devicePreference || "auto";

              function getNfeAnalysis(nfe: number) {
                if (nfe <= 8) {
                  return {
                    tier: "Rápido / Modo Econômico",
                    color: "#34d399",
                    fidelity: "90% (Voz clara e direta)",
                    timeEstimate: "~8-14s no CPU / ~0.8s na GPU",
                    cpuUsage: "60-70% (Carga leve)",
                    gpuUsage: "25-35%",
                    pros: [
                      "Processamento ultra veloz ideal para testes e iterações rápidas",
                      "Menor aquecimento da máquina e baixo consumo de memória RAM",
                      "Excelente para computadores rodando múltiplas tarefas ao mesmo tempo",
                    ],
                    cons: [
                      "Pode suavizar pequenas nuances de respiração e pausas sutis",
                      "Voz ligeiramente mais direta em termos de entonação",
                    ],
                  };
                }
                if (nfe <= 16) {
                  return {
                    tier: "Equilibrado (Padrão Recomendado)",
                    color: "#38bdf8",
                    fidelity: "98% (Excelente naturalidade e timbre)",
                    timeEstimate: "~15-28s no CPU / ~1.5s na GPU",
                    cpuUsage: "75-85% (Carga balanceada)",
                    gpuUsage: "45-55%",
                    pros: [
                      "Padrão ouro: equilíbrio perfeito entre naturalidade, pausas e velocidade",
                      "Timbre e cadência praticamente idênticos à sua amostra original gravada",
                      "Recomendado para a maioria dos Reels técnicos",
                    ],
                    cons: [
                      "Leva alguns segundos adicionais de processamento em relação ao modo rápido",
                    ],
                  };
                }
                return {
                  tier: "Ultra Fidelidade / Studio Master",
                  color: "#c084fc",
                  fidelity: "99.8% (Qualidade Máxima de Estúdio)",
                  timeEstimate: "~45-90s no CPU / ~3-5s na GPU",
                  cpuUsage: "95%+ (Carga intensa)",
                  gpuUsage: "75-85%",
                  pros: [
                    "Máxima resolução acústica, riqueza harmônica e micro-detalhes de fala",
                    "Ideal para narrações institucionais ou vídeos de alta relevância comercial",
                  ],
                  cons: [
                    "Tempo de processamento elevado na CPU (pode levar mais de 1 minuto)",
                    "Maior consumo térmico e de memória durante a geração",
                  ],
                };
              }

              const analysis = getNfeAnalysis(currentNFE);

              return (
                <div style={{ marginTop: "16px", padding: "16px", background: "var(--bg-surface)", borderRadius: "10px", border: "1px solid var(--border-card)" }}>
                  {/* SELEÇÃO DO DISPOSITIVO DE COMPUTAÇÃO */}
                  <div style={{ marginBottom: "18px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "8px" }}>
                      Dispositivo de Processamento (Hardware Dispatcher)
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
                      {[
                        {
                          id: "auto",
                          title: "⚡ Automático (Recomendado)",
                          desc: "Usa GPU se houver VRAM livre, senão faz fallback seguro para CPU",
                          badge: "Inteligente",
                          badgeColor: "#38bdf8",
                        },
                        {
                          id: "cuda",
                          title: "🎮 Forçar GPU (NVIDIA / CUDA)",
                          desc: "Aceleração máxima por placa de vídeo (~1-2s)",
                          badge: "Ultra Rápido",
                          badgeColor: "#34d399",
                        },
                        {
                          id: "cpu",
                          title: "🛡️ Forçar CPU (AMD Ryzen 5)",
                          desc: "Processamento por processador (baixo uso de VRAM)",
                          badge: "Econômico",
                          badgeColor: "#fbbf24",
                        },
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => updateVoiceConfig({ devicePreference: item.id as any })}
                          style={{
                            padding: "12px 14px",
                            borderRadius: "8px",
                            background: currentDevice === item.id ? "rgba(56, 189, 248, 0.12)" : "rgba(255, 255, 255, 0.03)",
                            border: currentDevice === item.id ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "700", color: currentDevice === item.id ? "#38bdf8" : "var(--text-primary)" }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: "10px", color: item.badgeColor, background: `${item.badgeColor}20`, padding: "2px 6px", borderRadius: "4px", fontWeight: "700" }}>
                              {item.badge}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.3 }}>
                            {item.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SLIDER DE NFE (PASSOS DE DIFUSÃO ACÚSTICA) */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <div>
                        <label style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                          Passos de Amostragem Acústica (NFE)
                        </label>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginLeft: "8px" }}>
                          (Número de ciclos de lapidação da voz)
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "800",
                          fontFamily: "monospace",
                          color: analysis.color,
                          background: `${analysis.color}18`,
                          border: `1px solid ${analysis.color}40`,
                          padding: "3px 10px",
                          borderRadius: "6px",
                        }}
                      >
                        NFE = {currentNFE} ({analysis.tier})
                      </span>
                    </div>

                    <input
                      type="range"
                      min={6}
                      max={32}
                      step={2}
                      value={currentNFE}
                      onChange={(e) => updateVoiceConfig({ nfeSteps: parseInt(e.target.value, 10) })}
                      style={{
                        width: "100%",
                        height: "6px",
                        borderRadius: "3px",
                        accentColor: analysis.color,
                        cursor: "pointer",
                        marginBottom: "12px",
                      }}
                    />

                    {/* MÉTRICAS DE ESTIMATIVA DO NFE */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "8px", marginBottom: "12px" }}>
                      <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Fidelidade do Timbre</span>
                        <strong style={{ fontSize: "11px", color: analysis.color }}>{analysis.fidelity}</strong>
                      </div>
                      <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Tempo de Síntese</span>
                        <strong style={{ fontSize: "11px", color: "var(--text-primary)" }}>{analysis.timeEstimate}</strong>
                      </div>
                      <div style={{ padding: "8px 10px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", display: "block" }}>Uso Médio CPU / GPU</span>
                        <strong style={{ fontSize: "11px", color: "var(--text-primary)" }}>{analysis.cpuUsage}</strong>
                      </div>
                    </div>

                    {/* VANTAGENS E DESVANTAGENS DINÂMICAS */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div style={{ padding: "10px 12px", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px" }}>
                        <strong style={{ fontSize: "11px", color: "#34d399", display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                          <IconCheck size={13} />
                          <span>Vantagens deste ajuste:</span>
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#d1fae5", lineHeight: 1.4 }}>
                          {analysis.pros.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ padding: "10px 12px", background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
                        <strong style={{ fontSize: "11px", color: "#f87171", display: "flex", alignItems: "center", gap: "4px", marginBottom: "6px" }}>
                          <IconAlertTriangle size={13} />
                          <span>Pontos de atenção:</span>
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "#fee2e2", lineHeight: 1.4 }}>
                          {analysis.cons.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* AMOSTRA DE VOZ GRAVADA ATUAL (PLAYER DE AUDIÇÃO) */}
          {savedVoiceSample?.exists && savedVoiceSample.audioBase64 && currentProvider !== "edge_tts" && (
            <div
              className="settings-card"
              style={{
                background: "linear-gradient(135deg, rgba(192, 132, 252, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)",
                borderColor: "rgba(192, 132, 252, 0.35)",
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(192, 132, 252, 0.2)", color: "#c084fc", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconMic size={16} />
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text-primary)" }}>
                      Amostra de Voz Calibrada Atual
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-secondary)" }}>
                      Arquivo: <code style={{ color: "#c084fc", background: "rgba(192, 132, 252, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>{savedVoiceSample.samplePath || "voice-lab/amostra.wav"}</code> ({savedVoiceSample.sizeKb || 0} KB)
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#34d399",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <IconCheck size={12} />
                  <span>Voz Pronta para Síntese</span>
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <audio controls src={savedVoiceSample.audioBase64} style={{ height: "36px", flex: 1, minWidth: "220px" }} />
                <button
                  type="button"
                  onClick={() => setShowNewRecording((prev) => !prev)}
                  className="btn-secondary"
                  style={{ padding: "8px 14px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <IconRefreshCw size={13} />
                  <span>{showNewRecording ? "Ocultar Gravador" : "Gravar Nova Amostra (Substituir)"}</span>
                </button>
              </div>
            </div>
          )}

          {/* CARD DE TREINAMENTO NEURAL DEDICADO NA GPU (FINE-TUNING DA SUA VOZ) */}
          {currentProvider === "local" && savedVoiceSample?.exists && (
            <div
              className="settings-card"
              style={{
                borderColor: trainedModelInfo?.trained ? "rgba(16, 185, 129, 0.4)" : "rgba(139, 92, 246, 0.4)",
                background: trainedModelInfo?.trained
                  ? "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(6, 78, 59, 0.08) 100%)"
                  : "linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, rgba(99, 102, 241, 0.04) 100%)",
              }}
            >
              <div className="settings-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: trainedModelInfo?.trained ? "rgba(16, 185, 129, 0.2)" : "rgba(139, 92, 246, 0.2)",
                      color: trainedModelInfo?.trained ? "#34d399" : "#a78bfa",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCpu size={16} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0 }}>Estúdio de Treinamento Neural da Sua Voz (Fine-Tuning na GPU)</h3>
                    <p style={{ margin: "2px 0 0" }}>
                      Treina um modelo neural dedicado com a física das suas cordas vocais e salva permanentemente no seu PC.
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "11px",
                    background: trainedModelInfo?.trained ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    border: `1px solid ${trainedModelInfo?.trained ? "rgba(16, 185, 129, 0.35)" : "rgba(245, 158, 11, 0.35)"}`,
                    color: trainedModelInfo?.trained ? "#34d399" : "#fbbf24",
                    padding: "5px 10px",
                    borderRadius: "6px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {trainedModelInfo?.trained ? (
                    <>
                      <IconCheck size={12} />
                      <span>Modelo Neural Dedicado Ativo</span>
                    </>
                  ) : (
                    <>
                      <IconAlertTriangle size={12} />
                      <span>Modelo Ainda Não Treinado</span>
                    </>
                  )}
                </span>
              </div>

              {/* DETALHES DO MODELO SE JÁ TREINADO */}
              {trainedModelInfo?.trained && (
                <div
                  style={{
                    marginBottom: "14px",
                    padding: "12px 14px",
                    background: "rgba(0, 0, 0, 0.3)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block" }}>Arquivo de Pesos:</span>
                    <strong style={{ color: "#38bdf8" }}>{trainedModelInfo.modelPath}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block" }}>Tamanho do Modelo:</span>
                    <strong style={{ color: "#34d399" }}>{trainedModelInfo.sizeMb} MB</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block" }}>Épocas / Perda (Loss):</span>
                    <strong style={{ color: "var(--text-primary)" }}>{trainedModelInfo.epochs} épocas (Loss: {trainedModelInfo.finalLoss})</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)", display: "block" }}>Último Treino:</span>
                    <strong style={{ color: "var(--text-primary)" }}>{trainedModelInfo.trainedAt?.slice(0, 16).replace("T", " ")}</strong>
                  </div>
                </div>
              )}

              {/* NOTA DE PERSISTÊNCIA PERMANENTE */}
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(56, 189, 248, 0.08)",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#93c5fd",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <IconSparkles size={15} color="#38bdf8" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Persistência Permanente:</strong> Este modelo fica gravado no seu disco rígido. Ao fechar ou reiniciar o computador/aplicativo, <strong>a IA nunca desaprende sua voz</strong> e carrega seus pesos neurais em menos de 1 segundo.
                </span>
              </div>

              {/* PROGRESSO DO TREINAMENTO SE EM ANDAMENTO */}
              {isTrainingModel && (
                <div style={{ marginBottom: "14px", padding: "14px 16px", background: "rgba(0, 0, 0, 0.5)", borderRadius: "8px", border: "1px solid rgba(139, 92, 246, 0.4)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#c084fc", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <IconLoader className="spin" size={14} />
                      <span>{trainingStage || "Processando treinamento neural na GPU..."}</span>
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: "#34d399" }}>
                      {trainingProgress}%
                    </span>
                  </div>

                  <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${trainingProgress}%`,
                        height: "100%",
                        background: "linear-gradient(90deg, #8b5cf6, #c084fc, #38bdf8)",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* BOTÃO DE INICIAR / RE-TREINAR */}
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleTrainVoiceModel}
                  disabled={isTrainingModel}
                  className="primary-button"
                  style={{
                    background: trainedModelInfo?.trained
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    color: "#fff",
                    padding: "10px 18px",
                    fontWeight: "700",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isTrainingModel ? (
                    <>
                      <IconLoader className="spin" size={15} />
                      <span>Treinando Modelo na RTX 2060 ({trainingProgress}%)...</span>
                    </>
                  ) : trainedModelInfo?.trained ? (
                    <>
                      <IconRefreshCw size={15} />
                      <span>Re-treinar Modelo com Esta Amostra</span>
                    </>
                  ) : (
                    <>
                      <IconCpu size={15} />
                      <span>🚀 Iniciar Treinamento Neural da Minha Voz (RTX 2060)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* GRAVADOR DE MICROFONE INTEGRADO & CALIBRAÇÃO (Exibido se não tiver amostra OU se o usuário clicar em Substituir) */}
          {currentProvider !== "edge_tts" && currentProvider !== "disabled" && (!savedVoiceSample?.exists || showNewRecording) ? (
            <div className="settings-card" style={{ borderColor: "rgba(192, 132, 252, 0.35)" }}>
              <div className="settings-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      background: "rgba(192, 132, 252, 0.2)",
                      color: "#c084fc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconMic size={16} />
                  </span>
                  <div>
                    <h3 style={{ margin: 0 }}>Gravador de Voz & Amostra de Treinamento (3 Minutos)</h3>
                    <p style={{ margin: "2px 0 0" }}>Grave a leitura contínua do roteiro completo para alimentar o treinamento neural.</p>
                  </div>
                </div>
                {isRecording && (
                  <div className="recording-pulse">
                    <span className="recording-dot" />
                    <span>GRAVANDO: {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</span>
                  </div>
                )}
              </div>

              <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>
                Leia o roteiro completo abaixo em tom firme e natural bem próximo ao microfone:
              </p>

              {/* ROTEIRO DE LEITURA (TELEPROMPTER) */}
              <div className="teleprompter-box" style={{ maxHeight: "220px", overflowY: "auto", lineHeight: "1.6" }}>
                "{VOICE_READING_SCRIPT}"
              </div>

              {/* BARRA DE PROGRESSO DO TEMPO DE TREINAMENTO (META 3 MINUTOS) */}
              {isRecording && (
                <div style={{ marginBottom: "18px", padding: "12px 14px", background: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-card)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12px", fontWeight: "700" }}>
                    <span style={{ color: recordingSeconds >= MIN_RECORDING_SECONDS ? "#34d399" : "#f59e0b" }}>
                      {recordingSeconds >= TARGET_TRAINING_SECONDS
                        ? `Meta ideal de 3 minutos atingida (${recordingSeconds}s gravados)! Perfeito para treino de alta fidelidade.`
                        : recordingSeconds >= MIN_RECORDING_SECONDS
                        ? `Mínimo de 45s atingido (${recordingSeconds}s gravados)! Continue lendo até os 3 minutos para máxima precisão.`
                        : `Gravando: ${recordingSeconds}s / ${MIN_RECORDING_SECONDS}s (Faltam ${MIN_RECORDING_SECONDS - recordingSeconds}s para desbloquear)`}
                    </span>
                    <span style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>
                      {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")} / 03:00
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, (recordingSeconds / TARGET_TRAINING_SECONDS) * 100)}%`,
                        height: "100%",
                        background: recordingSeconds >= TARGET_TRAINING_SECONDS
                          ? "linear-gradient(90deg, #10b981, #34d399)"
                          : recordingSeconds >= MIN_RECORDING_SECONDS
                          ? "linear-gradient(90deg, #38bdf8, #818cf8)"
                          : "linear-gradient(90deg, #ef4444, #f59e0b)",
                        transition: "width 0.25s linear",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CONTROLES DO GRAVADOR */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                {!isRecording ? (
                  <>
                    <button
                      type="button"
                      onClick={startRecording}
                      className="btn-record"
                    >
                      <IconMic size={15} />
                      <span>{recordedAudioUrl ? "Gravar Novamente (Novo Áudio)" : "Iniciar Gravação de 3 Minutos"}</span>
                    </button>

                    <label
                      className="btn-secondary"
                      style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", margin: 0, padding: "10px 16px" }}
                      title="Importar um arquivo de áudio gravado previamente"
                    >
                      <IconUpload size={15} />
                      <span>Importar Arquivo (.wav / .mp3)</span>
                      <input
                        type="file"
                        accept="audio/*"
                        style={{ display: "none" }}
                        onChange={handleImportAudioFile}
                      />
                    </label>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    disabled={recordingSeconds < MIN_RECORDING_SECONDS}
                    className={recordingSeconds >= MIN_RECORDING_SECONDS ? "btn-stop-record" : "btn-secondary"}
                    style={{
                      opacity: recordingSeconds < MIN_RECORDING_SECONDS ? 0.6 : 1,
                      cursor: recordingSeconds < MIN_RECORDING_SECONDS ? "not-allowed" : "pointer",
                    }}
                    title={recordingSeconds < MIN_RECORDING_SECONDS ? `Aguarde completar ${MIN_RECORDING_SECONDS} segundos` : "Finalizar gravação"}
                  >
                    <IconStop size={15} />
                    <span>
                      {recordingSeconds < MIN_RECORDING_SECONDS
                        ? `Gravando (${MIN_RECORDING_SECONDS - recordingSeconds}s restantes)...`
                        : "Finalizar Gravação"}
                    </span>
                  </button>
                )}

                {/* AMOSTRA GRAVADA E BOTÕES DE ENVIO */}
                {recordedAudioUrl && !isRecording && (
                  <>
                    <audio controls src={recordedAudioUrl} style={{ height: "38px" }} />

                    {/* BOTAO PARA SALVAR AMOSTRA LOCAL */}
                    <button
                      type="button"
                      onClick={handleSaveLocalSample}
                      disabled={cloningVoice}
                      className="primary-button"
                      style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff", padding: "10px 18px" }}
                    >
                      {cloningVoice ? (
                        <>
                          <IconLoader className="spin" size={14} />
                          <span>Salvando Amostra...</span>
                        </>
                      ) : (
                        <>
                          <IconSparkles size={14} />
                          <span>Salvar Amostra de Treinamento</span>
                        </>
                      )}
                    </button>

                    {/* BOTAO PARA ELEVENLABS */}
                    {settings.voiceConfig?.elevenLabsApiKey && (
                      <button
                        type="button"
                        onClick={handleSendToElevenLabs}
                        disabled={cloningVoice}
                        className="primary-button"
                        style={{ background: "#0ea5e9", color: "#fff", padding: "10px 18px" }}
                      >
                        {cloningVoice ? (
                          <>
                            <IconLoader className="spin" size={14} />
                            <span>Enviando para ElevenLabs...</span>
                          </>
                        ) : (
                          <>
                            <IconSend size={14} />
                            <span>Calibrar na ElevenLabs</span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : currentProvider === "edge_tts" ? (
            <div className="settings-card" style={{ background: "rgba(56, 189, 248, 0.05)", borderColor: "rgba(56, 189, 248, 0.25)", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconCheck size={18} />
                </span>
                <div>
                  <h4 style={{ margin: 0, color: "var(--text-primary)", fontSize: "14px", fontWeight: "700" }}>
                    Modo Edge-TTS Neural Gratuito Ativo
                  </h4>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Utiliza as vozes neurais brasileiras em alta definição da Microsoft. <strong>Não é necessário gravar sua voz nem configurar chaves de API</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* TESTADOR DE SÍNTESE DA VOZ (TTS PLAYBACK) */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(56, 189, 248, 0.15)",
                    color: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconVolume2 size={16} />
                </span>
                <div>
                  <h3 style={{ margin: 0 }}>Testar Locução em Áudio</h3>
                  <p style={{ margin: "2px 0 0" }}>Gere um áudio instantâneo com a engine selecionada para ouvir a pronúncia e ritmo.</p>
                </div>
              </div>
            </div>

            <div className="settings-form-group">
              <label>Frase para teste de locução:</label>
              <textarea
                className="settings-textarea"
                rows={2}
                value={testTtsText}
                onChange={(e) => setTestTtsText(e.target.value)}
              />
            </div>

            {/* BARRA DE PROGRESSO COM PORCENTAGEM DURANTE SÍNTESE */}
            {isSynthesizing && (
              <div style={{ marginBottom: "16px", padding: "14px 16px", background: "var(--bg-surface)", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.35)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", fontSize: "12px", fontWeight: "700" }}>
                  <span style={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
                    <IconLoader className="spin" size={14} />
                    <span>{effectiveStage || "Sintetizando locução em áudio..."}</span>
                  </span>
                  <span style={{ fontFamily: "monospace", color: "#38bdf8", fontSize: "14px", fontWeight: "800" }}>
                    {Math.round(effectiveProgress)}%
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(5, effectiveProgress))}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #38bdf8, #818cf8, #c084fc)",
                      transition: "width 0.2s ease-out",
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleTestVoiceTTS}
                disabled={isSynthesizing}
                style={{ padding: "9px 18px", fontSize: "13px" }}
              >
                {isSynthesizing ? (
                  <>
                    <IconLoader className="spin" size={14} />
                    <span>Sintetizando ({Math.round(effectiveProgress)}%)...</span>
                  </>
                ) : (
                  <>
                    <IconPlay size={14} />
                    <span>Sintetizar e Ouvir Áudio</span>
                  </>
                )}
              </button>

              {/* BOTAO PARA PARAR / CANCELAR SINTESE */}
              {isSynthesizing && (
                <button
                  type="button"
                  onClick={handleCancelTTS}
                  style={{
                    padding: "9px 16px",
                    fontSize: "12px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#f87171",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "700",
                    transition: "all 0.15s ease",
                  }}
                  title="Interromper e liberar memória imediatamente"
                >
                  <IconStop size={14} />
                  <span>Interromper Síntese</span>
                </button>
              )}

              {/* CARD DO RESULTADO DO ÁUDIO SINTETIZADO */}
              {synthesizedAudioUrl && !isSynthesizing && (
                <div
                  style={{
                    width: "100%",
                    marginTop: "16px",
                    padding: "14px 18px",
                    background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)",
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                    borderRadius: "10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "26px", height: "26px", borderRadius: "6px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <IconVolume2 size={14} />
                      </span>
                      <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>
                        Áudio Sintetizado Pronto
                      </strong>
                    </div>

                    <span style={{ fontSize: "11px", background: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "2px 8px", borderRadius: "4px", fontWeight: "700" }}>
                      ✅ Disponível para reprodução
                    </span>
                  </div>

                  <audio controls autoPlay src={synthesizedAudioUrl} style={{ width: "100%", height: "38px" }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: AGENDAMENTO DE ANÁLISE DE AUDITORIA               */}
      {/* ======================================================== */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Modo de Agendamento da Análise de Métricas</h3>
                <p>Escolha como o motor de auditoria deve coletar métricas e alimentar a Memória RAG do seu perfil.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {[
                { id: "INTERVAL_HOURS", label: "Intervalo de Horas", desc: "A cada N horas continuamente", icon: IconClock },
                { id: "WEEKDAYS", label: "Dias da Semana", desc: "Seg, Qua, Sex nos horários de pico", icon: IconCalendar },
                { id: "WEEKLY", label: "Semanal", desc: "1x por semana no domingo à noite", icon: IconMoon },
                { id: "MONTHLY", label: "Mensal", desc: "1x ao mês no dia especificado", icon: IconTag },
                { id: "MANUAL", label: "Apenas Manual", desc: "Sem disparo automático em segundo plano", icon: IconHand },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = currentSchedule.mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateSchedule({ mode: m.id as any })}
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.15)" : "var(--bg-surface)",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid var(--border-card)",
                      borderRadius: "10px",
                      padding: "14px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "5px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: isSelected ? "#38bdf8" : "var(--text-primary)", fontWeight: "700", fontSize: "13px" }}>
                      <Icon size={15} />
                      <span>{m.label}</span>
                    </div>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* SE INTERVAL_HOURS */}
            {currentSchedule.mode === "INTERVAL_HOURS" && (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateSchedule({ intervalHours: opt.value })}
                    style={{
                      background: currentSchedule.intervalHours === opt.value ? "rgba(56, 189, 248, 0.2)" : "var(--bg-surface)",
                      border: currentSchedule.intervalHours === opt.value ? "1px solid #38bdf8" : "1px solid var(--border-card)",
                      color: currentSchedule.intervalHours === opt.value ? "#38bdf8" : "var(--text-primary)",
                      padding: "9px 16px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* SE WEEKDAYS */}
            {currentSchedule.mode === "WEEKDAYS" && (
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "600" }}>
                  Selecione os dias da semana para auditoria:
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {ALL_WEEKDAYS.map((day) => {
                    const isChecked = currentSchedule.selectedDays?.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => {
                          const currentDays = currentSchedule.selectedDays || [];
                          const nextDays = isChecked
                            ? currentDays.filter((d) => d !== day.id)
                            : [...currentDays, day.id];
                          updateSchedule({ selectedDays: nextDays });
                        }}
                        style={{
                          background: isChecked ? "rgba(56, 189, 248, 0.2)" : "var(--bg-surface)",
                          border: isChecked ? "1px solid #38bdf8" : "1px solid var(--border-card)",
                          color: isChecked ? "#38bdf8" : "var(--text-primary)",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
                <div style={{ maxWidth: "220px" }}>
                  <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "6px", fontWeight: "600" }}>
                    Horário de Execução
                  </label>
                  <input
                    type="time"
                    className="settings-input"
                    value={currentSchedule.timeSlot || "20:00"}
                    onChange={(e) => updateSchedule({ timeSlot: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* CARD: RADAR DE TEMAS EM ALTA (TRENDING TOPICS) */}
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    RADAR DE INTELIGÊNCIA EDITORIAL
                  </span>
                </div>
                <h3>Varredura Automática de Temas em Alta (Tendências)</h3>
                <p>Configure a periodicidade com que a IA vasculha o ecossistema tech e renova as tendências que alimentam o cronograma e geração.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "8px" }}>
              <div className="settings-form-group">
                <label>Frequência de Atualização das Tendências</label>
                <select
                  className="settings-input"
                  value={settings.trendingRefreshIntervalDays ?? 1}
                  onChange={(e) => setSettings({ ...settings, trendingRefreshIntervalDays: Number(e.target.value) })}
                >
                  <option value={1}>Todo dia (A cada 24 horas) — Padrão</option>
                  <option value={2}>A cada 2 dias (48 horas)</option>
                  <option value={3}>A cada 3 dias (72 horas)</option>
                  <option value={7}>Semanalmente (A cada 7 dias)</option>
                </select>
                <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  A IA renova as pautas em alta no banco de dados automaticamente conforme este intervalo e as injeta no cronograma semanal.
                </small>
              </div>

              <div className="settings-form-group">
                <label>Quantidade de Tendências Monitoradas no Radar</label>
                <select
                  className="settings-input"
                  value={settings.trendingTopicsCount ?? 10}
                  onChange={(e) => setSettings({ ...settings, trendingTopicsCount: Number(e.target.value) })}
                >
                  <option value={10}>10 tendências em alta (Padrão / Sem Paginação)</option>
                  <option value={15}>15 tendências em alta</option>
                  <option value={20}>20 tendências em alta</option>
                </select>
                <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  Total de cards exibidos na tela de Temas em Alta com botões de Gerar Publicação, Ignorar e Ler Tudo.
                </small>
              </div>
            </div>
          </div>

          {/* CARD: PILOTO NOTURNO / PLANEJAMENTO SEMANAL AUTOMÁTICO */}
          <div className="settings-card" style={{ borderColor: settings.nightlyScheduleEnabled ? "rgba(147, 51, 234, 0.35)" : "var(--border-card)" }}>
            <div className="settings-card-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    AUTOMAÇÃO HANDS-FREE
                  </span>
                </div>
                <h3>Piloto Noturno (Planejamento Semanal Automático)</h3>
                <p>O robô acorda no dia e horário escolhidos para renovar tendências, gerar a grade semanal e deixar tudo pronto para você.</p>
              </div>

              <button
                type="button"
                onClick={() => setSettings({ ...settings, nightlyScheduleEnabled: !settings.nightlyScheduleEnabled })}
                className={settings.nightlyScheduleEnabled ? "primary-button" : "btn-secondary"}
                style={{
                  fontSize: "12px",
                  padding: "7px 16px",
                  background: settings.nightlyScheduleEnabled ? "linear-gradient(135deg, #8b5cf6, #6366f1)" : undefined,
                  borderColor: settings.nightlyScheduleEnabled ? "#8b5cf6" : undefined,
                }}
              >
                {settings.nightlyScheduleEnabled ? "Ativado (Piloto Ligado)" : "Desativado"}
              </button>
            </div>

            {settings.nightlyScheduleEnabled && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }}>
                <div className="settings-form-group">
                  <label>Dia da Semana para Executar</label>
                  <select
                    className="settings-input"
                    value={settings.nightlyScheduleDay || "Domingo"}
                    onChange={(e) => setSettings({ ...settings, nightlyScheduleDay: e.target.value })}
                  >
                    <option value="Domingo">Domingo (Recomendado para planejar a semana)</option>
                    <option value="Segunda-feira">Segunda-feira</option>
                    <option value="Sábado">Sábado</option>
                    <option value="Sexta-feira">Sexta-feira</option>
                  </select>
                  <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    Dia em que o sistema varre o mercado e estrutura os 5 posts da semana.
                  </small>
                </div>

                <div className="settings-form-group">
                  <label>Horário de Execução</label>
                  <input
                    type="time"
                    className="settings-input"
                    value={settings.nightlyScheduleTime || "22:00"}
                    onChange={(e) => setSettings({ ...settings, nightlyScheduleTime: e.target.value })}
                  />
                  <small style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "4px", display: "block" }}>
                    Horário em que o robô roda em background (Padrão: 22:00).
                  </small>
                </div>
              </div>
            )}

            {settings.lastNightlyRunAt && (
              <div style={{ marginTop: "12px", fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <IconCheck size={12} color="#34d399" />
                <span>Última execução do piloto noturno: {new Date(settings.lastNightlyRunAt).toLocaleString("pt-BR")}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: MODELOS DE IA & MOTOR                             */}
      {/* ======================================================== */}
      {activeTab === "models" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Modelos Preset Oficiais do Google DeepMind</h3>
                <p>Selecione o modelo do Gemini utilizado pelo Redator, Analista RAG e Quality Control.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginBottom: "22px" }}>
              {PRESET_GEMINI_MODELS.map((m) => {
                const isSelected = settings.defaultGeminiModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, defaultGeminiModel: m.id })}
                    style={{
                      background: isSelected ? "rgba(56, 189, 248, 0.15)" : "var(--bg-surface)",
                      border: isSelected ? "1px solid #38bdf8" : "1px solid var(--border-card)",
                      borderRadius: "10px",
                      padding: "14px",
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ color: isSelected ? "#38bdf8" : "var(--text-primary)", fontWeight: "700", fontSize: "14px" }}>
                      {m.name}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* MODELOS CUSTOMIZADOS ADICIONADOS */}
            {customModels.length > 0 && (
              <div style={{ marginBottom: "22px", borderTop: "1px solid var(--border-subtle)", paddingTop: "18px" }}>
                <h4 style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px", fontWeight: "700" }}>
                  Modelos Customizados Adicionados por Você:
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                  {customModels.map((customModel) => {
                    const isSelected = settings.defaultGeminiModel === customModel;
                    return (
                      <div
                        key={customModel}
                        onClick={() => setSettings({ ...settings, defaultGeminiModel: customModel })}
                        style={{
                          background: isSelected ? "rgba(56, 189, 248, 0.15)" : "var(--bg-surface)",
                          border: isSelected ? "1px solid #38bdf8" : "1px solid var(--border-card)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ color: isSelected ? "#38bdf8" : "var(--text-primary)", fontWeight: "700", fontSize: "13px" }}>
                          {customModel}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveCustomModel(customModel, e)}
                          title="Remover este modelo"
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADICIONAR NOVO MODELO CUSTOMIZADO */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "18px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "600" }}>
                Adicionar Novo Modelo Customizado (ex: gemini-3.6-flash, gemini-3.1-pro-preview):
              </label>
              <div style={{ display: "flex", gap: "10px", maxWidth: "480px" }}>
                <input
                  type="text"
                  className="settings-input"
                  value={newModelInput}
                  onChange={(e) => setNewModelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomModel(newModelInput);
                    }
                  }}
                  placeholder="Nome do modelo (ex: gemini-3.6-flash)"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomModel(newModelInput)}
                  className="btn-primary"
                  style={{ whiteSpace: "nowrap", padding: "8px 16px" }}
                >
                  <IconPlus size={14} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: NOTIFICAÇÕES & SMTP                               */}
      {/* ======================================================== */}
      {activeTab === "email" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div>
                <h3>Alertas por E-mail & Configuração SMTP</h3>
                <p>Receba avisos instantâneos quando um post agendado estiver pronto para publicação.</p>
              </div>
            </div>

            <div className="settings-form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={Boolean(settings.emailNotificationsEnabled)}
                  onChange={(e) => setSettings({ ...settings, emailNotificationsEnabled: e.target.checked })}
                />
                <span>Habilitar alertas por e-mail quando posts atingirem o horário agendado</span>
              </label>
            </div>

            <div className="settings-form-group">
              <label>E-mail de Notificação (Destinatário)</label>
              <input
                type="email"
                className="settings-input"
                value={settings.notificationEmail || ""}
                onChange={(e) => setSettings({ ...settings, notificationEmail: e.target.value })}
                placeholder="seu.email@dominio.com"
                style={{ maxWidth: "420px" }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "18px", marginTop: "18px" }}>
              <h4 style={{ fontSize: "14px", color: "var(--text-primary)", marginBottom: "14px", fontWeight: "700" }}>
                Credenciais do Servidor SMTP (Opcional)
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div className="settings-form-group">
                  <label>Host SMTP</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={settings.smtpConfig?.host || ""}
                    onChange={(e) => setSettings({ ...settings, smtpConfig: { ...settings.smtpConfig!, host: e.target.value } })}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="settings-form-group">
                  <label>Porta</label>
                  <input
                    type="number"
                    className="settings-input"
                    value={settings.smtpConfig?.port || 587}
                    onChange={(e) => setSettings({ ...settings, smtpConfig: { ...settings.smtpConfig!, port: Number(e.target.value) } })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div className="settings-form-group">
                  <label>Usuário SMTP</label>
                  <input
                    type="text"
                    className="settings-input"
                    value={settings.smtpConfig?.user || ""}
                    onChange={(e) => setSettings({ ...settings, smtpConfig: { ...settings.smtpConfig!, user: e.target.value } })}
                    placeholder="usuario@dominio.com"
                  />
                </div>
                <div className="settings-form-group">
                  <label>Senha de Aplicativo</label>
                  <input
                    type="password"
                    className="settings-input"
                    value={settings.smtpConfig?.pass || ""}
                    onChange={(e) => setSettings({ ...settings, smtpConfig: { ...settings.smtpConfig!, pass: e.target.value } })}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                  style={{ fontSize: "12px", padding: "8px 16px" }}
                >
                  {sendingTestEmail ? <IconLoader className="spin" size={13} /> : <IconSend size={13} />}
                  <span>Enviar E-mail de Teste</span>
                </button>
              </div>

              {testEmailFeedback && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    background: testEmailFeedback.success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: testEmailFeedback.success ? "#34d399" : "#f87171",
                    border: `1px solid ${testEmailFeedback.success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  }}
                >
                  {testEmailFeedback.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
