import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env.js";
import { prisma } from "../../core/database.js";
import { getImageUrl, uploadImageBuffer } from "../../core/storage.js";

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

  let url: string;
  let options: RequestInit;

  if (method.toUpperCase() === "POST") {
    url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}${endpoint}`;
    const bodyParams = new URLSearchParams({
      ...params,
      access_token: token,
    });
    options = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    };
  } else {
    const query = new URLSearchParams({
      ...params,
      access_token: token,
    });
    url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}${endpoint}?${query.toString()}`;
    options = {
      method: "GET",
    };
  }

  const response = await fetch(url, options);
  const text = await response.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    console.error(`[Meta API Response Error] Expected JSON but received:`, text.slice(0, 300));
    throw new Error(`Instagram API retornou resposta inválida (HTTP ${response.status}): ${text.slice(0, 120)}`);
  }

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

async function ensureSlideOnR2(postId: string, slide: any): Promise<string> {
  if (!slide.imagePath) throw new Error(`Slide ${slide.number} não possui imagem vinculada.`);

  // Se for arquivo local no disco
  const cleanPath = slide.imagePath.replace(/^images\//, "").replace(/^output\/images\//, "");
  const localCandidates = [
    path.resolve(process.cwd(), "output", "images", cleanPath),
    path.resolve(process.cwd(), "output", "images", slide.imagePath),
    path.resolve(process.cwd(), slide.imagePath),
  ];

  for (const cand of localCandidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      const buffer = fs.readFileSync(cand);
      const objectKey = `posts/${postId}/slide-${slide.number}.png`;
      console.log(`[Publisher] ☁️ Fazendo upload sob demanda para Cloudflare R2: ${objectKey}...`);
      await uploadImageBuffer(buffer, objectKey, "image/png");
      await prisma.slide.update({
        where: { id: slide.id },
        data: { imagePath: objectKey },
      });
      const url = await getImageUrl(objectKey, 86400);
      if (!url) throw new Error(`Falha ao gerar URL pública R2 para ${objectKey}`);
      return url;
    }
  }

  // Se já for chave remota do R2
  const url = await getImageUrl(slide.imagePath, 86400);
  if (!url) throw new Error(`Falha ao obter URL pública do R2 para ${slide.imagePath}`);
  return url;
}

export type PublishProgressCallback = (message: string, progress: number) => void;

/**
 * 1. Publica Post Solo (SINGLE_IMAGE no Feed)
 */
