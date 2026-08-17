import { ipcMain, shell } from "electron";
import { prisma } from "../../src/core/database.js";
import { getImageUrl } from "../../src/core/storage.js";
import { publishPost } from "../../src/integrations/instagram/publisher.js";

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
}

interface UpdatePostData {
  topic: string;
  caption: string;
  hashtags: string[];
}

let registered = false;

function normalizeHashtags(hashtags: unknown): string[] {
  if (!Array.isArray(hashtags)) return [];

  return hashtags
    .map((h) => String(h).trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`))
    .filter((h, idx, arr) => arr.indexOf(h) === idx);
}

async function getPostById(postId: string): Promise<Post> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) {
    throw new Error("Post não encontrado.");
  }

  return {
    id: post.id,
    topic: post.topic,
    format: post.format,
    caption: post.caption,
    hashtags: normalizeHashtags(post.hashtags),
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    slides: await Promise.all(
      post.slides.map(async (slide): Promise<PostSlide> => ({
        id: slide.id,
        number: slide.number,
        title: slide.title,
        text: slide.text,
        visualDirection: slide.visualDirection,
        imagePath: await getImageUrl(slide.imagePath),
      }))
    ),
  };
}

export function registerPostsIPC() {
  if (registered) return;
  registered = true;

  // Listar Posts
  ipcMain.handle("posts:list", async (): Promise<Post[]> => {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: { slides: { orderBy: { number: "asc" } } },
    });

    return Promise.all(
      posts.map(async (post): Promise<Post> => ({
        id: post.id,
        topic: post.topic,
        format: post.format,
        caption: post.caption,
        hashtags: normalizeHashtags(post.hashtags),
        status: post.status,
        createdAt: post.createdAt.toISOString(),
        slides: await Promise.all(
          post.slides.map(async (slide): Promise<PostSlide> => ({
            id: slide.id,
            number: slide.number,
            title: slide.title,
            text: slide.text,
            visualDirection: slide.visualDirection,
            imagePath: await getImageUrl(slide.imagePath),
          }))
        ),
      }))
    );
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

  // Publicar Post na Meta Graph API
  ipcMain.handle("posts:publish", async (_event, postId: string) => {
    if (!postId || typeof postId !== "string") throw new Error("ID do post inválido.");
    return publishPost(postId);
  });

  console.log("[posts] IPC de posts registrado com sucesso.");
}