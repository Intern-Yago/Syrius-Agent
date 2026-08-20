import { ipcMain, shell, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../../src/core/database.js";
import { getImageUrl, uploadImageBuffer, saveImageLocally } from "../../src/core/storage.js";
import { publishPost, type PublishResult } from "../../src/integrations/instagram/publisher.js";
import { getMediaServerPort, getMediaUrl } from "../media-server.js";
import { buildImagePrompt, refineImagePromptWithFeedback } from "../../src/prompts/brand-visual.prompt.js";
import { generateCloudflareImage } from "../../src/integrations/cloudflare/recraft.js";
import { getSettings } from "../../src/config/settings.js";
import { generateReelsCodeScenes } from "../../src/services/reels-animation-builder.js";

interface PostSlide {
  id: string;
  number: number;
  title: string;
  text: string;
  visualDirection: string;
  imagePath: string | null;
}

interface Post {
  id: string;
  topic: string;
  format: string;
  caption: string | null;
  hashtags: string[];
  status: string;
  createdAt: string;
  slides: PostSlide[];
  instagramUrl?: string | null;
  instagramMediaId?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
}

interface UpdatePostData {
  topic: string;
  caption: string;
  hashtags: string[];
}

export interface ActivePublishingTask {
  postId: string;
  topic: string;
  format: string;
  status: "running" | "completed" | "error";
  message: string;
  progress: number;
  startedAt: number;
  error?: string;
  publishedMediaId?: string;
}

export interface ActiveRegenerationTask {
  taskId: string;
  postId: string;
  slideNumber: number;
  slideId?: string;
  topic: string;
  format: string;
  status: "running" | "completed" | "error";
  message: string;
  progress: number;
  startedAt: number;
  error?: string;
  imagePath?: string;
}

let registered = false;
let getMainWindowRef: (() => BrowserWindow | null) | null = null;
const activePublishings = new Map<string, ActivePublishingTask>();
const activeRegenerations = new Map<string, ActiveRegenerationTask>();

export function trackAndNotifyPublishProgress(task: ActivePublishingTask) {
  activePublishings.set(task.postId, task);
  const win = getMainWindowRef ? getMainWindowRef() : null;
  if (win && !win.isDestroyed()) {
    win.webContents.send("posts:publish-progress", task);
  }
}

function notifyRegenerateProgress(task: ActiveRegenerationTask) {
  const win = getMainWindowRef ? getMainWindowRef() : null;
  if (win && !win.isDestroyed()) {
    win.webContents.send("posts:regenerate-progress", task);
  }
}

function normalizeHashtags(hashtags: unknown): string[] {
  if (!Array.isArray(hashtags)) return [];

  return hashtags
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => (tag.startsWith("#") ? tag.trim() : `#${tag.trim()}`))
    .filter((h, idx, arr) => arr.indexOf(h) === idx);
}

