import { ipcMain, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeStructuredPrompt } from "../../src/core/gemini.js";
import { getBrandInfo } from "../../src/config/brand.js";
import { getAnalyticsHistory } from "../../src/services/analytics-engine.js";
import { prisma } from "../../src/core/database.js";
import { runPipeline } from "../../src/pipeline/orchestrator.js";
import { getSettings } from "../../src/config/settings.js";
import { publishPost } from "../../src/integrations/instagram/publisher.js";
import { sendOverduePostAlertEmail } from "../../src/services/email-service.js";
import {
  getPendingRecommendations,
  addPendingRecommendation,
  clearPendingRecommendations,
} from "../../src/services/pending-recommendations.js";
import { getActiveTrendingTopics, refreshTrendingTopics } from "../../src/services/trending-service.js";
import { trackAndNotifyPublishProgress, ActivePublishingTask } from "./posts.js";
import { sendNativeNotification } from "../notification.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const scheduleFilePath = path.join(projectRoot, "output", "editorial-schedule.json");

export interface ScheduleSlot {
  id: string;
  dayOfWeek: string; // "Segunda-feira", "Terça-feira", etc.
  timeSlot: string;  // "18:30", "12:00", etc.
  editorialPillar?: string; // "Segunda da Arquitetura", "Desafio de Código (Quiz)", etc.
  format: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | "STORY_PHOTO" | string;
  narrativeAngle?: string; // "BEFORE_AFTER", "HOT_TAKE", "MIGRATION_GUIDE", "SENIOR_REVIEW", "BREAKING_NEWS", "DEEP_DIVE", "COMMUNITY_PULSE", "TLDR_SUMMARY", "STEP_BY_STEP_TUTORIAL"
  topic: string;
  objective: "AUTHORITY" | "VIRALITY" | "EDUCATION" | "ENGAGEMENT" | string;
  reasoning: string;
  status: "PLANNED" | "READY" | "SCHEDULED" | "PUBLISHED";
  postId?: string;
  pinned?: boolean;
  isCustom?: boolean;
  isStorySlot?: boolean;
  interactiveStoryType?: string;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  weekOffset?: number;
  lastOverdueNotifiedAt?: string;
  instagramUrl?: string;
}

const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  {
    id: "slot-1",
    dayOfWeek: "Segunda-feira",
    timeSlot: "18:30",
    editorialPillar: "Segunda da Arquitetura",
    format: "CAROUSEL",
    narrativeAngle: "BEFORE_AFTER",
    topic: "Guia Definitivo de Docker Multi-stage Builds e Otimização de Imagens",
    objective: "AUTHORITY",
    reasoning: "Segunda-feira com Carrossel denso focado em salvamentos e autoridade técnica para a semana.",
    status: "PLANNED",
    isStorySlot: false,
  },
  {
    id: "slot-2",
    dayOfWeek: "Terça-feira",
    timeSlot: "12:15",
    editorialPillar: "Desafio de Código (Quiz)",
    format: "STORY_PHOTO",
    narrativeAngle: "COMMUNITY_PULSE",
    topic: "Quiz Técnico: Você sabe a diferença prática entre Type e Interface no TypeScript?",
    objective: "ENGAGEMENT",
    reasoning: "Quiz interativo de 1 clique no horário de almoço da terça-feira para gerar engajamento instantâneo nos Stories.",
    status: "PLANNED",
    isStorySlot: true,
    interactiveStoryType: "QUIZ",
  },
  {
    id: "slot-3",
    dayOfWeek: "Quarta-feira",
    timeSlot: "19:00",
    editorialPillar: "Clean Code & Boas Práticas",
    format: "SINGLE_IMAGE",
    narrativeAngle: "SENIOR_REVIEW",
    topic: "Como estruturar um Error Handling limpo e desacoplado no Node.js",
    objective: "EDUCATION",
    reasoning: "Meio de semana com foco em código limpo. Post solo no Feed de leitura direta e compartilhamentos.",
    status: "PLANNED",
    isStorySlot: false,
  },
  {
    id: "slot-4",
    dayOfWeek: "Quinta-feira",
    timeSlot: "18:00",
    editorialPillar: "Notícias & Lançamentos Tech",
    format: "REEL_SCRIPT",
    narrativeAngle: "BREAKING_NEWS",
    topic: "Anthropic lança Claude 3.7 Sonnet: Modo Híbrido de Raciocínio e Mudança na Arquitetura de LLMs",
    objective: "VIRALITY",
    reasoning: "Vídeo dinâmico de notícias e lançamentos em alta para atrair novos programadores no topo de funil com breaking news.",
    status: "PLANNED",
    isStorySlot: false,
  },
  {
    id: "slot-5",
    dayOfWeek: "Sexta-feira",
    timeSlot: "17:30",
    editorialPillar: "Engenharia de Software",
    format: "CAROUSEL",
    narrativeAngle: "BEFORE_AFTER",
    topic: "Arquitetura Hexagonal vs Clean Architecture: Comparativo Prático em TypeScript",
    objective: "AUTHORITY",
    reasoning: "Encerramento da semana com conteúdo denso de engenharia no Feed para leitura e debate durante o fim de semana.",
    status: "PLANNED",
    isStorySlot: false,
  },
  {
    id: "slot-6",
    dayOfWeek: "Sábado",
    timeSlot: "11:30",
    editorialPillar: "Debate Dev & Enquete",
    format: "STORY_PHOTO",
    topic: "Enquete: Monólito Modular ou Microsserviços para projetos com times de até 5 pessoas?",
    objective: "ENGAGEMENT",
    reasoning: "Sábado pela manhã com votação binária de 1 clique nos Stories, estimulando debate sem exigir digitação de texto.",
    status: "PLANNED",
    isStorySlot: true,
    interactiveStoryType: "POLL",
  },
];

let registered = false;
let autoplayActive = false;
let autoplayTimer: NodeJS.Timeout | null = null;
const notifiedSlotsTodaySet = new Set<string>();

