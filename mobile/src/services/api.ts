import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScheduleSlot, Post, AgencyMessage } from "../types";

const SERVER_HOST_KEY = "@syrius_server_host";
// Padrão: Porta 3001 no localhost/emulador ou IP local
const DEFAULT_HOST = "http://10.0.2.2:3001"; // 10.0.2.2 para emulador Android, ou IP local para celular real

export async function getServerHost(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_HOST_KEY);
    return saved || DEFAULT_HOST;
  } catch {
    return DEFAULT_HOST;
  }
}

export async function setServerHost(host: string): Promise<void> {
  try {
    const cleanHost = host.trim().replace(/\/+$/, "");
    await AsyncStorage.setItem(SERVER_HOST_KEY, cleanHost);
  } catch (err) {
    console.error("Erro ao salvar host:", err);
  }
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const host = await getServerHost();
  const url = `${host}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Erro HTTP ${response.status}`);
  }

  return data;
}

export const api = {
  // Health
  checkHealth: async () => request("/api/health"),

  // Cronograma
  getSchedule: async (weekOffset = 0): Promise<{ slots: ScheduleSlot[]; weekOffset: number }> => {
    return request(`/api/schedule?weekOffset=${weekOffset}`);
  },

  saveSlot: async (slot: Partial<ScheduleSlot>): Promise<{ slot: ScheduleSlot }> => {
    return request("/api/schedule/slot", {
      method: "POST",
      body: JSON.stringify(slot),
    });
  },

  deleteSlot: async (id: string): Promise<{ success: boolean }> => {
    return request(`/api/schedule/slot/${id}`, { method: "DELETE" });
  },

  unmarkPublished: async (slotId: string): Promise<{ slot: ScheduleSlot }> => {
    return request("/api/schedule/unmark-published", {
      method: "POST",
      body: JSON.stringify({ slotId }),
    });
  },

  produceSlot: async (params: {
    slotId?: string;
    topic: string;
    format: string;
    objective?: string;
    reasoning?: string;
    baseCopyPrompt?: string;
    baseVisualPrompt?: string;
  }) => {
    return request("/api/schedule/produce", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  getAutoplay: async (): Promise<{ autoPublish: boolean }> => {
    return request("/api/schedule/autoplay");
  },

  setAutoplay: async (autoPublish: boolean): Promise<{ autoPublish: boolean }> => {
    return request("/api/schedule/autoplay", {
      method: "POST",
      body: JSON.stringify({ autoPublish }),
    });
  },

  // Posts
  getPosts: async (): Promise<{ posts: Post[] }> => {
    return request("/api/posts");
  },

  getPost: async (id: string): Promise<{ post: Post }> => {
    return request(`/api/posts/${id}`);
  },

  publishPost: async (id: string, deletePrevious = false) => {
    return request(`/api/posts/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ deletePrevious }),
    });
  },

  // Sala da Gestora (Estelar)
  getAgencyMessages: async (): Promise<{ history: AgencyMessage[]; status: string }> => {
    return request("/api/agency/messages");
  },

  sendAgencyMessage: async (message: string): Promise<{ reply: any }> => {
    return request("/api/agency/message", {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  // Mídia
  getMediaUrl: async (relativePath: string): Promise<string> => {
    const host = await getServerHost();
    const clean = encodeURIComponent(relativePath.replace(/\\/g, "/"));
    return `${host}/api/media/${clean}`;
  },
};