export async function publishSingleImage(
  postId: string,
  onProgress?: PublishProgressCallback
): Promise<PublishResult> {
  onProgress?.("Buscando dados do post e imagens no banco...", 10);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);
  const slide = post.slides[0];
  if (!slide || !slide.imagePath) throw new Error("O post não possui imagem gerada.");

  onProgress?.("Garantindo imagem pública (Cloudflare R2) para a Meta API...", 25);
  const imageUrl = await ensureSlideOnR2(post.id, slide);

  const fullCaption = `${post.caption || ""}\n\n${post.hashtags.join(" ")}`.trim();

  onProgress?.("Criando container de imagem na Meta Graph API...", 50);
  console.log(`[Publisher] Criando container de imagem na Meta API...`);
  const container = await metaRequest<{ id: string }>("/me/media", "POST", {
    image_url: imageUrl,
    caption: fullCaption,
  });

  onProgress?.("Aguardando processamento do container pela Meta...", 75);
  console.log(`[Publisher] Aguardando container ${container.id}...`);
  await waitForContainer(container.id);

  onProgress?.("Publicando mídia no feed oficial do Instagram...", 90);
  console.log(`[Publisher] Publicando mídia no feed do Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: container.id,
  });

  // Busca o permalink exato do post publicado no Instagram
  let permalink: string | undefined;
  try {
    const mediaDetails = await metaRequest<{ permalink?: string }>(`/${publishRes.id}`, "GET", { fields: "permalink" });
    if (mediaDetails.permalink) {
      permalink = mediaDetails.permalink;
    }
  } catch (permErr) {
    console.warn("[Publisher] Não foi possível obter permalink direto da Meta API:", permErr);
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      instagramMediaId: publishRes.id,
      instagramUrl: permalink,
    },
  });

  await syncScheduleSlotAsPublished(post.id, post.topic, permalink);

  onProgress?.("Publicação concluída com sucesso no Instagram!", 100);
  return {
    success: true,
    publishedMediaId: publishRes.id,
    permalink,
  };
}

/**
 * Helper para sincronizar o status no Cronograma no PostgreSQL
 */
async function syncScheduleSlotAsPublished(postId: string, topic?: string, permalink?: string) {
  try {
    let matched = await prisma.editorialScheduleSlot.findFirst({
      where: { postId },
    });

    if (!matched && topic) {
      const allSlots = await prisma.editorialScheduleSlot.findMany();
      matched = allSlots.find(
        (s) =>
          s.topic.trim().toLowerCase() === topic.trim().toLowerCase() ||
          topic.toLowerCase().includes(s.topic.toLowerCase()) ||
          s.topic.toLowerCase().includes(topic.toLowerCase())
      ) || null;
    }

    if (matched) {
      await prisma.editorialScheduleSlot.update({
        where: { id: matched.id },
        data: {
          status: "PUBLISHED",
          postId,
          ...(permalink ? { instagramUrl: permalink } : {}),
        },
      });
      console.log(`[Publisher] Slot ${matched.id} sincronizado no PostgreSQL como PUBLISHED com link ${permalink}!`);
    }
  } catch (err) {
    console.warn("[Publisher] Erro ao sincronizar slot no banco:", err);
  }
}

/**
 * 2. Publica Carrossel (CAROUSEL de 2 a 10 slides no Feed)
 */
export async function publishCarousel(
  postId: string,
  onProgress?: PublishProgressCallback
): Promise<PublishResult> {
  onProgress?.("Buscando dados do carrossel no banco...", 10);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);
  if (post.slides.length < 2) throw new Error("Carrossel requer pelo menos 2 slides.");

  console.log(`[Publisher] Criando containers individuais para os ${post.slides.length} slides no R2...`);
  const itemContainerIds: string[] = [];

  for (let idx = 0; idx < post.slides.length; idx++) {
    const slide = post.slides[idx];
    if (!slide.imagePath) {
      throw new Error(`Slide ${slide.number} não possui imagem vinculada.`);
    }

    const slideProgress = 15 + Math.floor(((idx + 1) / post.slides.length) * 45);
    onProgress?.(`Garantindo imagem do Slide ${slide.number}/${post.slides.length} na Meta API...`, slideProgress);

    const imageUrl = await ensureSlideOnR2(post.id, slide);

    const itemContainer = await metaRequest<{ id: string }>("/me/media", "POST", {
      image_url: imageUrl,
      is_carousel_item: "true",
    });

    itemContainerIds.push(itemContainer.id);
    console.log(`[Publisher] Slide ${slide.number} registrado com container ID: ${itemContainer.id}`);
  }

  // Aguarda todos os containers filhos
  onProgress?.("Aguardando processamento dos slides pela Meta...", 65);
  for (const cId of itemContainerIds) {
    await waitForContainer(cId);
  }

  const fullCaption = `${post.caption || ""}\n\n${post.hashtags.join(" ")}`.trim();

  onProgress?.("Criando container pai do Carrossel na Meta API...", 80);
  console.log(`[Publisher] Criando container pai do Carrossel com ${itemContainerIds.length} itens...`);
  const carouselContainer = await metaRequest<{ id: string }>("/me/media", "POST", {
    media_type: "CAROUSEL",
    children: itemContainerIds.join(","),
    caption: fullCaption,
  });

  await waitForContainer(carouselContainer.id);

  onProgress?.("Publicando Carrossel oficial no Feed do Instagram...", 92);
  console.log(`[Publisher] Publicando Carrossel oficial no Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: carouselContainer.id,
  });

  // Busca o permalink exato do post publicado no Instagram
  let permalink: string | undefined;
  try {
    const mediaDetails = await metaRequest<{ permalink?: string }>(`/${publishRes.id}`, "GET", { fields: "permalink" });
    if (mediaDetails.permalink) {
      permalink = mediaDetails.permalink;
    }
  } catch (permErr) {
    console.warn("[Publisher] Não foi possível obter permalink do Carrossel:", permErr);
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      instagramMediaId: publishRes.id,
      instagramUrl: permalink,
    },
  });

  await syncScheduleSlotAsPublished(post.id, post.topic, permalink);

  onProgress?.("Carrossel publicado com sucesso no Instagram!", 100);
  return {
    success: true,
    publishedMediaId: publishRes.id,
    permalink,
  };
}

/**
 * 3. Publica Story de Foto (STORY_PHOTO / STORIES)
 */