async function loadSchedule(weekOffset: number = 0): Promise<ScheduleSlot[]> {
  try {
    let dbSlots = await prisma.editorialScheduleSlot.findMany({
      where: { weekOffset },
      orderBy: { orderIndex: "asc" },
    });

    // Se for semana atual (0) e a tabela estiver vazia, inicializa com DEFAULT_SCHEDULE
    if (weekOffset === 0 && dbSlots.length === 0) {
      for (let i = 0; i < DEFAULT_SCHEDULE.length; i++) {
        const s = DEFAULT_SCHEDULE[i];
        await prisma.editorialScheduleSlot.create({
          data: {
            id: s.id || `slot-${Date.now()}-${i}`,
            dayOfWeek: s.dayOfWeek,
            timeSlot: s.timeSlot,
            editorialPillar: s.editorialPillar,
            format: s.format,
            topic: s.topic,
            objective: s.objective,
            reasoning: s.reasoning,
            baseCopyPrompt: s.baseCopyPrompt,
            baseVisualPrompt: s.baseVisualPrompt,
            weekOffset: 0,
            status: s.status,
            postId: s.postId,
            pinned: Boolean(s.pinned),
            isCustom: Boolean(s.isCustom),
            orderIndex: i,
          },
        });
      }

      dbSlots = await prisma.editorialScheduleSlot.findMany({
        where: { weekOffset: 0 },
        orderBy: { orderIndex: "asc" },
      });
    }

    // Se for proxima semana (1) e ainda nao tiver slots gerados, preenche com as pautas salvas em PendingRecommendedTopic
    if (weekOffset === 1 && dbSlots.length === 0) {
      const pending = await prisma.pendingRecommendedTopic.findMany({
        orderBy: { createdAt: "asc" },
      });

      if (pending.length > 0) {
        for (let i = 0; i < pending.length; i++) {
          const p = pending[i];
          await prisma.editorialScheduleSlot.create({
            data: {
              id: `slot-next-${Date.now()}-${i}`,
              dayOfWeek: p.suggestedDay,
              timeSlot: p.suggestedTime,
              editorialPillar: "Recomendacao IA",
              format: p.suggestedFormat,
              topic: p.topic,
              objective: p.objective || "AUTHORITY",
              reasoning: p.reason || "Pauta recomendada pelo Analytics salva para a proxima semana.",
              baseCopyPrompt: p.baseCopyPrompt,
              baseVisualPrompt: p.baseVisualPrompt,
              weekOffset: 1,
              status: "PLANNED",
              isCustom: true,
              orderIndex: i,
            },
          });
        }

        dbSlots = await prisma.editorialScheduleSlot.findMany({
          where: { weekOffset: 1 },
          orderBy: { orderIndex: "asc" },
        });
      }
    }

    // Sincroniza status e instagramUrl em tempo real com o banco de dados PostgreSQL
    const posts = await prisma.post.findMany({
      select: { id: true, topic: true, status: true, instagramUrl: true },
    });

    const resultSlots: ScheduleSlot[] = [];

    for (const slot of dbSlots) {
      let currentStatus = slot.status as any;
      let currentPostId = slot.postId;
      let currentInstagramUrl = slot.instagramUrl;
      let dirty = false;

      let matchingPost = null;
      if (slot.postId) {
        matchingPost = posts.find((p) => p.id === slot.postId) || null;
      } else if (slot.topic) {
        matchingPost = posts.find(
          (p) =>
            p.topic.trim().toLowerCase() === slot.topic.trim().toLowerCase() ||
            p.topic.toLowerCase().includes(slot.topic.toLowerCase()) ||
            slot.topic.toLowerCase().includes(p.topic.toLowerCase())
        ) || null;
      }

      if (matchingPost) {
        if (slot.postId !== matchingPost.id) {
          currentPostId = matchingPost.id;
          dirty = true;
        }

        if (matchingPost.status === "PUBLISHED" && slot.status !== "PUBLISHED") {
          currentStatus = "PUBLISHED";
          dirty = true;
        } else if (matchingPost.status === "READY" && slot.status !== "READY" && slot.status !== "PUBLISHED") {
          currentStatus = "READY";
          dirty = true;
        }

        if (matchingPost.instagramUrl && matchingPost.instagramUrl !== currentInstagramUrl) {
          currentInstagramUrl = matchingPost.instagramUrl;
          dirty = true;
        }
      }

      if (dirty) {
        await prisma.editorialScheduleSlot.update({
          where: { id: slot.id },
          data: { status: currentStatus, postId: currentPostId, instagramUrl: currentInstagramUrl },
        });
      }

      resultSlots.push({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        timeSlot: slot.timeSlot,
        editorialPillar: slot.editorialPillar || undefined,
        format: slot.format,
        narrativeAngle: slot.narrativeAngle || undefined,
        topic: slot.topic,
        objective: slot.objective,
        reasoning: slot.reasoning,
        status: currentStatus,
        postId: currentPostId || undefined,
        pinned: slot.pinned,
        isCustom: slot.isCustom,
        isStorySlot: slot.isStorySlot,
        interactiveStoryType: slot.interactiveStoryType || undefined,
        baseCopyPrompt: slot.baseCopyPrompt || undefined,
        baseVisualPrompt: slot.baseVisualPrompt || undefined,
        weekOffset: slot.weekOffset,
        lastOverdueNotifiedAt: slot.lastOverdueNotifiedAt ? slot.lastOverdueNotifiedAt.toISOString() : undefined,
        instagramUrl: currentInstagramUrl || undefined,
      });
    }

    return resultSlots;
  } catch (err) {
    console.error("[schedule] Erro ao carregar do PostgreSQL:", err);
    return weekOffset === 0 ? DEFAULT_SCHEDULE : [];
  }
}

