import fs from "node:fs/promises";
import path from "node:path";
import { getInstagramProfile } from "../integrations/instagram/client.js";

export type AnalyticsScheduleMode =
  | "INTERVAL_HOURS"
  | "WEEKDAYS"
  | "WEEKLY"
  | "MONTHLY"
  | "MANUAL";

export interface AnalyticsScheduleConfig {
  mode: AnalyticsScheduleMode;
  intervalHours?: number; // 1, 6, 12, 24, 48
  selectedDays?: string[]; // ["Segunda-feira", "Quarta-feira", "Sexta-feira"]
  timeSlot?: string; // "20:00"
  dayOfMonth?: number; // 1 to 31
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  from?: string;
}

export interface VoiceCloningConfig {
  provider: "elevenlabs" | "local" | "edge_tts" | "disabled";
  elevenLabsApiKey?: string;
  elevenLabsVoiceId?: string;
  voiceName?: string;
  stability?: number; // 0.0 to 1.0
  similarityBoost?: number; // 0.0 to 1.0
  localSampleAudioPath?: string;
  lastCalibratedAt?: string;
  devicePreference?: "auto" | "cuda" | "cpu";
  nfeSteps?: number; // default 12 (range 6 to 32)
  trainedModelPath?: string;
  isModelTrained?: boolean;
}

export interface AgencyManagerConfig {
  name: string; // ex: "Clara"
  roleTitle?: string; // ex: "Head Editorial Syrius"
  edgeTtsVoice: string; // ex: "pt-BR-FranciscaNeural"
}

export interface AppSettings {
  instagramHandle: string;
  accountName: string;
  niche: string;
  positioning: string;
  analyticsIntervalHours: number; // 1, 6, 12, 24 (mantido para retrocompatibilidade)
  analyticsSchedule?: AnalyticsScheduleConfig;
  autoPublish: boolean;
  defaultGeminiModel: string;
  notificationEmail?: string;
  emailNotificationsEnabled?: boolean;
  smtpConfig?: SmtpConfig;
  voiceConfig?: VoiceCloningConfig;
  agencyManager?: AgencyManagerConfig;
  trendingTopicsCount?: number;
  trendingRefreshIntervalDays?: number;
  lastTrendingRefreshedAt?: string;
  nightlyScheduleEnabled?: boolean;
  nightlyScheduleDay?: string; // "Domingo", "Sábado", etc.
  nightlyScheduleTime?: string; // "22:00"
  nightlyAutoProduceQueue?: boolean;
  lastNightlyRunAt?: string;
}

const defaultSettings: AppSettings = {
  instagramHandle: "",
  accountName: "Tech Creator",
  niche: "Tecnologia, Engenharia de Software e Desenvolvimento",
  positioning: "Desenvolvedor Full Stack e Engenheiro de Software com foco em tecnologia moderna, arquitetura, DevOps e boas práticas.",
  agencyManager: {
    name: "Clara",
    roleTitle: "HEAD EDITORIAL SYRIUS",
    edgeTtsVoice: "pt-BR-FranciscaNeural",
  },
  analyticsIntervalHours: 24,
  analyticsSchedule: {
    mode: "WEEKDAYS",
    selectedDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
    timeSlot: "20:00",
    intervalHours: 24,
    dayOfMonth: 1,
  },
  autoPublish: false,
  defaultGeminiModel: "gemini-3.6-flash",
  notificationEmail: "yago.commercial@gmail.com",
  emailNotificationsEnabled: true,
  smtpConfig: {
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "",
  },
  voiceConfig: {
    provider: "elevenlabs",
    voiceName: "Minha Voz (Syrius Tech)",
    stability: 0.5,
    similarityBoost: 0.75,
  },
  trendingTopicsCount: 10,
  trendingRefreshIntervalDays: 1,
  nightlyScheduleEnabled: true,
  nightlyScheduleDay: "Domingo",
  nightlyScheduleTime: "22:00",
  nightlyAutoProduceQueue: false,
};

const settingsFilePath = path.resolve(process.cwd(), "output", "settings.json");

let cachedSettings: AppSettings | null = null;

async function syncEnvFileModel(modelName: string): Promise<void> {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let content = await fs.readFile(envPath, "utf-8").catch(() => "");
    if (content) {
      if (content.includes("GEMINI_TEXT_MODEL=")) {
        content = content.replace(/GEMINI_TEXT_MODEL=.*/g, `GEMINI_TEXT_MODEL=${modelName}`);
      } else {
        content += `\nGEMINI_TEXT_MODEL=${modelName}\n`;
      }
      await fs.writeFile(envPath, content, "utf-8");
    }
  } catch (err) {
    console.warn("[settings] Não foi possível sincronizar o modelo no arquivo .env:", err);
  }
}

export async function getSettings(): Promise<AppSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  let settings: AppSettings = { ...defaultSettings };

  try {
    await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
    const fileContent = await fs.readFile(settingsFilePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    settings = { ...defaultSettings, ...parsed };
  } catch {
    await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), "utf-8");
  }

  // Se o handle não estiver configurado manualmente, tenta buscar dinamicamente da API do Instagram
  if (!settings.instagramHandle) {
    try {
      const profile = await getInstagramProfile();
      if (profile?.username) {
        settings.instagramHandle = `@${profile.username}`;
        settings.accountName = profile.name || profile.username;
        if (profile.biography) {
          settings.positioning = profile.biography;
        }
        await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2), "utf-8");
      }
    } catch (err) {
      console.warn("[settings] Não foi possível consultar perfil do Instagram automaticamente:", err);
      settings.instagramHandle = "@instagram_user";
    }
  }

  if (settings.defaultGeminiModel) {
    process.env.GEMINI_TEXT_MODEL = settings.defaultGeminiModel;
  }

  cachedSettings = settings;
  return settings;
}

export async function getEffectiveGeminiModel(): Promise<string> {
  try {
    const settings = await getSettings();
    if (settings?.defaultGeminiModel) {
      return settings.defaultGeminiModel;
    }
  } catch {}
  return process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
}

export async function saveSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...newSettings,
  };

  if (updated.defaultGeminiModel) {
    process.env.GEMINI_TEXT_MODEL = updated.defaultGeminiModel;
    await syncEnvFileModel(updated.defaultGeminiModel);
  }

  cachedSettings = updated;
  await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
  await fs.writeFile(settingsFilePath, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