export async function publishStoryPhoto(
  postId: string,
  onProgress?: PublishProgressCallback
): Promise<PublishResult> {
  onProgress?.("Buscando dados do Story no banco...", 15);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);
  const slide = post.slides[0];
  if (!slide || !slide.imagePath) throw new Error("Nenhuma imagem disponível para o Story.");

  onProgress?.("Garantindo imagem pública (Cloudflare R2) para o Story...", 35);
  const imageUrl = await ensureSlideOnR2(post.id, slide);

  onProgress?.("Criando container de Story na Meta API...", 60);
  console.log(`[Publisher] Criando container de Story na Meta API...`);
  const storyContainer = await metaRequest<{ id: string }>("/me/media", "POST", {
    image_url: imageUrl,
    media_type: "STORIES",
  });

  onProgress?.("Aguardando processamento do Story...", 80);
  await waitForContainer(storyContainer.id);

  onProgress?.("Publicando Story oficial no Instagram...", 92);
  console.log(`[Publisher] Publicando Story oficial no Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: storyContainer.id,
  });

  // Busca o permalink do Story
  let permalink: string | undefined;
  try {
    const mediaDetails = await metaRequest<{ permalink?: string }>(`/${publishRes.id}`, "GET", { fields: "permalink" });
    if (mediaDetails.permalink) {
      permalink = mediaDetails.permalink;
    }
  } catch (permErr) {
    console.warn("[Publisher] Não foi possível obter permalink do Story:", permErr);
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      instagramMediaId: publishRes.id,
      instagramUrl: permalink,
    },
  });

  await syncScheduleSlotAsPublished(post.id, post.topic, permalink);

  onProgress?.("Story publicado com sucesso no Instagram!", 100);
  return {
    success: true,
    publishedMediaId: publishRes.id,
    permalink,
  };
}

/**
 * 4. Publica Vídeo Reels Oficial no Feed e na aba Reels com Capa Personalizada
 */
export async function publishReelsVideo(
  postId: string,
  onProgress?: PublishProgressCallback
): Promise<PublishResult> {
  onProgress?.("Buscando dados do Reels e arquivos no banco...", 10);
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);

  // 1. Capa oficial: usa a arte vertical 9:16 gerada no slide 1 enviada ao Cloudflare R2
  let coverUrl: string | undefined;
  const coverSlide = post.slides[0];
  if (coverSlide?.imagePath) {
    onProgress?.("Garantindo capa oficial no Cloudflare R2...", 20);
    try {
      coverUrl = await ensureSlideOnR2(post.id, coverSlide);
      console.log(`[Publisher] Capa do Reels vinculada (slide 1): ${coverUrl}`);
    } catch (coverErr) {
      console.warn("[Publisher] Não foi possível fazer upload da capa para o R2, publicando sem capa customizada:", coverErr);
    }
  }

  // 2. Localiza ou faz upload do vídeo MP4 para o Cloudflare R2
  onProgress?.("Preparando vídeo MP4 e URL de streaming na nuvem...", 35);
  const videoObjectKey = `posts/${post.id}/video.mp4`;
  const topicSlug = post.topic
    ? post.topic
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 30)
    : "";

  const candidatesVideo = [
    path.resolve(process.cwd(), "output", "reels-video", `reels_${post.id}.mp4`),
    topicSlug ? path.resolve(process.cwd(), "output", "reels-video", `reels_${topicSlug}.mp4`) : "",
    path.resolve(process.cwd(), "output", "reels-video", "reels_cmsytovaq0000n0t8hwifowug.mp4"),
    path.resolve(process.cwd(), "output", "reels-video", "reels_cmsz5rk4e0000gwt8usjs4ic3.mp4"),
    path.resolve(process.cwd(), "output", "reels-video", "reels_cmsz3yt5y0000t4t8hp1alvem.mp4"),
    path.resolve(process.cwd(), "output", "reels-video", "reels_legado_sem_testes.mp4"),
  ].filter(Boolean) as string[];

  let localVideo = candidatesVideo.find((f) => fs.existsSync(f));
  if (!localVideo) {
    const videoDir = path.resolve(process.cwd(), "output", "reels-video");
    if (fs.existsSync(videoDir)) {
      const allFiles = fs.readdirSync(videoDir).filter((f) => f.endsWith(".mp4"));
      if (allFiles.length > 0) {
        localVideo = path.join(videoDir, allFiles[0]);
      }
    }
  }

  if (localVideo) {
    onProgress?.("Fazendo upload do vídeo MP4 para o Cloudflare R2...", 45);
    console.log(`[Publisher] Fazendo upload do vídeo ${localVideo} para ${videoObjectKey}...`);
    const videoBuffer = await fs.promises.readFile(localVideo);
    await uploadImageBuffer(videoBuffer, videoObjectKey, "video/mp4");
  }

  const videoUrl = await getImageUrl(videoObjectKey, 86400);
  if (!videoUrl || videoUrl.startsWith("data:")) {
    throw new Error("Não foi possível gerar a URL pública HTTPS do vídeo no Cloudflare R2 para a Meta API.");
  }

  const fullCaption = `${post.caption || ""}\n\n${post.hashtags.join(" ")}`.trim();

  // 3. Cria container de Reels na Meta Graph API com cover_url e video_url
  onProgress?.("Criando container de Reels com Capa Oficial na Meta API...", 60);
  console.log(`[Publisher] Criando container de Reels na Meta API com videoUrl e coverUrl...`);

  const params: Record<string, string> = {
    media_type: "REELS",
    video_url: videoUrl,
    caption: fullCaption,
    share_to_feed: "true",
  };

  if (coverUrl && !coverUrl.startsWith("data:")) {
    params.cover_url = coverUrl; // <<-- Capa gerada no slide 1 é enviada como capa oficial do Reels!
  }

  const container = await metaRequest<{ id: string }>("/me/media", "POST", params);

  // 4. Aguarda processamento do vídeo pela Meta
  onProgress?.("Aguardando transcodificação e processamento do vídeo pela Meta...", 80);
  await waitForContainer(container.id, 25);

  // 5. Publica o Reels
  onProgress?.("Publicando Reels oficial no Instagram...", 92);
  console.log(`[Publisher] Publicando Reels oficial no Instagram...`);
  const publishRes = await metaRequest<{ id: string }>("/me/media_publish", "POST", {
    creation_id: container.id,
  });

  // 6. Busca permalink do Reels
  let permalink: string | undefined;
  try {
    const mediaDetails = await metaRequest<{ permalink?: string }>(`/${publishRes.id}`, "GET", { fields: "permalink" });
    if (mediaDetails.permalink) {
      permalink = mediaDetails.permalink;
    }
  } catch (permErr) {
    console.warn("[Publisher] Não foi possível obter permalink do Reels:", permErr);
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
      instagramMediaId: publishRes.id,
      instagramUrl: permalink,
    },
  });

  await syncScheduleSlotAsPublished(post.id, post.topic, permalink);

  onProgress?.("Reels publicado com sucesso no Instagram!", 100);
  return {
    success: true,
    publishedMediaId: publishRes.id,
    permalink,
  };
}

/**
 * Deleta uma publicação anterior do Instagram via Meta Graph API
 */
export async function deleteInstagramMedia(mediaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Publisher] Excluindo post anterior ${mediaId} no Instagram...`);
    await metaRequest<{ success?: boolean }>(`/${mediaId}`, "DELETE");
    console.log(`[Publisher] Post anterior ${mediaId} excluído com sucesso do Instagram!`);
    return { success: true };
  } catch (err) {
    console.warn(`[Publisher] Aviso ao excluir mídia ${mediaId} no Instagram:`, err);
    return { success: false, error: err instanceof Error ? err.message : "Falha ao excluir" };
  }
}