async function saveSchedule(slots: ScheduleSlot[], weekOffset: number = 0): Promise<void> {
  try {
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      const isStory = Boolean(
        s.isStorySlot ||
        s.format === "STORY_PHOTO" ||
        s.format === "STORY" ||
        s.format === "STORIES"
      );

      await prisma.editorialScheduleSlot.upsert({
        where: { id: s.id },
        update: {
          dayOfWeek: s.dayOfWeek,
          timeSlot: s.timeSlot,
          editorialPillar: s.editorialPillar,
          format: s.format,
          narrativeAngle: s.narrativeAngle || null,
          topic: s.topic,
          objective: s.objective,
          reasoning: s.reasoning,
          baseCopyPrompt: s.baseCopyPrompt,
          baseVisualPrompt: s.baseVisualPrompt,
          weekOffset: s.weekOffset !== undefined ? s.weekOffset : weekOffset,
          status: s.status,
          postId: s.postId,
          pinned: Boolean(s.pinned),
          isCustom: Boolean(s.isCustom),
          isStorySlot: isStory,
          interactiveStoryType: s.interactiveStoryType || (isStory ? "QUIZ" : null),
          lastOverdueNotifiedAt: s.lastOverdueNotifiedAt ? new Date(s.lastOverdueNotifiedAt) : null,
          orderIndex: i,
        },
        create: {
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          timeSlot: s.timeSlot,
          editorialPillar: s.editorialPillar,
          format: s.format,
          narrativeAngle: s.narrativeAngle || null,
          topic: s.topic,
          objective: s.objective,
          reasoning: s.reasoning,
          baseCopyPrompt: s.baseCopyPrompt,
          baseVisualPrompt: s.baseVisualPrompt,
          weekOffset: s.weekOffset !== undefined ? s.weekOffset : weekOffset,
          status: s.status,
          postId: s.postId,
          pinned: Boolean(s.pinned),
          isCustom: Boolean(s.isCustom),
          isStorySlot: isStory,
          interactiveStoryType: s.interactiveStoryType || (isStory ? "QUIZ" : null),
          orderIndex: i,
        },
      });
    }

    // Remove do banco apenas os slots deste weekOffset que não estão mais na lista
    const currentIds = slots.map((s) => s.id);
    await prisma.editorialScheduleSlot.deleteMany({
      where: {
        weekOffset,
        id: { notIn: currentIds },
      },
    });
  } catch (err) {
    console.error("[schedule] Erro ao salvar grade no PostgreSQL:", err);
  }
}

