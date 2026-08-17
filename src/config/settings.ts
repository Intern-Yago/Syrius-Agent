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
}

const defaultSettings: AppSettings = {
  instagramHandle: "",
  accountName: "Tech Creator",
  niche: "Tecnologia, Engenharia de Software e Desenvolvimento",
  positioning: "Desenvolvedor Full Stack e Engenheiro de Software com foco em tecnologia moderna, arquitetura, DevOps e boas práticas.",
  analyticsIntervalHours: 24,
  analyticsSchedule: {
    mode: "WEEKDAYS",
    selectedDays: ["Segunda-feira", "Quarta-feira", "Sexta-feira"],
    timeSlot: "20:00",
    intervalHours: 24,
    dayOfMonth: 1,
  },
  autoPublish: false,
  defaultGeminiModel: "gemini-3.5-flash",
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
};

const settingsFilePath = path.resolve(process.cwd(), "output", "settings.json");

let cachedSettings: AppSettings | null = null;

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

  cachedSettings = settings;
  return settings;
}

export async function saveSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const updated: AppSettings = {
    ...current,
    ...newSettings,
  };

  cachedSettings = updated;
  await fs.mkdir(path.dirname(settingsFilePath), { recursive: true });
  await fs.writeFile(settingsFilePath, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
