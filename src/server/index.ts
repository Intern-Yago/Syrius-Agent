import http, { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../core/database.js";
import { runPipeline } from "../pipeline/orchestrator.js";
import { publishPost } from "../integrations/instagram/publisher.js";
import {
  getAgencyChatHistory,
  processAgencyMessage,
} from "../services/agency-chat-service.js";

const PORT = Number(process.env.API_GATEWAY_PORT || 3001);

/**
 * Utilitários para Respostas HTTP e CORS
 */
function sendJSON(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, statusCode: number, message: string) {
  sendJSON(res, statusCode, { success: false, error: message });
}

async function parseBody<T = any>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      if (!body.trim()) return resolve({} as T);
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error("JSON de requisição inválido."));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Ordenação cronológica universal para a API
 */
const DAY_ORDER: Record<string, number> = {
  "segunda-feira": 1,
  segunda: 1,
  seg: 1,
  "terça-feira": 2,
  "terca-feira": 2,
  terça: 2,
  terca: 2,
  ter: 2,
  "quarta-feira": 3,
  quarta: 3,
  qua: 3,
  "quinta-feira": 4,
  quinta: 4,
  qui: 4,
  "sexta-feira": 5,
  sexta: 5,
  sex: 5,
  "sábado": 6,
  sabado: 6,
  sab: 6,
  domingo: 7,
  dom: 7,
};

function sortSlots(slots: any[]): any[] {
  const getDayNum = (dayStr?: string): number => {
    if (!dayStr) return 99;
    const clean = dayStr.trim().toLowerCase().replace(/^pr[oó]xima\s+/i, "").trim();
    for (const [key, num] of Object.entries(DAY_ORDER)) {
      if (clean === key || clean.startsWith(key)) return num;
    }
    return 99;
  };

  const getTimeNum = (timeStr?: string): number => {
    if (!timeStr) return 9999;
    const [h, m] = (timeStr || "").split(":").map(Number);
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };

  return [...slots].sort((a, b) => {
    const dayA = getDayNum(a.dayOfWeek);
    const dayB = getDayNum(b.dayOfWeek);
    if (dayA !== dayB) return dayA - dayB;
    return getTimeNum(a.timeSlot) - getTimeNum(b.timeSlot);
  });
}

/**
 * Servidor Principal do API Gateway
 */
