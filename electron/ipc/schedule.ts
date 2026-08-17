import { ipcMain, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { executeStructuredPrompt } from "../../src/core/gemini.js";
import { getBrandInfo } from "../../src/config/brand.js";
import { getAnalyticsHistory } from "../../src/services/analytics-engine.js";
import { prisma } from "../../src/core/database.js";
import { runPipeline } from "../../src/pipeline/orchestrator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const scheduleFilePath = path.join(projectRoot, "output", "editorial-schedule.json");

export interface ScheduleSlot {
  id: string;
  dayOfWeek: string; // "Segunda-feira", "Terça-feira", etc.
  timeSlot: string;  // "18:30", "12:00", etc.
  editorialPillar?: string; // "Segunda da Arquitetura", "Sábado da Caixinha", etc.
  format: "CAROUSEL" | "SINGLE_IMAGE" | "REEL_SCRIPT" | "STORY_PHOTO" | string;
  topic: string;
  objective: "AUTHORITY" | "VIRALITY" | "EDUCATION" | "ENGAGEMENT" | string;
  reasoning: string;
  status: "PLANNED" | "READY" | "SCHEDULED" | "PUBLISHED";
  postId?: string;
  pinned?: boolean;
  isCustom?: boolean;
}

const DEFAULT_SCHEDULE: ScheduleSlot[] = [
  {
    id: "slot-1",
    dayOfWeek: "Segunda-feira",
    timeSlot: "18:30",
    editorialPillar: "Segunda da Arquitetura",
    format: "CAROUSEL",
    topic: "Guia Definitivo de Docker Multi-stage Builds e Otimização de Imagens",
    objective: "AUTHORITY",
    reasoning: "Segunda-feira é o dia clássico de estudo e aprofundamento técnico para devs. Carrossel focado em salvamentos.",
    status: "PLANNED",
  },
  {
    id: "slot-2",
    dayOfWeek: "Terça-feira",
    timeSlot: "12:15",
    editorialPillar: "Pílula Rápida de Dev",
    format: "STORY_PHOTO",
    topic: "Quiz Técnico: Você sabe a diferença entre Type e Interface no TypeScript?",
    objective: "ENGAGEMENT",
    reasoning: "Horário de almoço na terça-feira é ótimo para stories rápidos de interação e enquetes.",
    status: "PLANNED",
  },
  {
    id: "slot-3",
    dayOfWeek: "Quarta-feira",
    timeSlot: "19:00",
    editorialPillar: "Clean Code & Boas Práticas",
    format: "SINGLE_IMAGE",
    topic: "Como estruturar um Error Handling limpo e desacoplado no Node.js",
    objective: "EDUCATION",
    reasoning: "Meio de semana com foco em código limpo e arquitetura. Post solo de leitura direta e compartilhamentos.",
    status: "PLANNED",
  },
  {
    id: "slot-4",
    dayOfWeek: "Quinta-feira",
    timeSlot: "18:00",
    editorialPillar: "Bastidores & Segurança",
    format: "REEL_SCRIPT",
    topic: "Por que você NUNCA deve commitar secrets no Git (e como o GitGuardian te salva)",
    objective: "VIRALITY",
    reasoning: "Vídeo curto provocativo para alcançar novos seguidores fora da base atual com tema de segurança.",
    status: "PLANNED",
  },
  {
    id: "slot-5",
    dayOfWeek: "Sexta-feira",
    timeSlot: "17:30",
    editorialPillar: "Papo de Carreira & Soft Skills",
    format: "CAROUSEL",
    topic: "Arquitetura Hexagonal vs Clean Architecture: Comparativo Prático em TypeScript",
    objective: "AUTHORITY",
    reasoning: "Encerramento da semana com conteúdo de alta densidade técnica para leitura e debate durante o fim de semana.",
    status: "PLANNED",
  },
  {
    id: "slot-6",
    dayOfWeek: "Sábado",
    timeSlot: "11:00",
    editorialPillar: "Sábado da Caixinha",
    format: "STORY_PHOTO",
    topic: "Caixa de Perguntas: Pergunte qualquer coisa sobre carreira tech, stack ou rotina dev",
    objective: "ENGAGEMENT",
    reasoning: "Sábado pela manhã é ideal para abrir a Caixa de Perguntas, gerando conexão pessoal e mensagens diretas (DMs).",
    status: "PLANNED",
  },
];

let registered = false;
let autoplayActive = false;
let autoplayTimer: NodeJS.Timeout | null = null;

async function loadSchedule(): Promise<ScheduleSlot[]> {
  try {
    await fs.mkdir(path.dirname(scheduleFilePath), { recursive: true });
    const content = await fs.readFile(scheduleFilePath, "utf-8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SCHEDULE;
  } catch {
    await fs.writeFile(scheduleFilePath, JSON.stringify(DEFAULT_SCHEDULE, null, 2), "utf-8");
    return DEFAULT_SCHEDULE;
  }
}

async function saveSchedule(slots: ScheduleSlot[]): Promise<void> {
  await fs.mkdir(path.dirname(scheduleFilePath), { recursive: true });
  await fs.writeFile(scheduleFilePath, JSON.stringify(slots, null, 2), "utf-8");
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

  // 1. Obter Cronograma
  ipcMain.handle("schedule:get", async (): Promise<ScheduleSlot[]> => {
    return loadSchedule();
  });

  // 2. Salvar ou Atualizar Slot (Marca como custom/editado pelo usuário)
  ipcMain.handle("schedule:save-slot", async (_event, slot: ScheduleSlot): Promise<ScheduleSlot[]> => {
    const schedule = await loadSchedule();
    const existingIndex = schedule.findIndex((s) => s.id === slot.id);

    const slotWithFlag: ScheduleSlot = {
      ...slot,
      isCustom: true,
    };

    if (existingIndex >= 0) {
      schedule[existingIndex] = { ...schedule[existingIndex], ...slotWithFlag };
    } else {
      schedule.push(slotWithFlag);
    }

    await saveSchedule(schedule);
    return schedule;
  });

  // Salvar Grade Completa
  ipcMain.handle("schedule:save-all", async (_event, slots: ScheduleSlot[]): Promise<ScheduleSlot[]> => {
    await saveSchedule(slots);
    return slots;
  });

  // 3. Deletar Slot
  ipcMain.handle("schedule:delete-slot", async (_event, slotId: string): Promise<ScheduleSlot[]> => {
    const schedule = await loadSchedule();
    const filtered = schedule.filter((s) => s.id !== slotId);
    await saveSchedule(filtered);
    return filtered;
  });

  // 4. Toggle Autoplay
  ipcMain.handle("schedule:get-autoplay", async (): Promise<boolean> => {
    return autoplayActive;
  });

  ipcMain.handle("schedule:set-autoplay", async (_event, active: boolean): Promise<boolean> => {
    autoplayActive = active;
    console.log(`[schedule] Modo Autônomo Autoplay: ${active ? "ATIVADO" : "DESATIVADO"}`);
    return autoplayActive;
  });

  // 5. Inserir Pauta Recomendada da Análise IA na Grade
  ipcMain.handle(
    "schedule:add-topic",
    async (
      _event,
      payload: {
        topic: string;
        suggestedFormat?: string;
        suggestedDay?: string;
        reason?: string;
      }
    ): Promise<{ success: boolean; schedule: ScheduleSlot[]; slotId: string }> => {
      const schedule = await loadSchedule();
      const targetDay = payload.suggestedDay || "Segunda-feira";
      const targetFormat = payload.suggestedFormat || "CAROUSEL";

      // Procura se já existe um slot vago ou planejado no dia sugerido
      let targetSlot = schedule.find(
        (s) => s.dayOfWeek.toLowerCase() === targetDay.toLowerCase() && s.status === "PLANNED" && !s.pinned
      );

      if (targetSlot) {
        targetSlot.topic = payload.topic;
        targetSlot.format = targetFormat as any;
        targetSlot.reasoning = payload.reason || "Pauta recomendada pela auditoria de inteligência IA.";
        targetSlot.isCustom = true;
      } else {
        const newSlot: ScheduleSlot = {
          id: `slot-rec-${Date.now()}`,
          dayOfWeek: targetDay,
          timeSlot: "18:30",
          format: targetFormat as any,
          topic: payload.topic,
          objective: "AUTHORITY",
          reasoning: payload.reason || "Pauta recomendada pela auditoria de inteligência IA.",
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
      };
    }
  );

  // 6. Gerar Cronograma Inteligente com IA (Respeitando Customizações e Sugerindo Otimizações)
  ipcMain.handle("schedule:generate-ai", async (): Promise<{
    slots: ScheduleSlot[];
    aiSuggestion?: {
      detectedManualSlots: string[];
      critiqueAndOptimization: string;
      suggestedAdjustedSlots: ScheduleSlot[];
    } | null;
  }> => {
    const brand = await getBrandInfo();
    const existingSchedule = await loadSchedule();
    const analyticsHistory = await getAnalyticsHistory();
    const latestAnalytics = analyticsHistory[0] || null;

    // Busca posts recentes do banco de dados para não repetir temas
    const recentDbPosts = await prisma.post.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      select: { topic: true, format: true },
    });

    const lockedSlots = existingSchedule.filter((s) => s.pinned || s.isCustom || s.status === "PUBLISHED" || s.status === "READY");

    const prompt = `
Você é o Chief Content Strategist sênior do perfil de tecnologia ${brand.handle} no Instagram.

Sua missão é criar ou otimizar uma GRADE EDITORIAL SEMANAL DE ALTO CRESCIMENTO com QUADROS FIXOS RECORRENTES.

DIRETRIZES DE INTELIGÊNCIA EDITORIAL:
1. GRADE ATUAL E QUADROS FIXOS (EDITORIAL PILLARS) ESTABELECIDOS:
${JSON.stringify(
  existingSchedule.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    timeSlot: s.timeSlot,
    editorialPillar: s.editorialPillar || "Geral",
    format: s.format,
    currentTopic: s.topic,
    isLockedOrCustom: s.pinned || s.isCustom || s.status === "PUBLISHED" || s.status === "READY",
  })),
  null,
  2
)}

2. DIRETRIZES DO ÚLTIMO ANALYTICS IA:
${
  latestAnalytics
    ? `
- Pontos fortes a replicar: ${latestAnalytics.qualitativeStrengths.join("; ")}
- Pautas sugeridas pela auditoria: ${JSON.stringify(latestAnalytics.recommendedTopicsForNextCycle)}
- Diretrizes estratégicas: ${latestAnalytics.strategicDirectives.join("; ")}
`
    : "Sem auditorias anteriores registradas. Aplique boas práticas para audiência dev/tech."
}

3. POSTS RECENTES JÁ PUBLICADOS (NÃO REPETIR ESTES TEMAS):
${
  recentDbPosts.length > 0
    ? recentDbPosts.map((p) => `- [${p.format}] ${p.topic}`).join("\n")
    : "Nenhum post publicado recentemente."
}

4. REGRA DE OURO DOS QUADROS FIXOS (EDITORIAL PILLARS):
- VOCÊ DEVE PRESERVAR O QUADRO FIXO (editorialPillar) DE CADA DIA:
  * Se o slot tem editorialPillar 'Sábado da Caixinha', você DEVE gerar uma nova Caixa de Perguntas com tema inédito para o sábado.
  * Se o slot tem editorialPillar 'Segunda da Arquitetura', você DEVE gerar um carrossel de arquitetura/engenharia.
  * Se o slot tem editorialPillar 'Desafio do Código (Quiz)', gere um novo Quiz interativo em código.
  * Se o usuário configurou um quadro personalizado (ex: 'Dicas & Curiosidades'), crie uma pauta que respeite esse estilo.
- MUDANÇA DE QUADROS: O ÚNICO gatilho que autoriza propor uma alteração no estilo ou formato de um dia são as DIRETRIZES DO ANALYTICS (Item 2). Se o Analytics não pedir mudança, mantenha os quadros e formatos exatamente como estão.
- RENOVE OS TEMAS: Gere tópicos, ganchos e raciocínios 100% INÉDITOS e pertinentes ao quadro fixo daquele dia.

REGRAS DE RESPOSTA:
1. Em "slots", forneça a grade semanal PRESERVANDO INTACTOS os slots manuais do usuário e os quadros fixos.
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
      "topic": "Tema técnico aprofundado",
      "objective": "AUTHORITY",
      "reasoning": "Justificativa estratégica"
    },
    {
      "id": "slot-2",
      "dayOfWeek": "Terça-feira",
      "timeSlot": "12:15",
      "editorialPillar": "Pílula Rápida de Dev",
      "format": "STORY_PHOTO",
      "topic": "Tema de Story",
      "objective": "ENGAGEMENT",
      "reasoning": "Justificativa estratégica"
    }
  ],
  "aiSuggestion": null
}
  "aiSuggestion": ${
    lockedSlots.length > 0
      ? `{
    "detectedManualSlots": ["Tema 1", "Tema 2"],
    "critiqueAndOptimization": "Olha, percebi que você configurou manualmente os temas... Não alterei, mas para melhor negócio seria se...",
    "suggestedAdjustedSlots": [
      {
        "id": "slot-opt-1",
        "dayOfWeek": "Segunda-feira",
        "timeSlot": "18:30",
        "format": "CAROUSEL",
        "topic": "Tema otimizado",
        "objective": "AUTHORITY",
        "reasoning": "Justificativa otimizada"
      }
    ]
  }`
      : `null`
  }
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

    // Mescla inteligente: mantém slots customizados/travados pelo usuário e adiciona os novos slots sem duplicação
    const finalSchedule: ScheduleSlot[] = [...lockedSlots];

    for (const gen of generatedSlots) {
      const alreadyHasExact = finalSchedule.some(
        (s) => s.dayOfWeek.toLowerCase() === gen.dayOfWeek.toLowerCase() && s.timeSlot === gen.timeSlot
      );
      if (!alreadyHasExact) {
        finalSchedule.push({
          ...gen,
          id: `slot-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: "PLANNED",
        });
      }
    }

    if (finalSchedule.length > 0) {
      await saveSchedule(finalSchedule);
      return {
        slots: finalSchedule,
        aiSuggestion: response.aiSuggestion || null,
      };
    }

    const fallback = await loadSchedule();
    return {
      slots: fallback,
      aiSuggestion: null,
    };
  });

  console.log("[schedule] IPC do Cronograma Editorial registrado com sucesso.");
}