async function formatPostForClient(post: any): Promise<Post> {
  let videoUrl: string | null = null;
  let audioUrl: string | null = null;

  if (post.format === "REEL_SCRIPT" || post.format === "REEL") {
    // Procura vídeo renderizado especificamente para este post
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
    ].filter(Boolean) as string[];

    for (const cand of candidatesVideo) {
      if (fs.existsSync(cand)) {
        const basename = path.basename(cand);
        const port = getMediaServerPort();
        videoUrl = port > 0 ? `http://127.0.0.1:${port}/video/${basename}` : `http://localhost:5173/video/${basename}`;
        break;
      }
    }

    const videoDir = path.resolve(process.cwd(), "output", "reels-video");
    if (!videoUrl && fs.existsSync(videoDir)) {
      const files = fs.readdirSync(videoDir).filter((f) => f.endsWith(".mp4"));
      const topicLower = (post.topic || "").toLowerCase();

      for (const file of files) {
        const fileLower = file.toLowerCase();
        if (
          file.includes(post.id) ||
          (topicLower.includes("ecmascript") && (fileLower.includes("ecmascript") || fileLower.includes("try") || fileLower.includes("cmsz3yt5y") || fileLower.includes("cmsytovaq") || fileLower.includes("cmsz5rk4e"))) ||
          (topicLower.includes("try/catch") && (fileLower.includes("try") || fileLower.includes("ecmascript") || fileLower.includes("cmsz3yt5y") || fileLower.includes("cmsytovaq") || fileLower.includes("cmsz5rk4e"))) ||
          (topicLower.includes("legado") && (fileLower.includes("legado") || fileLower.includes("cmsywi5ww") || fileLower.includes("cmsyz5gyo")))
        ) {
          const port = getMediaServerPort();
          videoUrl = port > 0 ? `http://127.0.0.1:${port}/video/${file}` : `http://localhost:5173/video/${file}`;
          break;
        }
      }
    }

    // Procura áudio TTS gerado especificamente para este post
    const candidatesAudio = [
      path.resolve(process.cwd(), "output", "reels-audio", `reels_${post.id}.mp3`),
      topicSlug ? path.resolve(process.cwd(), "output", "reels-audio", `reels_${topicSlug}.mp3`) : "",
    ].filter(Boolean) as string[];

    for (const cand of candidatesAudio) {
      if (fs.existsSync(cand)) {
        const basename = path.basename(cand);
        const port = getMediaServerPort();
        audioUrl = port > 0 ? `http://127.0.0.1:${port}/audio/${basename}` : `http://localhost:5173/audio/${basename}`;
        break;
      }
    }

    const audioDir = path.resolve(process.cwd(), "output", "reels-audio");
    if (!audioUrl && fs.existsSync(audioDir)) {
      const audioFiles = fs.readdirSync(audioDir).filter((f) => f.endsWith(".mp3"));
      const topicLower = (post.topic || "").toLowerCase();

      for (const afile of audioFiles) {
        const fileLower = afile.toLowerCase();
        if (
          afile.includes(post.id) ||
          (topicLower.includes("ecmascript") && (fileLower.includes("ecmascript") || fileLower.includes("try") || fileLower.includes("cmsz3yt5y") || fileLower.includes("cmsytovaq") || fileLower.includes("cmsz5rk4e"))) ||
          (topicLower.includes("try/catch") && (fileLower.includes("try") || fileLower.includes("ecmascript") || fileLower.includes("cmsz3yt5y") || fileLower.includes("cmsytovaq") || fileLower.includes("cmsz5rk4e"))) ||
          (topicLower.includes("legado") && (fileLower.includes("legado") || fileLower.includes("cmsywi5ww") || fileLower.includes("cmsyz5gyo")))
        ) {
          const port = getMediaServerPort();
          audioUrl = port > 0 ? `http://127.0.0.1:${port}/audio/${afile}` : `http://localhost:5173/audio/${afile}`;
          break;
        }
      }
    }
  }

  const slides = await Promise.all(
    (post.slides || []).map(async (slide: any) => ({
      id: slide.id,
      number: slide.number,
      title: slide.title,
      text: slide.text,
      visualDirection: slide.visualDirection,
      imagePath: slide.imagePath ? await getImageUrl(slide.imagePath) : null,
    }))
  );

  return {
    id: post.id,
    topic: post.topic,
    format: post.format,
    caption: post.caption,
    hashtags: post.hashtags || [],
    status: post.status,
    createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : new Date().toISOString(),
    slides,
    instagramUrl: post.instagramUrl,
    instagramMediaId: post.instagramMediaId,
    videoUrl,
    audioUrl,
  };
}

async function getPostById(postId: string): Promise<Post> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) {
    throw new Error(`Post ID ${postId} não encontrado.`);
  }

  return formatPostForClient(post);
}