const DAYS_MAP = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function registerScheduleIPC(getMainWindow?: () => BrowserWindow | null) {
  if (registered) return;
  registered = true;

  // Inicia daemon do agendador automático em background
  startSchedulerDaemon(getMainWindow);

  // 1. Obter Cronograma (Semana Atual por padrão ou Próxima Semana com weekOffset = 1)
  ipcMain.handle("schedule:get", async (_event, weekOffset?: number): Promise<ScheduleSlot[]> => {
    return loadSchedule(weekOffset ?? 0);
  });

  // 2. Salvar ou Atualizar Slot (Marca como custom/editado pelo usuário)
  ipcMain.handle("schedule:save-slot", async (_event, slot: ScheduleSlot, weekOffset?: number): Promise<ScheduleSlot[]> => {
    const offset = weekOffset ?? slot.weekOffset ?? 0;
    const schedule = await loadSchedule(offset);
    const existingIndex = schedule.findIndex((s) => s.id === slot.id);

    const slotWithFlag: ScheduleSlot = {
      ...slot,
      weekOffset: offset,
      isCustom: true,
    };

    if (existingIndex >= 0) {
      schedule[existingIndex] = { ...schedule[existingIndex], ...slotWithFlag };
    } else {
      schedule.push(slotWithFlag);
    }

    await saveSchedule(schedule, offset);
    return schedule;
  });

  // Salvar Grade Completa
  ipcMain.handle("schedule:save-all", async (_event, slots: ScheduleSlot[], weekOffset?: number): Promise<ScheduleSlot[]> => {
    const offset = weekOffset ?? 0;
    await saveSchedule(slots, offset);
    return slots;
  });

  // 3. Deletar Slot
  ipcMain.handle("schedule:delete-slot", async (_event, slotId: string, weekOffset?: number): Promise<ScheduleSlot[]> => {
    const offset = weekOffset ?? 0;
    const schedule = await loadSchedule(offset);
    const filtered = schedule.filter((s) => s.id !== slotId);
    await saveSchedule(filtered, offset);
    return filtered;
  });

  // 4. Toggle Autoplay
  ipcMain.handle("schedule:get-autoplay", async (): Promise<boolean> => {
    return autoplayActive;
  });

  ipcMain.handle("schedule:set-autoplay", async (_event, active: boolean): Promise<boolean> => {
    autoplayActive = active;
    try {
      const { saveSettings } = await import("../../src/config/settings.js");
      await saveSettings({ autoPublish: active });
    } catch {}
    console.log(`[schedule] Modo Autônomo Autoplay: ${active ? "ATIVADO" : "DESATIVADO"}`);

    if (active) {
      setTimeout(() => {
        executeSchedulerCycle(getMainWindow);
      }, 500);
    }
    return autoplayActive;
  });

  // Avançar Próxima Semana para Semana Atual
  ipcMain.handle("schedule:advance-week", async (): Promise<{ success: boolean; slots: ScheduleSlot[] }> => {
    const nextWeekSlots = await loadSchedule(1);
    if (nextWeekSlots.length > 0) {
      await prisma.editorialScheduleSlot.deleteMany({ where: { weekOffset: 0 } });
      await prisma.editorialScheduleSlot.updateMany({
        where: { weekOffset: 1 },
        data: { weekOffset: 0 },
      });
    }
    const updated = await loadSchedule(0);
    return { success: true, slots: updated };
  });

  // 5. Inserir Pauta Recomendada da Análise IA na Grade (com roteamento inteligente para Próxima Semana se a data já expirou)
  ipcMain.handle(
    "schedule:add-topic",
    async (
      _event,
      payload: {
        topic: string;
        suggestedFormat?: string;
        suggestedDay?: string;
        suggestedTime?: string;
        reason?: string;
        baseCopyPrompt?: string;
        baseVisualPrompt?: string;
        objective?: string;
      }
    ): Promise<{ success: boolean; schedule: ScheduleSlot[]; slotId?: string; isNextWeek?: boolean; message?: string }> => {
      const schedule = await loadSchedule();
      const targetDay = payload.suggestedDay || "Segunda-feira";
      const targetFormat = payload.suggestedFormat || "CAROUSEL";
      const targetTime = payload.suggestedTime || "18:30";

      // Calcula se o dia/horário sugerido JÁ PASSOU na semana corrente
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const normalizedSlotDay = targetDay.trim().toLowerCase();
      const slotDayIndex = DAYS_ORDER_NUM[normalizedSlotDay] !== undefined ? DAYS_ORDER_NUM[normalizedSlotDay] : 1;
      const [slotH, slotM] = targetTime.split(":").map(Number);
      const slotTimeInMinutes = (isNaN(slotH) ? 18 : slotH) * 60 + (isNaN(slotM) ? 0 : slotM);
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

      const isPastDay = currentDayOfWeek > slotDayIndex;
      const isPastTimeToday = currentDayOfWeek === slotDayIndex && currentTimeInMinutes >= slotTimeInMinutes;
      const isAlreadyPassedThisWeek = isPastDay || isPastTimeToday;

      if (isAlreadyPassedThisWeek) {
        // NÃO entra como atrasado nesta semana! Salva na fila de pautas da Próxima Semana
        await addPendingRecommendation({
          topic: payload.topic,
          suggestedFormat: targetFormat,
          suggestedDay: targetDay,
          suggestedTime: targetTime,
          reason: payload.reason,
          baseCopyPrompt: payload.baseCopyPrompt,
          baseVisualPrompt: payload.baseVisualPrompt,
          objective: payload.objective,
        });

        console.log(`[schedule] Pauta "${payload.topic}" guardada na memória para a Próxima Semana (${targetDay} às ${targetTime}) pois o horário desta semana já expirou.`);

        return {
          success: true,
          schedule,
          isNextWeek: true,
          message: `Pauta guardada na memória para a PRÓXIMA SEMANA (${targetDay} às ${targetTime}), pois o horário desta semana já passou. Ela entrará automaticamente na próxima grade!`,
        };
      }

      // Se ainda é para esta semana (futuro), insere no slot planejado correspondente
      let targetSlot = schedule.find(
        (s) => s.dayOfWeek.toLowerCase() === targetDay.toLowerCase() && s.status === "PLANNED" && !s.pinned
      );

      if (targetSlot) {
        targetSlot.topic = payload.topic;
        targetSlot.format = targetFormat as any;
        targetSlot.timeSlot = payload.suggestedTime || targetSlot.timeSlot || "18:30";
        targetSlot.reasoning = payload.reason || "Pauta recomendada pela auditoria de inteligência IA.";
        targetSlot.baseCopyPrompt = payload.baseCopyPrompt;
        targetSlot.baseVisualPrompt = payload.baseVisualPrompt;
        targetSlot.objective = (payload.objective as any) || targetSlot.objective || "AUTHORITY";
        targetSlot.isCustom = true;
      } else {
        const newSlot: ScheduleSlot = {
          id: `slot-rec-${Date.now()}`,
          dayOfWeek: targetDay,
          timeSlot: targetTime,
          format: targetFormat as any,
          topic: payload.topic,
          objective: (payload.objective as any) || "AUTHORITY",
          reasoning: payload.reason || "Pauta recomendada pela auditoria de inteligência IA.",
          baseCopyPrompt: payload.baseCopyPrompt,
          baseVisualPrompt: payload.baseVisualPrompt,
          status: "PLANNED",
          isCustom: true,
        };
        schedule.push(newSlot);
        targetSlot = newSlot;
      }

      await saveSchedule(schedule);
      return {
        success: true,
        schedule,
        slotId: targetSlot.id,
        isNextWeek: false,
        message: `Pauta adicionada ao Cronograma desta semana em ${targetDay} às ${targetTime}!`,
      };
    }
  );

  // 6. Gerar Cronograma Inteligente com IA (Puxando Obrigatoriamente Pautas Salvas da Próxima Semana)
  ipcMain.handle(
    "schedule:generate-ai",
    async (
      _event,
      payload?: { weekOffset?: number }
    ): Promise<{
      slots: ScheduleSlot[];
      aiSuggestion?: {
        detectedManualSlots: string[];
        critiqueAndOptimization: string;
        suggestedAdjustedSlots: ScheduleSlot[];
      } | null;
    }> => {
      const targetOffset = payload?.weekOffset ?? 0;
      const brand = await getBrandInfo();
      const existingSchedule = await loadSchedule(targetOffset);
      const analyticsHistory = await getAnalyticsHistory();
      const latestAnalytics = analyticsHistory[0] || null;
      const pendingRecommendations = await getPendingRecommendations();
      let activeTrending: any[] = [];
      try {
        activeTrending = await getActiveTrendingTopics();
      } catch (trendErr) {
        console.warn("[schedule] Aviso ao buscar tendências para o cronograma:", trendErr);
      }

      // Busca posts recentes do banco de dados para não repetir temas
      const recentDbPosts = await prisma.post.findMany({
        take: 12,
        orderBy: { createdAt: "desc" },
        select: { topic: true, format: true },
      });

      const lockedSlots = existingSchedule.filter((s) => s.pinned);

      const prompt = `
Você é o Chief Content Strategist sênior do perfil de tecnologia ${brand.handle} no Instagram.

Sua missão é criar uma GRADE EDITORIAL SEMANAL DE ALTO IMPACTO E CRESCIMENTO com QUADROS FIXOS RECORRENTES, TENDÊNCIAS EM ALTA e TEMAS 100% INÉDITOS.

DIRETRIZES DE INTELIGÊNCIA EDITORIAL:
1. GRADE ATUAL E QUADROS FIXOS (EDITORIAL PILLARS) ESTABELECIDOS:
${JSON.stringify(
  existingSchedule.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    timeSlot: s.timeSlot,
    editorialPillar: s.editorialPillar || "Geral",
    format: s.format,
    currentTopic: s.topic,
    isPinnedByUser: Boolean(s.pinned),
  })),
  null,
  2
)}

2. RADAR DE TEMAS EM ALTA NO ECOSSISTEMA TECH (TENDÊNCIAS DO MOMENTO):
${
  activeTrending.length > 0
    ? activeTrending
        .map(
          (t) =>
            `- [${t.category}] "${t.title}" (Relevância: ${t.relevanceScore}%, Formato sugerido: ${t.suggestedFormat}, Gancho: "${t.hookIdea}"): ${t.whyTrending}`
        )
        .join("\n")
    : "Nenhum tópico em alta ativo no momento."
}

3. PAUTAS PRIORITÁRIAS SALVAS EM MEMÓRIA DO ANALYTICS (DEVEM SER OBRIGATORIAMENTE INCLUÍDAS):
${
  pendingRecommendations.length > 0
    ? JSON.stringify(
        pendingRecommendations.map((p) => ({
          dayOfWeek: p.suggestedDay,
          timeSlot: p.suggestedTime,
          format: p.suggestedFormat,
          topic: p.topic,
          objective: p.objective,
          reasoning: p.reason,
          baseCopyPrompt: p.baseCopyPrompt,
          baseVisualPrompt: p.baseVisualPrompt,
        })),
        null,
        2
      )
    : "Nenhuma pauta pendente salva em memória. Gere novas pautas alinhadas à estratégia."
}

4. DIRETRIZES DO ÚLTIMO ANALYTICS IA:
${
  latestAnalytics
    ? `
- Pontos fortes a replicar: ${latestAnalytics.qualitativeStrengths.join("; ")}
- Pautas sugeridas pela auditoria: ${JSON.stringify(latestAnalytics.recommendedTopicsForNextCycle)}
- Diretrizes estratégicas: ${latestAnalytics.strategicDirectives.join("; ")}
`
    : "Sem auditorias anteriores registradas. Aplique boas práticas para audiência dev/tech."
}

5. POSTS RECENTES JÁ PUBLICADOS (NÃO REPETIR ESTES TEMAS):
${
  recentDbPosts.length > 0
    ? recentDbPosts.map((p) => `- [${p.format}] ${p.topic}`).join("\n")
    : "Nenhum post publicado recentemente."
}

6. REGRA DE OURO DOS QUADROS FIXOS E DESACOPLAMENTO FEED VS STORIES:
- INFORMAÇÃO DE TENDÊNCIAS: Sempre que pertinente aos quadros editoriais, INCORPORE os temas em alta do item 2 para garantir máxima relevância e retenção orgânica.
- POSTS DE FEED (CARROSSEL, REELS, POST SOLO) SÃO A ESPINHA DORSAL PRINCIPAL:
  * Devem manter a frequência regular semanal no Feed (mínimo de 3 a 5 publicações no feed por semana).
  * Stories NUNCA devem substituir ou anular uma publicação do Feed.
- STORIES SÃO CAMADA COMPLEMENTAR DE ENGAJAMENTO RÁPIDO:
  * Formatos de Stories: Quizzes interativos de código de 1 clique, Enquetes técnicas binárias, Bastidores de terminal, Pílulas rápidas de dev ou Pontes para os posts do Feed/Reels.
  * Para slots de Story, defina "isStorySlot": true e "interactiveStoryType" ("QUIZ", "POLL", "DEV_BEHIND_THE_SCENES", "QUICK_PILL", "FEED_BRIDGE" ou "QUESTION_BOX").
- VOCÊ DEVE PRESERVAR O QUADRO FIXO (editorialPillar) DE CADA DIA:
  * Se o slot tem editorialPillar 'Segunda da Arquitetura', você DEVE gerar um carrossel de arquitetura/engenharia no Feed (aproveitando tendências se houver).
  * Se o slot tem editorialPillar 'Desafio de Código (Quiz)', gere um Quiz de 1 clique para os Stories.
  * Se o slot tem editorialPillar 'Debate Dev & Enquete', gere uma enquete binária para os Stories.
  * Se o usuário configurou um quadro personalizado, crie uma pauta que respeite esse estilo.
- MUDANÇA DE QUADROS: O ÚNICO gatilho que autoriza propor uma alteração no estilo ou formato de um dia são as DIRETRIZES DO ANALYTICS (Item 4).
- RENOVE OS TEMAS: Gere tópicos, ganchos e raciocínios 100% INÉDITOS e pertinentes ao quadro fixo daquele dia.

REGRAS DE RESPOSTA:
1. Em "slots", forneça a grade semanal PRESERVANDO INTACTOS os slots manuais do usuário, as pautas prioritárias da memória e os quadros fixos.
2. Em "aiSuggestion":
${
  lockedSlots.length > 0
    ? `
- Identifique os temas manuais em "detectedManualSlots".
- Em "critiqueAndOptimization", escreva uma mensagem consultiva amigável e estratégica, com o tom:
  "Olha, percebi que você configurou manualmente os temas [X e Y]. Eu mantive suas escolhas na grade sem alterar nada, mas para um melhor negócio e maior retenção da audiência nesta semana, minha recomendação estratégica seria se fizéssemos [justificativa com o ajuste sugerido]."
- Em "suggestedAdjustedSlots", forneça a grade alternativa completa com a sua otimização estratégica aplicada caso o usuário decida aceitar.
`
    : `- Defina como null pois não há slots manuais para sugerir ajustes.`
}

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "slots": [
    {
      "id": "slot-1",
      "dayOfWeek": "Segunda-feira",
      "timeSlot": "18:30",
      "editorialPillar": "Segunda da Arquitetura",
      "format": "CAROUSEL",
      "narrativeAngle": "BEFORE_AFTER",
      "topic": "Tema técnico aprofundado",
      "objective": "AUTHORITY",
      "reasoning": "Justificativa estratégica com combinação de ângulo editorial e formato de distribuição"
    },
    {
      "id": "slot-2",
      "dayOfWeek": "Terça-feira",
      "timeSlot": "12:15",
      "editorialPillar": "Pílula Rápida de Dev",
      "format": "STORY_PHOTO",
      "narrativeAngle": "COMMUNITY_PULSE",
      "topic": "Tema de Story",
      "objective": "ENGAGEMENT",
      "reasoning": "Justificativa estratégica"
    }
  ],
  "aiSuggestion": null
}
`.trim();

      const response = await executeStructuredPrompt<{
        slots: ScheduleSlot[];
        aiSuggestion?: {
          detectedManualSlots: string[];
          critiqueAndOptimization: string;
          suggestedAdjustedSlots: ScheduleSlot[];
        } | null;
      }>(prompt);

      const generatedSlots = response.slots || [];

      // Mescla inteligente: mantém slots travados pelo usuário
      const finalSchedule: ScheduleSlot[] = [...lockedSlots];

      // Injeta prioritariamente as pautas salvas em memória do Analytics
      for (const pending of pendingRecommendations) {
        const existingIdx = finalSchedule.findIndex(
          (s) => s.dayOfWeek.toLowerCase() === pending.suggestedDay.toLowerCase() && !s.pinned
        );

        const pendingSlot: ScheduleSlot = {
          id: `slot-rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          dayOfWeek: pending.suggestedDay,
          timeSlot: pending.suggestedTime || "18:30",
          format: pending.suggestedFormat as any,
          topic: pending.topic,
          objective: (pending.objective as any) || "AUTHORITY",
          reasoning: pending.reason || "Pauta recomendada pelo Analytics salva em memória.",
          baseCopyPrompt: pending.baseCopyPrompt,
          baseVisualPrompt: pending.baseVisualPrompt,
          weekOffset: targetOffset,
          status: "PLANNED",
          isCustom: true,
        };

        if (existingIdx >= 0) {
          finalSchedule[existingIdx] = pendingSlot;
        } else {
          finalSchedule.push(pendingSlot);
        }
      }

      // Adiciona os novos slots gerados pela IA sem duplicar dias já preenchidos
      for (const gen of generatedSlots) {
        const alreadyHasExact = finalSchedule.some(
          (s) => s.dayOfWeek.toLowerCase() === gen.dayOfWeek.toLowerCase()
        );
        if (!alreadyHasExact) {
          finalSchedule.push({
            ...gen,
            id: `slot-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            weekOffset: targetOffset,
            status: "PLANNED",
          });
        }
      }

      // Após incorporar todas as pautas pendentes na nova grade, limpa a memória temporária
      if (pendingRecommendations.length > 0) {
        await clearPendingRecommendations();
      }

      if (finalSchedule.length > 0) {
        await saveSchedule(finalSchedule, targetOffset);
        return {
          slots: finalSchedule,
          aiSuggestion: response.aiSuggestion || null,
        };
      }

      const fallback = await loadSchedule(targetOffset);
      return {
        slots: fallback,
        aiSuggestion: null,
      };
    }
  );

  // 7. Obter Pautas Pendentes Salvas em Memória para a Próxima Semana
  ipcMain.handle("schedule:get-pending-recommendations", async () => {
    return getPendingRecommendations();
  });

  // 8. Limpar Pautas Pendentes
  ipcMain.handle("schedule:clear-pending-recommendations", async () => {
    await clearPendingRecommendations();
    return { success: true };
  });

  console.log("[schedule] IPC do Cronograma Editorial registrado com sucesso.");
}

