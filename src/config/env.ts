import "dotenv/config";

export interface AppEnv {
  DATABASE_URL: string;
  GEMINI_API_KEY: string;
  GEMINI_TEXT_MODEL: string;
  STORAGE_ENDPOINT: string;
  STORAGE_ACCESS_KEY: string;
  STORAGE_SECRET_KEY: string;
  STORAGE_BUCKET: string;
  STORAGE_REGION: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_IMAGE_MODEL: string;
  CLOUDFLARE_AI_GATEWAY_ID: string;
  IMAGE_PROVIDER: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
  INSTAGRAM_API_VERSION: string;
}

function getEnv(): AppEnv {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.warn("⚠️ DATABASE_URL não configurada no .env");
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY não encontrada no .env");
  }

  // Permite R2_*, S3_* ou MINIO_*
  const STORAGE_ENDPOINT =
    process.env.R2_ENDPOINT ||
    process.env.STORAGE_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    process.env.MINIO_ENDPOINT ||
    "https://0657b7d4680a9d8fced19c17f69605a9.r2.cloudflarestorage.com";

  const STORAGE_ACCESS_KEY =
    process.env.R2_ACCESS_KEY ||
    process.env.STORAGE_ACCESS_KEY ||
    process.env.S3_ACCESS_KEY ||
    process.env.MINIO_ACCESS_KEY ||
    "";

  const STORAGE_SECRET_KEY =
    process.env.R2_SECRET_KEY ||
    process.env.STORAGE_SECRET_KEY ||
    process.env.S3_SECRET_KEY ||
    process.env.MINIO_SECRET_KEY ||
    "";

  const STORAGE_BUCKET =
    process.env.R2_BUCKET ||
    process.env.STORAGE_BUCKET ||
    process.env.S3_BUCKET ||
    process.env.MINIO_BUCKET ||
    "social-media";

  const STORAGE_REGION =
    process.env.R2_REGION ||
    process.env.STORAGE_REGION ||
    process.env.S3_REGION ||
    process.env.MINIO_REGION ||
    "auto";

  return {
    DATABASE_URL: DATABASE_URL || "postgresql://social_media:social_media_dev@localhost:5431/social_media?schema=public",
    GEMINI_API_KEY,
    GEMINI_TEXT_MODEL: process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash",
    STORAGE_ENDPOINT,
    STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY,
    STORAGE_BUCKET,
    STORAGE_REGION,
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    CLOUDFLARE_IMAGE_MODEL: process.env.CLOUDFLARE_IMAGE_MODEL || "recraft/recraftv4-1",
    CLOUDFLARE_AI_GATEWAY_ID: process.env.CLOUDFLARE_AI_GATEWAY_ID || "default",
    IMAGE_PROVIDER: process.env.IMAGE_PROVIDER || "cloudflare-gateway",
    INSTAGRAM_ACCESS_TOKEN: process.env.INSTAGRAM_ACCESS_TOKEN,
    INSTAGRAM_API_VERSION: process.env.INSTAGRAM_API_VERSION || "v20.0",
  };
}

export const env = new Proxy(getEnv(), {
  get(target, prop: keyof AppEnv) {
    if (prop === "GEMINI_TEXT_MODEL") {
      return process.env.GEMINI_TEXT_MODEL || target.GEMINI_TEXT_MODEL || "gemini-3.6-flash";
    }
    return target[prop];
  },
});