export function createAPIGatewayServer() {
  const server = http.createServer(async (req, res) => {
    // 1. Tratamento de CORS Preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      });
      return res.end();
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    try {
      // ----------------------------------------------------
      // HEALTH & STATUS
      // ----------------------------------------------------
      if (pathname === "/api/health" && req.method === "GET") {
        return sendJSON(res, 200, {
          status: "ok",
          name: "Syrius Agent API Gateway",
          version: "1.0.0",
          timestamp: new Date().toISOString(),
        });
      }

      // ----------------------------------------------------
      // CRONOGRAMA EDITORIAL (SCHEDULE)
      // ----------------------------------------------------
      if (pathname === "/api/schedule" && req.method === "GET") {
        const weekOffset = Number(url.searchParams.get("weekOffset") || 0);
        const slots = await prisma.editorialScheduleSlot.findMany({
          where: { weekOffset },
          orderBy: { orderIndex: "asc" },
        });
        return sendJSON(res, 200, { success: true, slots: sortSlots(slots), weekOffset });
      }

      if (pathname === "/api/schedule/slot" && req.method === "POST") {
        const body = await parseBody(req);
        if (!body.dayOfWeek || !body.timeSlot || !body.topic) {
          return sendError(res, 400, "Campos obrigatórios ausentes (dayOfWeek, timeSlot, topic).");
        }

        const id = body.id || `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const weekOffset = body.weekOffset !== undefined ? Number(body.weekOffset) : 0;

        const slot = await prisma.editorialScheduleSlot.upsert({
          where: { id },
          update: {
            dayOfWeek: body.dayOfWeek,
            timeSlot: body.timeSlot,
            editorialPillar: body.editorialPillar,
            format: body.format || "CAROUSEL",
            narrativeAngle: body.narrativeAngle,
            topic: body.topic,
            objective: body.objective,
            reasoning: body.reasoning,
            weekOffset,
            status: body.status || "PLANNED",
            postId: body.postId || null,
          },
          create: {
            id,
            dayOfWeek: body.dayOfWeek,
            timeSlot: body.timeSlot,
            editorialPillar: body.editorialPillar,
            format: body.format || "CAROUSEL",
            narrativeAngle: body.narrativeAngle,
            topic: body.topic,
            objective: body.objective,
            reasoning: body.reasoning,
            weekOffset,
            status: body.status || "PLANNED",
            postId: body.postId || null,
          },
        });

        return sendJSON(res, 200, { success: true, slot });
      }

      if (pathname.startsWith("/api/schedule/slot/") && req.method === "DELETE") {
        const id = pathname.replace("/api/schedule/slot/", "");
        await prisma.editorialScheduleSlot.deleteMany({ where: { id } });
        return sendJSON(res, 200, { success: true, message: "Slot removido com sucesso." });
      }

      if (pathname === "/api/schedule/unmark-published" && req.method === "POST") {
        const body = await parseBody(req);
        if (!body.slotId) return sendError(res, 400, "slotId é obrigatório.");

        const slot = await prisma.editorialScheduleSlot.findUnique({ where: { id: body.slotId } });
        if (!slot) return sendError(res, 404, "Slot não encontrado.");

        if (slot.postId) {
          await prisma.post.update({
            where: { id: slot.postId },
            data: { status: "READY", instagramUrl: null, instagramMediaId: null },
          });
        }

        const updated = await prisma.editorialScheduleSlot.update({
          where: { id: body.slotId },
          data: { status: slot.postId ? "READY" : "PLANNED", instagramUrl: null },
        });

        return sendJSON(res, 200, { success: true, slot: updated });
      }

      // ----------------------------------------------------
      // AUTOPLAY & DAEMON
      // ----------------------------------------------------
      if (pathname === "/api/schedule/autoplay" && req.method === "GET") {
        const { getSettings } = await import("../config/settings.js");
        const s = await getSettings();
        return sendJSON(res, 200, { success: true, autoPublish: Boolean(s?.autoPublish) });
      }

      if (pathname === "/api/schedule/autoplay" && req.method === "POST") {
        const body = await parseBody(req);
        const { saveSettings } = await import("../config/settings.js");
        await saveSettings({ autoPublish: Boolean(body.autoPublish) });
        return sendJSON(res, 200, { success: true, autoPublish: Boolean(body.autoPublish) });
      }

      // ----------------------------------------------------
      // PRODUÇÃO DE POST POR SLOT
      // ----------------------------------------------------
      if (pathname === "/api/schedule/produce" && req.method === "POST") {
        const body = await parseBody(req);
        if (!body.topic || !body.format) {
          return sendError(res, 400, "topic e format são obrigatórios.");
        }

        // Roda em background e retorna imediatamente
        runPipeline({
          slot: {
            topic: body.topic,
            format: body.format,
            objective: body.objective,
            reasoning: body.reasoning,
            baseCopyPrompt: body.baseCopyPrompt,
            baseVisualPrompt: body.baseVisualPrompt,
          },
        }).then(async (result) => {
          if (result.success && result.postId && body.slotId) {
            await prisma.editorialScheduleSlot.update({
              where: { id: body.slotId },
              data: { postId: result.postId, status: "READY" },
            });
          }
        });

        return sendJSON(res, 202, {
          success: true,
          message: `Produção de "${body.topic}" iniciada no pipeline autônomo.`,
        });
      }

      // ----------------------------------------------------
      // POSTS & ACERVO
      // ----------------------------------------------------
      if (pathname === "/api/posts" && req.method === "GET") {
        const posts = await prisma.post.findMany({
          orderBy: { createdAt: "desc" },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        return sendJSON(res, 200, { success: true, posts });
      }

      if (pathname.startsWith("/api/posts/") && pathname.endsWith("/publish") && req.method === "POST") {
        const postId = pathname.split("/")[3];
        const body = await parseBody(req);
        const result = await publishPost(postId, undefined, { deletePrevious: body.deletePrevious });
        return sendJSON(res, 200, result);
      }

      if (pathname.startsWith("/api/posts/") && req.method === "GET") {
        const postId = pathname.replace("/api/posts/", "");
        const post = await prisma.post.findUnique({
          where: { id: postId },
          include: { slides: { orderBy: { number: "asc" } } },
        });
        if (!post) return sendError(res, 404, "Post não encontrado.");
        return sendJSON(res, 200, { success: true, post });
      }

      // ----------------------------------------------------
      // SALA DE REUNIÃO COM A GESTORA (ESTELAR)
      // ----------------------------------------------------
      if (pathname === "/api/agency/messages" && req.method === "GET") {
        const history = await getAgencyChatHistory();
        return sendJSON(res, 200, { success: true, history, status: "IDLE" });
      }

      if (pathname === "/api/agency/message" && req.method === "POST") {
        const body = await parseBody(req);
        if (!body.message || !body.message.trim()) {
          return sendError(res, 400, "Mensagem não pode ficar vazia.");
        }

        const reply = await processAgencyMessage(body.message.trim(), body.audioBase64);
        return sendJSON(res, 200, { success: true, reply });
      }

      // ----------------------------------------------------
      // SERVIR ARQUIVOS DE ÁUDIO / MÍDIA LOCAL
      // ----------------------------------------------------
      if (pathname.startsWith("/api/media/") && req.method === "GET") {
        const cleanPath = decodeURIComponent(pathname.replace("/api/media/", ""));
        const allowedDirs = [
          path.resolve(process.cwd(), "output"),
          path.resolve(process.cwd(), "output", "reels-audio"),
          path.resolve(process.cwd(), "output", "reels-video"),
          path.resolve(process.cwd(), "output", "images"),
        ];

        const targetFile = path.resolve(process.cwd(), cleanPath);
        const isAllowed = allowedDirs.some((dir) => targetFile.startsWith(dir));

        if (!isAllowed || !fs.existsSync(targetFile)) {
          return sendError(res, 404, "Arquivo de mídia não encontrado.");
        }

        const stat = fs.statSync(targetFile);
        const ext = path.extname(targetFile).toLowerCase();
        const contentType =
          ext === ".mp3" ? "audio/mpeg" : ext === ".mp4" ? "video/mp4" : "image/png";

        res.writeHead(200, {
          "Content-Type": contentType,
          "Content-Length": stat.size,
          "Access-Control-Allow-Origin": "*",
        });
        return fs.createReadStream(targetFile).pipe(res);
      }

      // ----------------------------------------------------
      // RADAR DE TENDÊNCIAS
      // ----------------------------------------------------
      if (pathname === "/api/trending" && req.method === "GET") {
        const { getActiveTrendingTopics } = await import("../services/trending-service.js");
        const data = await getActiveTrendingTopics();
        return sendJSON(res, 200, { success: true, data });
      }

      // Rota não encontrada
      return sendError(res, 404, `Rota ${req.method} ${pathname} não encontrada.`);
    } catch (err) {
      console.error(`[API Gateway Error] ${req.method} ${pathname}:`, err);
      return sendError(res, 500, err instanceof Error ? err.message : "Erro interno do servidor.");
    }
  });

  return server;
}

/**
 * Inicia o servidor se executado diretamente
 */
if (process.argv[1] && process.argv[1].includes("src/server/index.ts")) {
  const server = createAPIGatewayServer();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 [Syrius API Gateway] Servidor REST rodando em http://0.0.0.0:${PORT}`);
    console.log(`📱 Conecte o Syrius Mobile App via IP local da sua rede (ex: http://192.168.1.X:${PORT})\n`);
  });
}
