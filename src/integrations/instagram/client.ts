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
  reposts?: number;
  plays?: number;
  avg_watch_time?: number; // em segundos
  total_watch_time?: number; // em segundos
  traffic_sources?: {
    reelsTab?: number;
    explore?: number;
    feed?: number;
    profile?: number;
    other?: number;
  };
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
  const data: any = await response.json();

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
    let shares = 0;
    let reposts = 0;
    let plays = 0;
    let avg_watch_time = 0;
    let total_watch_time = 0;
    let traffic_sources: InstagramMedia["traffic_sources"] = undefined;
    let total_interactions = (item.like_count || 0) + (item.comments_count || 0);

    const isVideo = item.media_type === "VIDEO" || item.media_type === "REELS";

    // Consulta métricas individuais da mídia na Meta Graph API
    try {
      const metricQuery = isVideo
        ? "reach,saved,total_interactions,shares,plays,ig_reels_avg_watch_time,ig_reels_video_view_total_time,clips_replays_count"
        : "reach,saved,total_interactions,shares";

      const insightsRes = await instagramRequest<{ data?: any[] }>(
        `/${item.id}/insights?metric=${metricQuery}`
      );
      if (Array.isArray(insightsRes.data)) {
        for (const metric of insightsRes.data) {
          const val = metric.values?.[0]?.value ?? 0;
          if (metric.name === "reach") reach = val;
          if (metric.name === "saved") saved = val;
          if (metric.name === "shares") shares = val;
          if (metric.name === "clips_replays_count") reposts = val;
          if (metric.name === "plays") plays = val;
          if (metric.name === "ig_reels_avg_watch_time") {
            // Se vier em milissegundos (> 100), converte para segundos
            avg_watch_time = val > 100 ? Number((val / 1000).toFixed(2)) : Number(val.toFixed(2));
          }
          if (metric.name === "ig_reels_video_view_total_time") {
            total_watch_time = val > 100 ? Number((val / 1000).toFixed(2)) : Number(val.toFixed(2));
          }
          if (metric.name === "total_interactions") total_interactions = val;
        }
      }
    } catch {
      // Tenta fallback com métricas padrão caso a mídia não suporte reels metrics
      try {
        const fallbackRes = await instagramRequest<{ data?: any[] }>(
          `/${item.id}/insights?metric=reach,saved,total_interactions`
        );
        if (Array.isArray(fallbackRes.data)) {
          for (const metric of fallbackRes.data) {
            const val = metric.values?.[0]?.value ?? 0;
            if (metric.name === "reach") reach = val;
            if (metric.name === "saved") saved = val;
            if (metric.name === "total_interactions") total_interactions = val;
          }
        }
      } catch {}
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
      shares,
      reposts,
      plays,
      avg_watch_time: avg_watch_time > 0 ? avg_watch_time : undefined,
      total_watch_time: total_watch_time > 0 ? total_watch_time : undefined,
      traffic_sources,
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
