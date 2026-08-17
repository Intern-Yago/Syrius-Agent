import { env } from "../../config/env.js";

export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  followers_count?: number;
  media_count?: number;
  biography?: string;
}

export interface InstagramMedia {
  id: string;
  caption: string;
  media_type: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
  reach?: number;
  saved?: number;
  total_interactions?: number;
  impressions?: number;
  shares?: number;
}

// Cache em memória para evitar esgotar taxa limite da API em desenvolvimento
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

async function instagramRequest<T>(endpoint: string): Promise<T> {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN não configurado no .env");
  }

  const now = Date.now();
  const cached = cache.get(endpoint);
  if (cached && cached.expiry > now) {
    return cached.data as T;
  }

  const separator = endpoint.includes("?") ? "&" : "?";
  const url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}${endpoint}${separator}access_token=${token}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || `Instagram API retornou HTTP ${response.status}`);
  }

  cache.set(endpoint, { data, expiry: now + CACHE_TTL_MS });
  return data as T;
}

export async function getInstagramProfile(): Promise<InstagramProfile> {
  return instagramRequest<InstagramProfile>(
    "/me?fields=id,username,name,followers_count,media_count,biography"
  );
}

export async function getInstagramMedia(): Promise<InstagramMedia[]> {
  const response = await instagramRequest<{ data?: any[] }>(
    "/me/media?fields=id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,like_count,comments_count"
  );

  if (!response.data) return [];

  const mediaItems: InstagramMedia[] = [];

  for (const item of response.data) {
    let reach = 0;
    let saved = 0;
    let total_interactions = (item.like_count || 0) + (item.comments_count || 0);

    // Consulta métricas individuais da mídia na Meta API
    try {
      const insightsRes = await instagramRequest<{ data?: any[] }>(
        `/${item.id}/insights?metric=reach,saved,total_interactions`
      );
      if (Array.isArray(insightsRes.data)) {
        for (const metric of insightsRes.data) {
          const val = metric.values?.[0]?.value ?? 0;
          if (metric.name === "reach") reach = val;
          if (metric.name === "saved") saved = val;
          if (metric.name === "total_interactions") total_interactions = val;
        }
      }
    } catch {
      // Usa valores base se endpoint de insights não retornar
    }

    mediaItems.push({
      id: item.id,
      caption: item.caption ?? "",
      media_type: item.media_type,
      permalink: item.permalink,
      timestamp: item.timestamp,
      like_count: item.like_count ?? 0,
      comments_count: item.comments_count ?? 0,
      reach,
      saved,
      total_interactions,
    });
  }

  return mediaItems;
}

export async function getInstagramAudience(): Promise<any[]> {
  try {
    const data = await instagramRequest<{ data?: any[] }>(
      "/me/insights?metric=reach,follower_count,profile_views,online_followers,accounts_engaged,total_interactions&period=day"
    );
    return data.data ?? [];
  } catch (err) {
    return [];
  }
}