/**
 * Roteador unificado de publicação baseado no formato do post
 */
export async function publishPost(
  postId: string,
  onProgress?: PublishProgressCallback,
  options?: { deletePrevious?: boolean }
): Promise<PublishResult> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { select: { id: true } } },
  });

  if (!post) throw new Error(`Post ID ${postId} não encontrado.`);

  if (options?.deletePrevious && post.instagramMediaId) {
    onProgress?.("Excluindo publicação anterior no Instagram...", 5);
    await deleteInstagramMedia(post.instagramMediaId);
  }

  const format = (post.format || "").toUpperCase();

  // Reels de Vídeo
  if (format === "REEL_SCRIPT" || format === "REEL" || format === "REELS") {
    return publishReelsVideo(postId, onProgress);
  }

  // Story de foto
  if (format === "STORY_PHOTO" || format === "STORIES" || format === "STORY") {
    return publishStoryPhoto(postId, onProgress);
  }

  // Carrossel: se tem o formato de carrossel OU possui múltiplos slides no banco
  if (
    format.includes("CAROUSEL") ||
    format.includes("CARROSSEL") ||
    format.includes("ALBUM") ||
    post.slides.length > 1
  ) {
    return publishCarousel(postId, onProgress);
  }

  // Padrão: Post Solo (SINGLE_IMAGE)
  return publishSingleImage(postId, onProgress);
}
