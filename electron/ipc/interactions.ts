import { ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeStructuredPrompt } from "../../src/core/gemini.js";
import { getBrandInfo } from "../../src/config/brand.js";
import { prisma } from "../../src/core/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const interactionsFilePath = path.join(projectRoot, "output", "community-interactions.json");
const scheduleFilePath = path.join(projectRoot, "output", "editorial-schedule.json");
const settingsFilePath = path.join(projectRoot, "output", "settings.json");

export interface CommunityInteraction {
  id: string;
  sourcePostId?: string;
  sourcePostTopic?: string;
  sourcePostFormat?: string;
  sourcePostUrl?: string;
  authorHandle: string;
  authorName?: string;
  content: string;
  receivedAt: string;
  type: "COMMENT" | "QUESTION_STICKER" | "DIRECT_MESSAGE";
  status: "UNANSWERED" | "ANSWERED" | "CONVERTED_TO_POST";
  replyText?: string;
  repliedAt?: string;
  convertedSlotId?: string;
}

const DEFAULT_INTERACTIONS: CommunityInteraction[] = [];

let registered = false;
let autoReplyActive = false;

async function loadInteractions(): Promise<CommunityInteraction[]> {
  try {
    await fs.mkdir(path.dirname(interactionsFilePath), { recursive: true });
    const content = await fs.readFile(interactionsFilePath, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INTERACTIONS;
  } catch {
    await fs.writeFile(interactionsFilePath, JSON.stringify(DEFAULT_INTERACTIONS, null, 2), "utf-8");
    return DEFAULT_INTERACTIONS;
  }
}

async function saveInteractions(items: CommunityInteraction[]): Promise<void> {
  await fs.mkdir(path.dirname(interactionsFilePath), { recursive: true });
  await fs.writeFile(interactionsFilePath, JSON.stringify(items, null, 2), "utf-8");
}

export function registerInteractionsIPC() {
  if (registered) return;
  registered = true;

  // 1. Listar Interações
  ipcMain.handle("interactions:list", async (): Promise<CommunityInteraction[]> => {
    return loadInteractions();
  });

  // 2. Gerar Resposta Técnica com IA
  ipcMain.handle(
    "interactions:generate-reply",
    async (
      _event,
      interactionId: string
    ): Promise<{ success: boolean; reply?: string; error?: string }> => {
      try {
        const items = await loadInteractions();
        const interaction = items.find((i) => i.id === interactionId);
        if (!interaction) {
          return { success: false, error: "Interação não encontrada." };
        }

        const brand = await getBrandInfo();

        const prompt = `
Você é o autor do perfil técnico de tecnologia ${brand.handle} no Instagram.

Responda ao comentário/dúvida de um seguidor com autoridade técnica, tom educado, conciso e acessível:

CONTEXTO DO POST DE ORIGEM:
- Post: ${interaction.sourcePostTopic || "Geral"} (${interaction.sourcePostFormat || "Instagram"})

DADOS DO SEGUIDOR:
- Autor: ${interaction.authorHandle} (${interaction.authorName || "Seguidor"})
- Mensagem / Dúvida: "${interaction.content}"

DIRETRIZES DA RESPOSTA:
1. Responda em no máximo 3 ou 4 frases curtas e diretas.
2. Forneça uma resposta técnica precisa e prática.
3. Chame o seguidor pelo primeiro nome ou handle de forma natural.
4. Tom de desenvolvedor sênior amigável, sem clichês vazios de coach.

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "reply": "Texto completo da resposta para postar no comentário/DM"
}
`.trim();

        const res = await executeStructuredPrompt<{ reply: string }>(prompt);
        return {
          success: true,
          reply: res.reply || "",
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro ao gerar resposta com IA.",
        };
      }
    }
  );

  // 3. Enviar / Salvar Resposta
  ipcMain.handle(
    "interactions:send-reply",
    async (
      _event,
      payload: { interactionId: string; replyText: string }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const items = await loadInteractions();
        const idx = items.findIndex((i) => i.id === payload.interactionId);
        if (idx === -1) {
          return { success: false, error: "Interação não encontrada." };
        }

        items[idx].status = "ANSWERED";
        items[idx].replyText = payload.replyText;
        items[idx].repliedAt = new Date().toISOString();

        await saveInteractions(items);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro ao salvar resposta.",
        };
      }
    }
  );

  // 4. Transformar Dúvida em Post ou Story de Resposta
  ipcMain.handle(
    "interactions:convert-to-post",
    async (
      _event,
      payload: { interactionId: string; preferredFormat?: string }
    ): Promise<{ success: boolean; createdSlot?: any; error?: string }> => {
      try {
        const items = await loadInteractions();
        const idx = items.findIndex((i) => i.id === payload.interactionId);
        if (idx === -1) {
          return { success: false, error: "Interação não encontrada." };
        }

        const inter = items[idx];
        const format = payload.preferredFormat || "STORY_PHOTO";

        const brand = await getBrandInfo();

        const prompt = `
Você é o estrategista de conteúdo do perfil ${brand.handle}.

Um seguidor enviou a seguinte dúvida de alto valor:
- Seguidor: ${inter.authorHandle}
- Dúvida: "${inter.content}"
- Post de Origem: "${inter.sourcePostTopic || "Geral"}"

Crie uma PAUTA ESTRATÉGICA DE RESPOSTA para ser produzida no formato ${format}:
- Título/Tema focado em responder a pergunta com autoridade.
- Justificativa estratégica mencionando que o post responde a dúvida do seguidor.

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "topic": "Título claro do post respondendo a dúvida",
  "objective": "EDUCATION",
  "reasoning": "Post de Q&A respondendo à dúvida enviada por ${inter.authorHandle}: '${inter.content.slice(0, 60)}...'",
  "suggestedSlot": "Quarta-feira às 12:00"
}
`.trim();

        const res = await executeStructuredPrompt<{
          topic: string;
          objective: string;
          reasoning: string;
          suggestedSlot: string;
        }>(prompt);

        let currentSchedule: any[] = [];
        try {
          const content = await fs.readFile(scheduleFilePath, "utf-8");
          currentSchedule = JSON.parse(content);
        } catch {
          currentSchedule = [];
        }

        const newSlot = {
          id: `slot-qa-${Date.now()}`,
          dayOfWeek: "Quarta-feira",
          timeSlot: format === "STORY_PHOTO" ? "12:00" : "18:30",
          editorialPillar: "Desafio do Código (Quiz)",
          format,
          topic: res.topic || `Respondendo ${inter.authorHandle}: ${inter.content.slice(0, 40)}`,
          objective: res.objective || "EDUCATION",
          reasoning: res.reasoning,
          status: "PLANNED",
          isCustom: true,
        };

        currentSchedule.push(newSlot);
        await fs.writeFile(scheduleFilePath, JSON.stringify(currentSchedule, null, 2), "utf-8");

        items[idx].status = "CONVERTED_TO_POST";
        items[idx].convertedSlotId = newSlot.id;
        await saveInteractions(items);

        return {
          success: true,
          createdSlot: newSlot,
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro ao converter pergunta em post.",
        };
      }
    }
  );

  // 5. Adicionar Interação Manualmente
  ipcMain.handle(
    "interactions:add-manual",
    async (
      _event,
      payload: {
        authorHandle: string;
        authorName?: string;
        content: string;
        sourcePostTopic?: string;
        sourcePostFormat?: string;
        sourcePostUrl?: string;
        type?: "COMMENT" | "QUESTION_STICKER" | "DIRECT_MESSAGE";
      }
    ): Promise<{ success: boolean; interaction?: CommunityInteraction; error?: string }> => {
      try {
        const items = await loadInteractions();
        const newInteraction: CommunityInteraction = {
          id: `inter-${Date.now()}`,
          authorHandle: payload.authorHandle.startsWith("@") ? payload.authorHandle : `@${payload.authorHandle}`,
          authorName: payload.authorName || payload.authorHandle,
          content: payload.content.trim(),
          sourcePostTopic: payload.sourcePostTopic || "Post do Instagram",
          sourcePostFormat: payload.sourcePostFormat || "CAROUSEL",
          sourcePostUrl: payload.sourcePostUrl || "https://www.instagram.com/syrius_tech/",
          receivedAt: new Date().toISOString(),
          type: payload.type || "COMMENT",
          status: "UNANSWERED",
        };

        items.unshift(newInteraction);
        await saveInteractions(items);

        return { success: true, interaction: newInteraction };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Erro ao adicionar interação.",
        };
      }
    }
  );

  // 6. Get / Set AutoReply
  ipcMain.handle("interactions:get-autoreply", async () => {
    return autoReplyActive;
  });

  ipcMain.handle("interactions:set-autoreply", async (_event, active: boolean) => {
    autoReplyActive = active;
    return autoReplyActive;
  });

  console.log("[interactions] IPC de Interações e Comentários registrado com sucesso.");
}
