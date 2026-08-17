import { env } from "../../config/env.js";
import { prisma } from "../../core/database.js";
import { getImageUrl } from "../../core/storage.js";

export interface PublishResult {
  success: boolean;
  publishedMediaId?: string;
  permalink?: string;
  error?: string;
}

async function metaRequest<T>(endpoint: string, method = "POST", params: Record<string, string> = {}): Promise<T> {
  const token = env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN não configurado no .env");
  }

  const query = new URLSearchParams({
    ...params,
    access_token: token,
  });

  const url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}${endpoint}?${query.toString()}`;

  const response = await fetch(url, {
    method,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data?.error?.message || `Instagram API error HTTP ${response.status}`;
    console.error(`[Meta API Error] ${endpoint}:`, data);
    throw new Error(errorMsg);
  }

  return data as T;
}

/**
 * Aguarda o processamento do container de mídia pela Meta antes de publicar.
 */
async function waitForContainer(containerId: string, maxAttempts = 10): Promise<void> {
  for (let i = 1; i <= maxAttempts; i++) {
    const statusData = await metaRequest<{ status_code?: string }>(
      `/${containerId}`,
      "GET",
      { fields: "status_code" }
    );

    if (statusData.status_code === "FINISHED") {
      return;
    }

    if (statusData.status_code === "ERROR" || statusData.status_code === "EXPIRED") {
      throw new Error(`Container ${containerId} falhou no processamento com status: ${statusData.status_code}`);
    }

    // Espera 2 segundos antes de checar novamente
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

/**
 * 1. Publica Post Solo (SINGLE_IMAGE no Feed)
 */
export async function publishSingleImage(postId: string): Promise<PublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);
  const slide = post.slides[0];
  if (!slide || !slide.imagePath) throw new Error("O post não possui imagem gerada.");

  console.log(`[Publisher] Gerando Presigned URL do R2 para ${slide.imagePath}...`);
  const imageUrl = await getImageUrl(slide.imagePath, 86400);
  if (!imageUrl) throw new Error("Não foi possível gerar URL pública da imagem.");

  const fullCaption = `${post.caption || ""}\n\n${post.hashtags.join(" ")}`.trim();

  console.log(`[Publisher] Criando container de imagem na Meta API...`);
  const container = await metaRequest<{ id: string }>("/me/media", "POST", {
    image_url: imageUrl,
    caption: fullCaption,
  });

  console.log(`[Publisher] Aguardando container ${container.id}...`);
  await waitForContainer(container.id);

  console.log(`[Publisher] Publicando mídia no feed do Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: container.id,
  });

  await prisma.post.update({
    where: { id: post.id },
    data: { status: "PUBLISHED" },
  });

  return {
    success: true,
    publishedMediaId: publishRes.id,
  };
}

/**
 * 2. Publica Carrossel (CAROUSEL de 2 a 10 slides no Feed)
 */
export async function publishCarousel(postId: string): Promise<PublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);
  if (post.slides.length < 2) throw new Error("Carrossel requer pelo menos 2 slides.");

  console.log(`[Publisher] Criando containers individuais para os ${post.slides.length} slides no R2...`);
  const itemContainerIds: string[] = [];

  for (const slide of post.slides) {
    if (!slide.imagePath) {
      throw new Error(`Slide ${slide.number} não possui imagem vinculada.`);
    }

    const imageUrl = await getImageUrl(slide.imagePath, 86400);
    if (!imageUrl) throw new Error(`Erro ao gerar URL da imagem do slide ${slide.number}.`);

    const itemContainer = await metaRequest<{ id: string }>("/me/media", "POST", {
      image_url: imageUrl,
      is_carousel_item: "true",
    });

    itemContainerIds.push(itemContainer.id);
    console.log(`[Publisher] Slide ${slide.number} registrado com container ID: ${itemContainer.id}`);
  }

  // Aguarda todos os containers filhos
  for (const cId of itemContainerIds) {
    await waitForContainer(cId);
  }

  const fullCaption = `${post.caption || ""}\n\n${post.hashtags.join(" ")}`.trim();

  console.log(`[Publisher] Criando container pai do Carrossel com ${itemContainerIds.length} itens...`);
  const carouselContainer = await metaRequest<{ id: string }>("/me/media", "POST", {
    media_type: "CAROUSEL",
    children: itemContainerIds.join(","),
    caption: fullCaption,
  });

  await waitForContainer(carouselContainer.id);

  console.log(`[Publisher] Publicando Carrossel oficial no Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: carouselContainer.id,
  });

  await prisma.post.update({
    where: { id: post.id },
    data: { status: "PUBLISHED" },
  });

  return {
    success: true,
    publishedMediaId: publishRes.id,
  };
}

/**
 * 3. Publica Story de Foto (STORY_PHOTO / STORIES)
 */
export async function publishStoryPhoto(postId: string): Promise<PublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);
  const slide = post.slides[0];
  if (!slide || !slide.imagePath) throw new Error("Nenhuma imagem disponível para o Story.");

  const imageUrl = await getImageUrl(slide.imagePath, 86400);
  if (!imageUrl) throw new Error("Erro ao gerar URL da imagem para o Story.");

  console.log(`[Publisher] Criando container de Story na Meta API...`);
  const storyContainer = await metaRequest<{ id: string }>("/me/media", "POST", {
    image_url: imageUrl,
    media_type: "STORIES",
  });

  await waitForContainer(storyContainer.id);

  console.log(`[Publisher] Publicando Story oficial no Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: storyContainer.id,
  });

  await prisma.post.update({
    where: { id: post.id },
    data: { status: "PUBLISHED" },
  });

  return {
    success: true,
    publishedMediaId: publishRes.id,
  };
}

/**
 * Roteador unificado de publicação baseado no formato do post
 */
export async function publishPost(postId: string): Promise<PublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { format: true },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);

  const format = post.format.toUpperCase();

  if (format === "CAROUSEL") {
    return publishCarousel(postId);
  }

  if (format === "STORY_PHOTO" || format === "STORIES") {
    return publishStoryPhoto(postId);
  }

  // Padrão ou SINGLE_IMAGE
  return publishSingleImage(postId);
}
