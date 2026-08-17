import sharp from "sharp";
import { env } from "../../config/env.js";

export interface GenerateImageOptions {
  prompt: string;
  size?: "896x1152" | "1024x1024" | string;
  width?: number;
  height?: number;
}

interface CloudflareResponse {
  success?: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  messages?: Array<{ code?: number; message?: string }>;
  result?: {
    image?: string;
    result?: {
      image?: string;
    };
  };
}

export async function generateCloudflareImage(options: GenerateImageOptions): Promise<Buffer> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  const model = env.CLOUDFLARE_IMAGE_MODEL || "recraft/recraftv4-1";
  const gatewayId = env.CLOUDFLARE_AI_GATEWAY_ID || "recraft-gw";

  const targetWidth = options.width || 1080;
  const targetHeight = options.height || 1350;

  if (!accountId || !token) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID ou CLOUDFLARE_API_TOKEN não configurados no .env");
  }

  // Endpoint oficial da API do Cloudflare AI com AI Gateway via header
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;

  const requestBody = {
    model,
    input: {
      prompt: options.prompt,
      size: options.size || "896x1152",
    },
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  if (gatewayId) {
    headers["cf-aig-gateway-id"] = gatewayId;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  let result: CloudflareResponse;
  try {
    result = JSON.parse(responseText) as CloudflareResponse;
  } catch {
    throw new Error(`Cloudflare retornou uma resposta que não é JSON:\n${responseText}`);
  }

  if (!response.ok || result.success === false) {
    const errorMsg = result.errors?.[0]?.message || `Cloudflare API retornou HTTP ${response.status}`;
    throw new Error(`Erro na API Cloudflare AI: ${errorMsg} (HTTP ${response.status})`);
  }

  const imageUrlOrBase64 =
    result?.result?.result?.image ??
    result?.result?.image ??
    (result as any)?.image;

  if (!imageUrlOrBase64) {
    throw new Error("Cloudflare não retornou imagem no payload de resposta.");
  }

  let rawBuffer: Buffer;

  if (imageUrlOrBase64.startsWith("http://") || imageUrlOrBase64.startsWith("https://")) {
    // Download da imagem pela URL temporária da Cloudflare
    const imgResponse = await fetch(imageUrlOrBase64);
    if (!imgResponse.ok) {
      throw new Error(`Falha ao baixar imagem gerada da Cloudflare (HTTP ${imgResponse.status})`);
    }
    rawBuffer = Buffer.from(await imgResponse.arrayBuffer());
  } else {
    // Imagem codificada em base64
    rawBuffer = Buffer.from(imageUrlOrBase64, "base64");
  }

  // Redimensionamento e otimização Sharp (1080x1350 Feed ou 1080x1920 Stories)
  const finalBuffer = await sharp(rawBuffer)
    .resize(targetWidth, targetHeight, {
      fit: "cover",
      position: "center",
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
    })
    .toBuffer();

  return finalBuffer;
}