export function registerPostsIPC(getMainWindow?: () => BrowserWindow | null) {
  if (getMainWindow) {
    getMainWindowRef = getMainWindow;
  }
  if (registered) return;
  registered = true;

  const notifyPublishProgress = (task: ActivePublishingTask) => {
    const window = getMainWindowRef ? getMainWindowRef() : null;
    if (window && !window.isDestroyed()) {
      window.webContents.send("posts:publish-progress", task);
    }
  };

  // Listar Posts
  ipcMain.handle("posts:list", async (): Promise<Post[]> => {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { slides: { orderBy: { number: "asc" } } },
    });

    return Promise.all(posts.map((post) => formatPostForClient(post)));
  });

  // Atualizar Post
  ipcMain.handle("posts:update", async (_event, postId: string, data: UpdatePostData): Promise<Post> => {
    if (!postId || typeof postId !== "string") throw new Error("ID do post inválido.");
    if (!data || typeof data !== "object") throw new Error("Dados de atualização inválidos.");

    const topic = String(data.topic ?? "").trim();
    const caption = String(data.caption ?? "").trim();
    const hashtags = normalizeHashtags(data.hashtags);

    if (!topic) throw new Error("O tema do post não pode ficar vazio.");

    await prisma.post.update({
      where: { id: postId },
      data: {
        topic,
        caption: caption || null,
        hashtags,
      },
    });

    return getPostById(postId);
  });

  // Apagar Post
  ipcMain.handle("posts:delete", async (_event, postId: string): Promise<{ success: boolean }> => {
    if (!postId || typeof postId !== "string") throw new Error("ID do post inválido.");

    await prisma.post.delete({
      where: { id: postId },
    });

    return { success: true };
  });

  // Abrir Imagem local
  ipcMain.handle("posts:open-image", async (_event, imagePath: string): Promise<{ success: boolean; message?: string }> => {
    if (!imagePath || typeof imagePath !== "string") {
      return { success: false, message: "Caminho da imagem inválido." };
    }

    try {
      const result = await shell.openPath(imagePath);
      if (result) return { success: false, message: result };
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Não foi possível abrir a imagem.",
      };
    }
  });

  // Atualizar Status do Post Manualmente (Ex: Marcar como Publicado / Story com Caixinha)
  ipcMain.handle(
    "posts:set-status",
    async (_event, postId: string, status: string): Promise<Post> => {
      if (!postId || typeof postId !== "string") throw new Error("ID do post inválido.");
      const updated = await prisma.post.update({
        where: { id: postId },
        data: { status: status as any },
        include: { slides: { orderBy: { number: "asc" } } },
      });
      return formatPostForClient(updated);
    }
  );

  // Baixar Imagem Individual (abre Save Dialog)
  ipcMain.handle(
    "posts:download-image",
    async (
      _event,
      payload: { imageUrl: string; defaultFilename?: string }
    ): Promise<{ success: boolean; path?: string; error?: string }> => {
      try {
        const { dialog } = await import("electron");
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

        const suggestedName = payload.defaultFilename || `social-media-post-${Date.now()}.png`;

        const { canceled, filePath } = await dialog.showSaveDialog({
          title: "Salvar Imagem do Post",
          defaultPath: suggestedName,
          filters: [{ name: "PNG Images", extensions: ["png"] }],
        });

        if (canceled || !filePath) {
          return { success: false, error: "Download cancelado pelo usuário." };
        }

        // Buscar buffer da imagem
        const response = await fetch(payload.imageUrl);
        if (!response.ok) {
          throw new Error(`Falha ao baixar imagem (HTTP ${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        await fs.writeFile(filePath, Buffer.from(arrayBuffer));

        // Revelar no Windows Explorer
        shell.showItemInFolder(filePath);

        return { success: true, path: filePath };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro desconhecido ao salvar imagem.",
        };
      }
    }
  );

  // Baixar Todas as Imagens do Post + Legenda em uma Pasta
  ipcMain.handle(
    "posts:download-all",
    async (
      _event,
      postId: string
    ): Promise<{ success: boolean; path?: string; count?: number; error?: string }> => {
      try {
        const { dialog } = await import("electron");
        const fs = await import("node:fs/promises");
        const path = await import("node:path");

        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });

        if (!post) {
          return { success: false, error: "Post não encontrado no banco de dados." };
        }

        const { canceled, filePaths } = await dialog.showOpenDialog({
          title: "Selecione a pasta para exportar todas as artes e a legenda",
          properties: ["openDirectory", "createDirectory"],
        });

        if (canceled || !filePaths || filePaths.length === 0) {
          return { success: false, error: "Exportação cancelada pelo usuário." };
        }

        const targetDir = path.join(
          filePaths[0],
          `${post.format.toLowerCase()}-${post.id.slice(0, 8)}`
        );
        await fs.mkdir(targetDir, { recursive: true });

        // 1. Salvar arquivo de legenda (legenda.txt)
        const captionContent = [
          `# TÍTULO / TEMA: ${post.topic}`,
          `# FORMATO: ${post.format}`,
          `# STATUS: ${post.status}`,
          `# CRIADO EM: ${post.createdAt.toISOString()}`,
          "",
          "--- LEGENDA EDITORIAL ---",
          post.caption || "(Sem legenda)",
          "",
          "--- HASHTAGS ---",
          Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "",
          "",
          "--- ROTEIRO / CONTEÚDO DOS SLIDES ---",
          ...post.slides.map(
            (s) =>
              `[Slide ${s.number}] ${s.title}\nTexto: ${s.text}\nDireção Visual: ${s.visualDirection}\n`
          ),
        ].join("\n");

        await fs.writeFile(path.join(targetDir, "legenda.txt"), captionContent, "utf-8");

        // 2. Baixar cada slide
        let savedCount = 0;
        for (const slide of post.slides) {
          if (!slide.imagePath) continue;

          const signedUrl = await getImageUrl(slide.imagePath);
          if (!signedUrl) continue;

          const res = await fetch(signedUrl);
          if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            const fileName = `slide-${String(slide.number).padStart(2, "0")}.png`;
            await fs.writeFile(path.join(targetDir, fileName), buf);
            savedCount++;
          }
        }

        // 3. Abrir a pasta no Windows Explorer
        shell.openPath(targetDir);

        return {
          success: true,
          path: targetDir,
          count: savedCount,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro ao exportar artes do post.",
        };
      }
    }
  );

  // Obter tarefas ativas de publicação
  ipcMain.handle("posts:get-active-publishings", async (): Promise<ActivePublishingTask[]> => {
    return Array.from(activePublishings.values());
  });

  // Obter tarefas ativas de regeneração de artes
  ipcMain.handle("posts:get-active-regenerations", async (): Promise<ActiveRegenerationTask[]> => {
    return Array.from(activeRegenerations.values());
  });

  // Publicar Post na Meta Graph API com tracking de progresso em tempo real
  ipcMain.handle(
    "posts:publish",
    async (_event, postId: string, options?: { deletePrevious?: boolean }): Promise<PublishResult> => {
      if (!postId || typeof postId !== "string") {
        throw new Error("ID do post inválido para publicação.");
      }

      const post = await prisma.post.findUnique({
        where: { id: postId },
        include: { slides: true },
      });

      if (!post) {
        throw new Error(`Post ID ${postId} não encontrado.`);
      }

      const initialTask: ActivePublishingTask = {
        postId,
        topic: post.topic,
        format: post.format,
        status: "running",
        message: "Iniciando publicação na Meta Graph API...",
        progress: 5,
        startedAt: Date.now(),
      };

      activePublishings.set(postId, initialTask);
      notifyPublishProgress(initialTask);

      try {
        console.log(`\n🚀 [posts:publish] Iniciando publicação do post "${post.topic}" (${postId})...`);

        const result = await publishPost(
          postId,
          (message: string, progress: number) => {
            const task = activePublishings.get(postId);
            if (task) {
              task.message = message;
              task.progress = progress;
              notifyPublishProgress(task);
            }
          },
          options
        );

        if (result.success) {
          const completedTask: ActivePublishingTask = {
            postId,
            topic: post.topic,
            format: post.format,
            status: "completed",
            message: "Publicado com sucesso no Instagram!",
            progress: 100,
            startedAt: initialTask.startedAt,
            publishedMediaId: result.publishedMediaId,
          };
          activePublishings.set(postId, completedTask);
          notifyPublishProgress(completedTask);

          // Remove do cache após 20 segundos para manter o dashboard limpo
          setTimeout(() => {
            activePublishings.delete(postId);
          }, 20_000);

          return {
            success: true,
            publishedMediaId: result.publishedMediaId,
            permalink: result.permalink,
          };
        } else {
          const errorMsg = typeof result.error === "string" ? result.error : "Erro desconhecido ao publicar post.";
          const errorTask: ActivePublishingTask = {
            postId,
            topic: post.topic,
            format: post.format,
            status: "error",
            message: errorMsg,
            error: errorMsg,
            progress: 0,
            startedAt: initialTask.startedAt,
          };
          activePublishings.set(postId, errorTask);
          notifyPublishProgress(errorTask);
          return {
            success: false,
            error: errorMsg,
          };
        }
      } catch (err: any) {
        console.error(`❌ [posts:publish] Erro na publicação de ${postId}:`, err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        const errorTask: ActivePublishingTask = {
          postId,
          topic: post.topic,
          format: post.format,
          status: "error",
          message: errorMsg,
          error: errorMsg,
          progress: 0,
          startedAt: initialTask.startedAt,
        };
        activePublishings.set(postId, errorTask);
        notifyPublishProgress(errorTask);
        return {
          success: false,
          error: errorMsg,
        };
      }
    }
  );

  // Re-geração avulsa de arte com IA (Cloudflare Recraft v3) e tracking global
  ipcMain.handle(
    "posts:regenerate-image",
    async (
      _event,
      payload: {
        postId: string;
        slideId?: string;
        slideNumber?: number;
        customPrompt?: string;
        feedback?: string;
      }
    ) => {
      const { postId, slideId, slideNumber, customPrompt, feedback } = payload;
      const targetSlideNumber = slideNumber ?? 1;
      const taskId = `regen-${postId}-${targetSlideNumber}`;

      try {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        if (!post) throw new Error(`Post ID ${postId} não encontrado.`);

        let slide = post.slides.find(
          (s) => (slideId && s.id === slideId) || (slideNumber !== undefined && s.number === slideNumber)
        );
        if (!slide && post.slides.length > 0) {
          slide = post.slides[0];
        }
        if (!slide) throw new Error("Slide/Arte não encontrada.");

        const isVertical =
          post.format === "STORY_PHOTO" ||
          post.format === "STORIES" ||
          post.format === "REEL_SCRIPT" ||
          post.format === "REEL";
        const targetWidth = 1080;
        const targetHeight = isVertical ? 1920 : 1350;

        const task: ActiveRegenerationTask = {
          taskId,
          postId,
          slideNumber: slide.number,
          slideId: slide.id,
          topic: post.topic,
          format: post.format,
          status: "running",
          message: `Gerando nova arte para o Slide ${slide.number} com Recraft v3...`,
          progress: 25,
          startedAt: Date.now(),
        };
        activeRegenerations.set(taskId, task);
        notifyRegenerateProgress(task);

        let finalPrompt = customPrompt?.trim();
        if (payload.feedback?.trim()) {
          task.progress = 20;
          task.message = "Analisando feedback com a IA e recalculando prompt...";
          notifyRegenerateProgress(task);

          const refined = await refineImagePromptWithFeedback({
            feedback: payload.feedback.trim(),
            slideTitle: slide.title,
            slideText: slide.text,
            currentVisualDirection: slide.visualDirection,
            format: post.format,
            slideNumber: slide.number,
            totalSlides: post.slides.length,
          });

          finalPrompt = refined.refinedPrompt;
          console.log(`\n🧠 [posts:regenerate-image] Prompt refinado com IA: "${refined.rationale}"`);

          // Atualiza direção visual no banco para persistir o ajuste
          await prisma.slide.update({
            where: { id: slide.id },
            data: { visualDirection: refined.updatedVisualDirection },
          });
        } else if (!finalPrompt) {
          const promptInput = {
            number: slide.number,
            title: slide.title,
            text: slide.text,
            visualDirection: slide.visualDirection,
          };
          const promptData = buildImagePrompt(promptInput, post.slides.length, post.format);
          finalPrompt = promptData.prompt;
        }

        task.progress = 40;
        task.message = `Gerando nova arte com Cloudflare Recraft v3...`;
        notifyRegenerateProgress(task);

        console.log(`\n🎨 [posts:regenerate-image] Gerando nova arte com Recraft para Post ${post.id} (Slide ${slide.number})...`);
        const imageBuffer = await generateCloudflareImage({
          prompt: finalPrompt,
          width: targetWidth,
          height: targetHeight,
        });

        task.progress = 80;
        task.message = "Salvando nova arte localmente...";
        notifyRegenerateProgress(task);

        const relativeKey = `${post.id}/slide-${slide.number}.png`;
        const localPath = await saveImageLocally(imageBuffer, relativeKey);
        console.log(`[posts:regenerate-image] Nova arte salva localmente: ${localPath}`);

        await prisma.slide.update({
          where: { id: slide.id },
          data: { imagePath: localPath },
        });

        const updatedPost = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        const formatted = updatedPost ? await formatPostForClient(updatedPost) : null;

        task.progress = 100;
        task.status = "completed";
        task.message = `Nova arte do Slide ${slide.number} gerada com sucesso!`;
        task.imagePath = localPath;
        notifyRegenerateProgress(task);

        setTimeout(() => {
          activeRegenerations.delete(taskId);
        }, 15_000);

        console.log(`✅ [posts:regenerate-image] Nova arte gerada e salva localmente com sucesso!`);
        return {
          success: true,
          imagePath: localPath,
          post: formatted,
        };
      } catch (err: any) {
        console.error("❌ [posts:regenerate-image] Erro:", err);
        const errorMsg = err?.message || "Falha ao refazer imagem com IA.";
        const failedTask: ActiveRegenerationTask = {
          taskId,
          postId,
          slideNumber: targetSlideNumber,
          topic: "Post",
          format: "POST",
          status: "error",
          message: errorMsg,
          error: errorMsg,
          progress: 0,
          startedAt: Date.now(),
        };
        activeRegenerations.set(taskId, failedTask);
        notifyRegenerateProgress(failedTask);

        return {
          success: false,
          error: errorMsg,
        };
      }
    }
  );

  // Re-geração avulsa de vídeo Reels (TTS + Animação VS Code + Whisper AI)
  ipcMain.handle(
    "posts:regenerate-video",
    async (_event, payload: { postId: string }) => {
      const { postId } = payload;
      const taskId = `regen-video-${postId}`;

      try {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        if (!post) throw new Error(`Post ID ${postId} não encontrado.`);

        const task: ActiveRegenerationTask = {
          taskId,
          postId,
          slideNumber: 1,
          topic: post.topic,
          format: post.format,
          status: "running",
          message: "Sintetizando locução neural para o Reels...",
          progress: 20,
          startedAt: Date.now(),
        };
        activeRegenerations.set(taskId, task);
        notifyRegenerateProgress(task);

        const audioDir = path.resolve(process.cwd(), "output", "reels-audio");
        const videoDir = path.resolve(process.cwd(), "output", "reels-video");
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
        if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

        const audioPath = path.join(audioDir, `reels_${post.id}.mp3`);
        const videoPath = path.join(videoDir, `reels_${post.id}.mp4`);
        const configPath = path.join(videoDir, `config_${post.id}.json`);

        // 1. Sintetiza áudio TTS
        const narrationParts = (post.slides || [])
          .map((s) => s.text.replace(/\[.*?\]/g, "").trim())
          .filter(Boolean);
        const fullNarration = narrationParts.length > 0
          ? narrationParts.join(" ... ")
          : `${post.topic}. ${post.caption || ""}`;

        const settings = await getSettings();
        const elevenLabsKey = settings.voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
        const elevenLabsVoiceId = settings.voiceConfig?.elevenLabsVoiceId || "HmMggjJh26aAzvp7MtDb";

        let ttsSuccess = false;
        if (elevenLabsKey && elevenLabsKey.trim().length > 10) {
          try {
            const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
              method: "POST",
              headers: {
                "xi-api-key": elevenLabsKey.trim(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: fullNarration,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.35, similarity_boost: 0.8 },
              }),
            });
            if (res.ok) {
              const buf = Buffer.from(await res.arrayBuffer());
              fs.writeFileSync(audioPath, buf);
              ttsSuccess = true;
            }
          } catch {}
        }

        if (!ttsSuccess) {
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);
          const pythonScript = path.resolve(process.cwd(), "scripts", "synthesize_tts.py");
          await execFileAsync("python", [pythonScript, audioPath, "pt-BR-AntonioNeural", fullNarration]);
        }

        task.progress = 40;
        task.message = "Gerando código-fonte contextual e progressivo com IA...";
        notifyRegenerateProgress(task);

        // 2. Prepara cenas de código inteligentes com Gemini
        const scenes = await generateReelsCodeScenes({
          topic: post.topic,
          caption: post.caption || undefined,
          slides: (post.slides || []).map((s) => ({ number: s.number, title: s.title, text: s.text })),
        });

        task.progress = 60;
        task.message = "Renderizando vídeo com animação de código e Whisper AI...";
        notifyRegenerateProgress(task);

        const videoConfig = {
          postId: post.id,
          topic: post.topic,
          audioPath,
          outputPath: videoPath,
          scenes,
        };

        fs.writeFileSync(configPath, JSON.stringify(videoConfig, null, 2), "utf-8");

        // 3. Executa script python render_reels_for_post.py
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execFileAsync = promisify(execFile);
        const renderScript = path.resolve(process.cwd(), "scripts", "render_reels_for_post.py");
        await execFileAsync("python", [renderScript, configPath]);

        task.progress = 100;
        task.status = "completed";
        task.message = "Vídeo Reels renderizado com sucesso!";
        notifyRegenerateProgress(task);

        const updatedPost = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        const formatted = updatedPost ? await formatPostForClient(updatedPost) : null;

        setTimeout(() => {
          activeRegenerations.delete(taskId);
        }, 15_000);

        return {
          success: true,
          post: formatted,
        };
      } catch (err: any) {
        console.error("❌ [posts:regenerate-video] Erro:", err);
        const errorMsg = err?.message || "Falha ao renderizar vídeo Reels com IA.";
        const failedTask: ActiveRegenerationTask = {
          taskId,
          postId,
          slideNumber: 1,
          topic: "Reels",
          format: "REEL_SCRIPT",
          status: "error",
          message: errorMsg,
          error: errorMsg,
          progress: 0,
          startedAt: Date.now(),
        };
        activeRegenerations.set(taskId, failedTask);
        notifyRegenerateProgress(failedTask);

        return {
          success: false,
          error: errorMsg,
        };
      }
    }
  );

  // Ajuste Rápido de Texto do Slide & Recomposição Tipográfica Instantânea com Sharp (sem custo de IA)
  ipcMain.handle(
    "posts:update-slide-text",
    async (
      _event,
      payload: {
        postId: string;
        slideNumber: number;
        title: string;
        text?: string;
      }
    ): Promise<{ success: boolean; imagePath?: string; error?: string }> => {
      try {
        const { postId, slideNumber, title, text } = payload;
        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        if (!post) throw new Error("Post não encontrado.");

        const slide = post.slides.find((s) => s.number === slideNumber);
        if (!slide) throw new Error(`Slide ${slideNumber} não encontrado.`);

        // 1. Atualiza no PostgreSQL
        await prisma.slide.update({
          where: { id: slide.id },
          data: {
            title: title.trim(),
            text: text !== undefined ? text.trim() : slide.text,
          },
        });

        // 2. Se o slide possui imagem local em disco, recomprime o SVG com o novo título
        if (slide.imagePath && fs.existsSync(slide.imagePath)) {
          const imageBuffer = await fs.promises.readFile(slide.imagePath);
          const { overlaySlideTypography } = await import("../../src/core/typography-compositor.js");
          const recomposed = await overlaySlideTypography(imageBuffer, {
            title,
            format: post.format,
          });
          await fs.promises.writeFile(slide.imagePath, recomposed);
          console.log(`[posts:update-slide-text] Slide ${slideNumber} recomposto com sucesso com Sharp!`);
        }

        return { success: true, imagePath: slide.imagePath || undefined };
      } catch (err: any) {
        console.error("[posts:update-slide-text] Erro:", err);
        return { success: false, error: err?.message || "Erro ao atualizar texto do slide." };
      }
    }
  );

  console.log("[posts] IPC de posts registrado com sucesso.");
}