const DAYS_ORDER_NUM: Record<string, number> = {
  domingo: 0,
  "segunda-feira": 1,
  segunda: 1,
  "terça-feira": 2,
  terca: 2,
  terça: 2,
  "quarta-feira": 3,
  quarta: 3,
  "quinta-feira": 4,
  quinta: 4,
  "sexta-feira": 5,
  sexta: 5,
  "sábado": 6,
  sabado: 6,
};

/**
 * Executa um ciclo completo de verificação e publicação do Agendador Autônomo
 */
async function executeSchedulerCycle(getMainWindow?: () => BrowserWindow | null) {
  try {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentDay = DAYS_MAP[currentDayOfWeek];
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    const schedule = await loadSchedule();
    const settings = await getSettings();
    const isAutoPublish = autoplayActive || Boolean(settings.autoPublish);
    let scheduleDirty = false;

    // Busca todos os posts recentes do PostgreSQL para cruzamento rápido
    const dbPosts = await prisma.post.findMany({
      where: { status: { in: ["READY", "DRAFT", "PUBLISHED"] } },
      orderBy: { createdAt: "desc" },
    });

    const todayDateStr = now.toISOString().slice(0, 10);

    for (const slot of schedule) {
      if (slot.status === "PUBLISHED") continue;

      const normalizedSlotDay = (slot.dayOfWeek || "").trim().toLowerCase();
      const slotDayIndex = DAYS_ORDER_NUM[normalizedSlotDay] !== undefined ? DAYS_ORDER_NUM[normalizedSlotDay] : 1;
      const [slotH, slotM] = (slot.timeSlot || "18:00").split(":").map(Number);
      const slotTimeInMinutes = (isNaN(slotH) ? 18 : slotH) * 60 + (isNaN(slotM) ? 0 : slotM);

      const isToday = currentDayOfWeek === slotDayIndex;
      const isPastDay = currentDayOfWeek > slotDayIndex;
      const isDueNow = isToday && currentTimeInMinutes >= slotTimeInMinutes && currentTimeInMinutes <= slotTimeInMinutes + 30;
      const isOverdue = isPastDay || (isToday && currentTimeInMinutes >= slotTimeInMinutes + 15);
      const isTimeOrOverdue = isDueNow || isOverdue;

      // Cruza com post no banco
      const matchedPost = dbPosts.find(
        (p) =>
          (slot.postId && p.id === slot.postId) ||
          (p.topic && slot.topic && p.topic.trim().toLowerCase() === slot.topic.trim().toLowerCase())
      );

      // Se já estiver publicado no banco
      if (matchedPost && matchedPost.status === "PUBLISHED") {
        slot.status = "PUBLISHED";
        slot.postId = matchedPost.id;
        scheduleDirty = true;
        continue;
      }

      // 1. ALERTA DE POST EM ATRASO POR E-MAIL
      if (isOverdue) {
        const cacheKey = `${slot.id}-${todayDateStr}`;
        const alreadyNotifiedToday =
          notifiedSlotsTodaySet.has(cacheKey) ||
          Boolean(slot.lastOverdueNotifiedAt?.startsWith(todayDateStr));

        if (!alreadyNotifiedToday && settings.emailNotificationsEnabled && settings.notificationEmail) {
          notifiedSlotsTodaySet.add(cacheKey);
          console.log(`\n⚠️ [Scheduler Overdue Alert] Post em atraso detectado: "${slot.topic}" (${slot.dayOfWeek} às ${slot.timeSlot}). Enviando e-mail...`);
          try {
            await sendOverduePostAlertEmail({
              topic: slot.topic,
              format: slot.format,
              dayOfWeek: slot.dayOfWeek,
              timeSlot: slot.timeSlot,
              editorialPillar: slot.editorialPillar,
              status: slot.status,
            });
            slot.lastOverdueNotifiedAt = now.toISOString();
            scheduleDirty = true;
          } catch (err) {
            console.error("[schedule] Erro ao disparar alerta de atraso por e-mail:", err);
          }
        }
      }

      // 2. PUBLICAÇÃO AUTOMÁTICA OU ALERTA VISUAL SE O POST JÁ ESTIVER PRONTO (READY)
      const isPostReady = Boolean(
        slot.status === "READY" ||
        (matchedPost && (matchedPost.status === "READY" || matchedPost.status === "DRAFT"))
      );

      const targetPostId = slot.postId || matchedPost?.id;

      if (isPostReady && targetPostId && isTimeOrOverdue) {
        const postTopic = matchedPost?.topic || slot.topic;
        const postFormat = (matchedPost?.format || slot.format || "").toUpperCase();
        const isInteractiveStory =
          postFormat === "STORY_PHOTO" ||
          postFormat === "STORY" ||
          postFormat === "STORIES" ||
          postFormat.includes("STORY") ||
          (slot.editorialPillar && (
            slot.editorialPillar.toLowerCase().includes("caixinha") ||
            slot.editorialPillar.toLowerCase().includes("quiz")
          ));

        // Stories interativos (caixinhas de perguntas / quizzes / enquetes) NÃO devem ser auto-publicados
        // pois a Meta Graph API não suporta a inserção do sticker interativo. O usuário precisa postar manualmente no celular.
        if (isInteractiveStory) {
          const cacheKey = `story-interactive-${slot.id}-${todayDateStr}`;
          const alreadyNotifiedToday = notifiedSlotsTodaySet.has(cacheKey);

          if (!alreadyNotifiedToday) {
            notifiedSlotsTodaySet.add(cacheKey);
            console.log(`\n[AutoPublish] Story interativo detectado: "${postTopic}" (${slot.dayOfWeek} às ${slot.timeSlot}). Publicação automática via API pausada pois stories exigem inserção manual de stickers interativos (caixinhas/quiz) no Instagram.`);

            trackAndNotifyPublishProgress({
              postId: targetPostId,
              topic: postTopic,
              format: postFormat,
              status: "completed",
              message: `Story pronto ("${postTopic}"). Publicação manual necessária para inserção do sticker de caixinha/quiz no Instagram.`,
              progress: 100,
              startedAt: Date.now(),
            });

            const win = getMainWindow ? getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              win.webContents.send("schedule:story-ready", {
                slot,
                dayOfWeek: slot.dayOfWeek,
                timeSlot: slot.timeSlot,
                topic: slot.topic,
                postId: targetPostId,
                message: "Story gerado com sucesso! Como a API do Instagram não suporta a criação de caixinhas ou quiz automaticamente, faça o upload da arte pelo aplicativo do celular e adicione o sticker.",
              });
            }
          }
          continue;
        }

        if (isAutoPublish) {
          const reasonDesc = isOverdue ? "em atraso" : "no horário programado";

          console.log(`\n[AutoPublish] AutoPublisher identificou post (${reasonDesc}): "${postTopic}" (${slot.dayOfWeek} às ${slot.timeSlot}). Publicando no Instagram...`);

          const initialTask: ActivePublishingTask = {
            postId: targetPostId,
            topic: postTopic,
            format: postFormat,
            status: "running",
            message: `AutoPublisher identificou post ${reasonDesc} e está publicando no Instagram...`,
            progress: 15,
            startedAt: Date.now(),
          };
          trackAndNotifyPublishProgress(initialTask);

          try {
            const pubRes = await publishPost(
              targetPostId,
              (msg: string, progress: number) => {
                trackAndNotifyPublishProgress({
                  ...initialTask,
                  message: `[AutoPublisher] ${msg}`,
                  progress: Math.max(20, progress),
                });
              }
            );

            if (pubRes.success) {
              slot.status = "PUBLISHED";
              slot.postId = targetPostId;
              if (pubRes.publishedMediaId) {
                slot.instagramUrl = `https://instagram.com/p/${pubRes.publishedMediaId}`;
              }
              scheduleDirty = true;
              console.log(`[AutoPublish] Publicação realizada com sucesso! ID: ${pubRes.publishedMediaId}`);

              trackAndNotifyPublishProgress({
                ...initialTask,
                status: "completed",
                message: "Publicado no Instagram com sucesso pelo AutoPublisher!",
                progress: 100,
                publishedMediaId: pubRes.publishedMediaId,
              });

              const win = getMainWindow ? getMainWindow() : null;
              if (win && !win.isDestroyed()) {
                win.webContents.send("schedule:update", schedule);
              }
            } else {
              const errorMsg = typeof pubRes.error === "string" ? pubRes.error : "Erro desconhecido ao publicar post.";
              console.error(`[AutoPublish] Falha ao publicar: ${errorMsg}`);
              trackAndNotifyPublishProgress({
                ...initialTask,
                status: "error",
                message: `Falha na publicação automática: ${errorMsg}`,
                error: errorMsg,
                progress: 0,
              });
            }
          } catch (pubErr) {
            const errorMsg = pubErr instanceof Error ? pubErr.message : String(pubErr);
            console.error("[AutoPublish Error]", pubErr);
            trackAndNotifyPublishProgress({
              ...initialTask,
              status: "error",
              message: `Erro no AutoPublisher: ${errorMsg}`,
              error: errorMsg,
              progress: 0,
            });
          }
        } else if (isDueNow) {
          console.log(`\n[Scheduler] Horário de publicação atingido para o post: "${slot.topic}"!`);
          sendNativeNotification(
            "Horário de Publicação Atingido",
            `O post "${slot.topic}" atingiu o horário agendado (${slot.timeSlot})!`
          );
          const win = getMainWindow ? getMainWindow() : null;
          if (win && !win.isDestroyed()) {
            win.webContents.send("schedule:publish-alert", {
              slot,
              dayOfWeek: slot.dayOfWeek,
              timeSlot: slot.timeSlot,
              topic: slot.topic,
              postId: targetPostId,
            });
          }
        }
      }

      // 3. PRODUÇÃO AUTÔNOMA DE SLOTS PLANEJADOS (se Autoplay estiver ativo e o post ainda não existir)
      if (autoplayActive && slot.status === "PLANNED" && !matchedPost && isTimeOrOverdue) {
        console.log(`\n[Autoplay] Horário atingido (${slot.dayOfWeek} às ${slot.timeSlot})!`);
        console.log(`[Autoplay] Produzindo slot autônomo no pipeline: "${slot.topic}" (${slot.format})...`);

        slot.status = "READY";
        await saveSchedule(schedule);

        const result = await runPipeline({
          slot: {
            topic: slot.topic,
            format: slot.format,
            objective: slot.objective,
            reasoning: slot.reasoning,
            baseCopyPrompt: slot.baseCopyPrompt,
            baseVisualPrompt: slot.baseVisualPrompt,
          },
          onLog: (msg, type) => {
            const win = getMainWindow ? getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              win.webContents.send("agent:log", { type, message: msg, timestamp: `${hours}:${minutes}` });
            }
          },
        });

        if (result.success && result.postId) {
          slot.postId = result.postId;
          slot.status = "READY";
          scheduleDirty = true;
          console.log(`[Autoplay] Post gerado com sucesso! Post ID: ${result.postId}`);
          sendNativeNotification(
            "Novo Post Gerado com Sucesso",
            `"${slot.topic}" foi gerado e está pronto no Acervo!`
          );

          // Se auto-publicação estiver ativa, publica imediatamente após a geração
          if (isAutoPublish) {
            console.log(`[Autoplay] Publicando imediatamente no Instagram após geração: "${slot.topic}"...`);
            const publishTask: ActivePublishingTask = {
              postId: result.postId,
              topic: slot.topic,
              format: slot.format,
              status: "running",
              message: `AutoPublisher publicando post recém-gerado no Instagram...`,
              progress: 15,
              startedAt: Date.now(),
            };
            trackAndNotifyPublishProgress(publishTask);

            try {
              const pubRes = await publishPost(result.postId, (msg, prog) => {
                trackAndNotifyPublishProgress({
                  ...publishTask,
                  message: `[AutoPublisher] ${msg}`,
                  progress: Math.max(20, prog),
                });
              });

              if (pubRes.success) {
                slot.status = "PUBLISHED";
                if (pubRes.publishedMediaId) {
                  slot.instagramUrl = `https://instagram.com/p/${pubRes.publishedMediaId}`;
                }
                trackAndNotifyPublishProgress({
                  ...publishTask,
                  status: "completed",
                  message: "Publicado no Instagram com sucesso pelo AutoPublisher!",
                  progress: 100,
                  publishedMediaId: pubRes.publishedMediaId,
                });
                sendNativeNotification(
                  "Post Publicado no Instagram",
                  `"${slot.topic}" foi publicado com sucesso pelo AutoPublisher!`
                );
              } else {
                trackAndNotifyPublishProgress({
                  ...publishTask,
                  status: "error",
                  message: `Falha ao publicar post gerado: ${pubRes.error}`,
                  error: pubRes.error,
                });
              }
            } catch (errPub: any) {
              trackAndNotifyPublishProgress({
                ...publishTask,
                status: "error",
                message: `Erro na publicação automática: ${errPub?.message || errPub}`,
                error: errPub?.message || String(errPub),
              });
            }
          }
        }
      }
    }

    // 4. PILOTO NOTURNO / PLANEJAMENTO SEMANAL AUTOMÁTICO (Padrão: Domingo às 22:00)
    if (settings.nightlyScheduleEnabled) {
      const targetDay = (settings.nightlyScheduleDay || "Domingo").trim().toLowerCase();
      const targetDayNum = DAYS_ORDER_NUM[targetDay] !== undefined ? DAYS_ORDER_NUM[targetDay] : 0; // 0 = Domingo
      const [targetH, targetM] = (settings.nightlyScheduleTime || "22:00").split(":").map(Number);
      const targetTimeInMinutes = (isNaN(targetH) ? 22 : targetH) * 60 + (isNaN(targetM) ? 0 : targetM);

      const isNightlyDay = currentDayOfWeek === targetDayNum;
      const isNightlyTime = isNightlyDay && currentTimeInMinutes >= targetTimeInMinutes && currentTimeInMinutes <= targetTimeInMinutes + 45;
      const nightlyCacheKey = `nightly-run-${todayDateStr}`;

      if (isNightlyTime && !notifiedSlotsTodaySet.has(nightlyCacheKey)) {
        notifiedSlotsTodaySet.add(nightlyCacheKey);
        console.log(`\n🌙 [Piloto Noturno] Disparando planejamento semanal automático (${settings.nightlyScheduleDay || "Domingo"} às ${settings.nightlyScheduleTime || "22:00"})...`);

        (async () => {
          try {
            // 1. Atualiza tendências tech com IA
            await refreshTrendingTopics(true);

            // 2. Se há slots da próxima semana prontos, promove para a semana atual
            const nextWeekSlots = await loadSchedule(1);
            if (nextWeekSlots.length > 0) {
              await prisma.editorialScheduleSlot.deleteMany({ where: { weekOffset: 0 } });
              await prisma.editorialScheduleSlot.updateMany({
                where: { weekOffset: 1 },
                data: { weekOffset: 0 },
              });
              console.log("🌙 [Piloto Noturno] Grade da próxima semana promovida para a semana atual com sucesso.");
            }

            // 3. Atualiza timestamp nas configurações
            const { saveSettings } = await import("../../src/config/settings.js");
            await saveSettings({ lastNightlyRunAt: now.toISOString() });

            sendNativeNotification(
              "Piloto Noturno Concluído",
              `Planejamento semanal e tendências tech atualizados com sucesso!`
            );

            const updatedSchedule = await loadSchedule(0);
            const win = getMainWindow ? getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              win.webContents.send("schedule:update", updatedSchedule);
              win.webContents.send("schedule:nightly-completed", {
                message: `Planejamento semanal concluído pelo Piloto Noturno (${settings.nightlyScheduleDay} às ${settings.nightlyScheduleTime})!`,
                slotsCount: updatedSchedule.length,
              });
            }
          } catch (nightlyErr) {
            console.error("🌙 [Piloto Noturno] Erro no planejamento semanal automático:", nightlyErr);
          }
        })();
      }
    }

    if (scheduleDirty) {
      await saveSchedule(schedule);
      const win = getMainWindow ? getMainWindow() : null;
      if (win && !win.isDestroyed()) {
        win.webContents.send("schedule:update", schedule);
      }
    }
  } catch (e) {
    console.error("[Scheduler Daemon Error]", e);
  }
}

/**
 * Daemon do Agendador Autônomo em Background
 */
function startSchedulerDaemon(getMainWindow?: () => BrowserWindow | null) {
  if (autoplayTimer) clearInterval(autoplayTimer);

  autoplayTimer = setInterval(() => {
    executeSchedulerCycle(getMainWindow);
  }, 60_000); // Checa a cada 60 segundos
}