/**
 * Daemon do Agendador Autônomo em Background
 */
function startSchedulerDaemon(getMainWindow?: () => BrowserWindow | null) {
  if (autoplayTimer) clearInterval(autoplayTimer);

  autoplayTimer = setInterval(async () => {
    if (!autoplayActive) return;

    try {
      const now = new Date();
      const currentDay = DAYS_MAP[now.getDay()];
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const currentHHmm = `${hours}:${minutes}`;

      const schedule = await loadSchedule();

      // 1. Slot planejado que precisa ser produzido no horário
      const matchingSlot = schedule.find(
        (slot: ScheduleSlot) =>
          slot.dayOfWeek.toLowerCase() === currentDay.toLowerCase() &&
          slot.timeSlot === currentHHmm &&
          slot.status === "PLANNED"
      );

      // 2. Slot já produzido e PRONTO (READY) no horário agendado de publicação
      const readySlot = schedule.find(
        (slot: ScheduleSlot) =>
          slot.dayOfWeek.toLowerCase() === currentDay.toLowerCase() &&
          slot.timeSlot === currentHHmm &&
          slot.status === "READY" &&
          slot.postId
      );

      if (readySlot) {
        console.log(`\n⏰ [Scheduler Alert] Horário de publicação atingido para o post: "${readySlot.topic}"!`);
        const win = getMainWindow ? getMainWindow() : null;
        if (win && !win.isDestroyed()) {
          win.webContents.send("schedule:publish-alert", {
            slot: readySlot,
            dayOfWeek: readySlot.dayOfWeek,
            timeSlot: readySlot.timeSlot,
            topic: readySlot.topic,
            postId: readySlot.postId,
          });
        }
      }

      if (matchingSlot) {
        console.log(`\n⏰ [Autoplay] Horário atingido (${currentDay} às ${currentHHmm})!`);
        console.log(`🚀 Produzindo slot autônomo: "${matchingSlot.topic}" (${matchingSlot.format})...`);

        matchingSlot.status = "READY";
        await saveSchedule(schedule);

        const result = await runPipeline({
          slot: {
            topic: matchingSlot.topic,
            format: matchingSlot.format,
            objective: matchingSlot.objective,
            reasoning: matchingSlot.reasoning,
          },
          onLog: (msg, type) => {
            const win = getMainWindow ? getMainWindow() : null;
            if (win && !win.isDestroyed()) {
              win.webContents.send("agent:log", { type, message: msg, timestamp: `${hours}:${minutes}` });
            }
          },
        });

        if (result.success && result.postId) {
          matchingSlot.postId = result.postId;
          matchingSlot.status = "READY";
          await saveSchedule(schedule);
          console.log(`✅ [Autoplay] Post gerado com sucesso! Post ID: ${result.postId}`);
        }
      }
    } catch (e) {
      console.error("[Autoplay Daemon Error]", e);
    }
  }, 60_000); // Checa a cada 60 segundos
}
