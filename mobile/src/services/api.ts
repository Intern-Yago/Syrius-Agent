import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { ScheduleSlot, Post, AgencyMessage } from "../types";

const SERVER_HOST_KEY = "@syrius_server_host";

export function getAutoDetectedHost(): string {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest2?.extra?.expoClient?.hostUri || "";
    if (hostUri) {
      const ip = hostUri.split(":")[0];
      if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
        return `http://${ip}:3001`;
      }
    }
  } catch {}
  return "http://192.168.0.104:3001";
}

export async function getServerHost(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(SERVER_HOST_KEY);
    if (saved && saved !== "http://10.0.2.2:3001" && saved !== "http://localhost:3001") {
      return saved;
    }
    return getAutoDetectedHost();
  } catch {
    return getAutoDetectedHost();
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

  // Execução do Pipeline Autônomo Completo
  runPipeline: async () => {
    return request("/api/pipeline/run", {
      method: "POST",
    });
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    return request("/api/dashboard");
  },

  // Temas em Alta (Trending)
  getTrending: async () => {
    return request("/api/trending");
  },

  scanTrending: async () => {
    return request("/api/trending/scan", {
      method: "POST",
    });
  },

  produceTrendingPost: async (params: { topic: string; format?: string; category?: string }) => {
    return request("/api/trending/produce", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  // Interações da Comunidade
  getInteractions: async () => {
    return request("/api/interactions");
  },

  // Central de Testes & Health Check
  getTestsHealth: async () => {
    return request("/api/tests/health");
  },

  // Gestor de Tráfego AI (Apolo)
  getAdsOpportunities: async () => {
    return request("/api/ads/opportunities");
  },

  getAdsBudget: async () => {
    return request("/api/ads/budget");
  },

  dispatchBoost: async (params: { postId: string; dailyBudget?: number; durationDays?: number }) => {
    return request("/api/ads/boost", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  // Atividades & Monitor
  getActivities: async () => {
    return request("/api/activities");
  },

  // Demo Publish
  publishDemoPost: async () => {
    return request("/api/posts/demo-publish", {
      method: "POST",
    });
  },

  // Analytics Resumo
  getAnalyticsSummary: async () => {
    return request("/api/analytics");
  },

  // Mídia
  getMediaUrl: async (relativePath: string): Promise<string> => {
    const host = await getServerHost();
    const clean = encodeURIComponent(relativePath.replace(/\\/g, "/"));
    return `${host}/api/media/${clean}`;
  },
};
