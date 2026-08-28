import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { prisma } from "../core/database.js";
import { executeStructuredPrompt, getGeminiAI } from "../core/gemini.js";
import { getBrandInfo } from "../config/brand.js";
import { getSettings } from "../config/settings.js";
import { getAllInsights } from "./embedding-service.js";

import fsSync from "node:fs";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getProjectRoot(): string {
  const cwd = process.cwd();
  if (fsSync.existsSync(path.join(cwd, "scripts", "synthesize_tts.py"))) {
    return cwd;
  }
  const fromDirname = path.resolve(__dirname, "..", "..");
  if (fsSync.existsSync(path.join(fromDirname, "scripts", "synthesize_tts.py"))) {
    return fromDirname;
  }
  const fromParent = path.resolve(__dirname, "..");
  if (fsSync.existsSync(path.join(fromParent, "scripts", "synthesize_tts.py"))) {
    return fromParent;
  }
  return cwd;
}

function getSynthesizeScriptPath(): string {
  const root = getProjectRoot();
  const primary = path.join(root, "scripts", "synthesize_tts.py");
  if (fsSync.existsSync(primary)) return primary;
  return path.resolve(process.cwd(), "scripts", "synthesize_tts.py");
}

export interface DispatchedPautaItem {
  topic: string;
  format: string;
  narrativeAngle: string;
  objective: string;
  hook: string;
  reasoning: string;
  scheduledDay?: string;
  scheduledTime?: string;
  isUrgent?: boolean;
  baseCopyPrompt?: string;
  baseVisualPrompt?: string;
  canceledPreviousTopic?: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "clara";
  text: string;
  audioPath?: string;
  timestamp: string;
  actionTaken?: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT" | "REPLACED_PREVIOUS_PAUTA" | "SCHEDULED_MULTIPLE" | "CANCELED_PAUTA";
  dispatchedPauta?: DispatchedPautaItem;
  dispatchedPautas?: DispatchedPautaItem[];
  suggestedOptions?: Array<{
    optionNumber: number;
    title: string;
    summary: string;
    whyItEngages: string;
  }>;
}

interface GeminiClaraResponse {
  replyText: string;
  spokenText: string;
  actionTaken: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT" | "REPLACED_PREVIOUS_PAUTA" | "SCHEDULED_MULTIPLE" | "CANCELED_PAUTA";
  dispatchedPauta?: DispatchedPautaItem;
  dispatchedPautas?: DispatchedPautaItem[];
  suggestedOptions?: Array<{
    optionNumber: number;
    title: string;
    summary: string;
    whyItEngages: string;
  }>;
}

function getHistoryFilePath(): string {
  return path.join(getProjectRoot(), "output", "agency-chat-history.json");
}

/**
 * Carrega o histórico da conversa com o Gestor Editorial
 */
export async function getAgencyChatHistory(): Promise<ChatMessage[]> {
  const filePath = getHistoryFilePath();
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    const settings = await getSettings();
    const managerName = settings.agencyManager?.name || "Clara";

    return [
      {
        id: "msg-welcome",
        sender: "clara",
        text: `Olá! Eu sou ${managerName}, sua Gestora Editorial aqui na Syrius. Estou sempre de olho nas métricas do perfil e nas maiores tendências de desenvolvimento. Me conta: que ideia ou assunto você está pensando em abordar agora? Podemos trocar uma ideia e eu cuido de todo o resto!`,
        timestamp: new Date().toISOString(),
        actionTaken: "NONE",
      },
    ];
  }
}

/**
 * Salva o histórico da conversa
 */
export async function saveAgencyChatHistory(history: ChatMessage[]): Promise<void> {
  const filePath = getHistoryFilePath();
  try {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(history.slice(-40), null, 2), "utf-8");
  } catch (err) {
    console.error("[AgencyChat] Erro ao salvar histórico:", err);
  }
}

/**
 * Limpa o histórico da conversa
 */
export async function clearAgencyChatHistory(): Promise<void> {
  const filePath = getHistoryFilePath();
  try {
    await fs.unlink(filePath);
  } catch {}
}

/**
 * Sintetiza o áudio da voz do Gestor usando Edge TTS
 */
export async function synthesizeClaraVoice(text: string, voiceOverride?: string): Promise<string> {
  const settings = await getSettings();
  const voice = voiceOverride || settings.agencyManager?.edgeTtsVoice || "pt-BR-FranciscaNeural";

  const audioDir = path.join(getProjectRoot(), "output", "audio");
  await fs.mkdir(audioDir, { recursive: true });

  const fileName = `agency-manager-${Date.now()}.mp3`;
  const outputPath = path.join(audioDir, fileName);

  const cleanText = text
    .replace(/[*_#`~>\[\]]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  const scriptPath = getSynthesizeScriptPath();

  try {
    await execFileAsync("python", [scriptPath, outputPath, voice, cleanText]);
    return outputPath;
  } catch (err) {
    console.warn("[AgencyChat] Fallback ao gerar voz do Gestor:", err);
    return "";
  }
}

/**
 * Transcreve áudio do usuário enviado via microfone
 */
export async function transcribeUserAudio(audioBase64: string, mimeType = "audio/webm"): Promise<string> {
  const settings = await getSettings();
  const modelToUse = settings.defaultGeminiModel || "gemini-3.6-flash";
  const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");

  const modelsToTry = [modelToUse, "gemini-3.6-flash", "gemini-3.1-pro-preview"];
  let lastError: Error | null = null;

  for (const model of [...new Set(modelsToTry)]) {
    try {
      const { ai } = getGeminiAI();
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: "Transcreva este áudio do usuário em português brasileiro exatamente como foi falado. Retorne APENAS o texto puro transcrito, sem comentários, sem aspas e sem explicações adicionais.",
              },
            ],
          },
        ],
      });

      const text = response.text?.trim() || "";
      if (text) return text;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AgencyChat] Falha na transcrição com modelo ${model}:`, err);
    }
  }

  throw new Error(`Erro na transcrição de voz: ${lastError?.message || "Não foi possível transcrever o áudio"}`);
}

/**
 * Processa a mensagem do usuário com a Gestora Clara
 */
export async function processAgencyMessage(
  userText: string,
  generateVoice = true
): Promise<{ userMsg: ChatMessage; claraMsg: ChatMessage }> {
  const settings = await getSettings();
  const managerName = settings.agencyManager?.name || "Clara";
  const managerRole = settings.agencyManager?.roleTitle || "Head Editorial & Gestora de Conteúdo";
  const brand = await getBrandInfo();
  const history = await getAgencyChatHistory();

  // 1. Coleta Inteligente de Contexto (PostgreSQL, Analytics & Radar de Tendências)
  const recentPosts = await prisma.post.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    select: { topic: true, format: true, narrativeAngle: true, createdAt: true, status: true },
  });

  const slots = await prisma.editorialScheduleSlot.findMany({
    where: { weekOffset: { in: [0, 1] } },
    orderBy: { orderIndex: "asc" },
    select: { dayOfWeek: true, timeSlot: true, topic: true, format: true, status: true, weekOffset: true },
  });

  // Tópicos em alta reais e ativos no Radar do PostgreSQL
  const activeTrends = await prisma.trendingTopic.findMany({
    where: { status: "ACTIVE" },
    orderBy: { relevanceScore: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      category: true,
      summary: true,
      whyTrending: true,
      hookIdea: true,
      suggestedFormat: true,
      relevanceScore: true,
      narrativeAngle: true,
      sourceLinks: true,
    },
  });

  const now = new Date();
  const currentDayIdx = now.getDay();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentDayName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][currentDayIdx];
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

  const standardSlots = [
    { day: "Segunda-feira", dayIdx: 1, time: "18:30", format: "CAROUSEL", label: "Segunda da Arquitetura & DevOps" },
    { day: "Terça-feira", dayIdx: 2, time: "18:30", format: "CAROUSEL", label: "Terça de Backend & Algoritmos" },
    { day: "Quarta-feira", dayIdx: 3, time: "19:00", format: "SINGLE_IMAGE", label: "Quarta de Clean Code & Boas Práticas" },
    { day: "Quinta-feira", dayIdx: 4, time: "18:00", format: "REEL_SCRIPT", label: "Quinta de Lançamentos & Notícias Tech" },
    { day: "Sexta-feira", dayIdx: 5, time: "17:30", format: "CAROUSEL", label: "Sexta de Engenharia de Software" },
    { day: "Sábado", dayIdx: 6, time: "15:00", format: "REEL_SCRIPT", label: "Sábado de Side-Projects, IA & Infraestrutura" },
    { day: "Domingo", dayIdx: 0, time: "19:30", format: "CAROUSEL", label: "Domingo de Planejamento & Carreira Dev" },
  ];

  const occupiedSlotKeys = new Set(slots.map((s) => `${s.weekOffset === 0 ? "Semana Atual" : "Próxima Semana"} - ${s.dayOfWeek} às ${s.timeSlot}`));

  const availableSlotsList: string[] = [];

  // 1. Prioridade Máxima: Slots Livres AINDA NESTA SEMANA (que ainda não passaram do horário atual)
  for (const std of standardSlots) {
    const key = `Semana Atual - ${std.day} às ${std.time}`;
    if (!occupiedSlotKeys.has(key)) {
      const [h, m] = std.time.split(":").map(Number);
      const isFutureThisWeek =
        std.dayIdx > currentDayIdx ||
        (std.dayIdx === currentDayIdx && (h > currentHour || (h === currentHour && m > currentMin)));

      if (isFutureThisWeek) {
        const isToday = std.dayIdx === currentDayIdx;
        availableSlotsList.push(
          `- [Semana Atual] ${std.day} às ${std.time} (${isToday ? "LIVRE PARA HOJE" : "LIVRE NESTA SEMANA"} — Ideal para ${std.format} / ${std.label})`
        );
      }
    }
  }

  // 2. Slots Livres da Próxima Semana
  for (const std of standardSlots) {
    const key = `Próxima Semana - ${std.day} às ${std.time}`;
    if (!occupiedSlotKeys.has(key)) {
      availableSlotsList.push(`- [Próxima Semana] ${std.day} às ${std.time} (LIVRE — Ideal para ${std.format} / ${std.label})`);
    }
  }

  const insights = await getAllInsights();
  const activeInsights = insights.filter((i) => i.status === "VALIDATED").slice(0, 5);

  let activeDirectives: string[] = [];
  let latestReport: any = null;
  try {
    const { getAnalyticsHistory } = await import("./analytics-engine.js");
    const historyData = await getAnalyticsHistory();
    latestReport = historyData[0] || null;
    if (latestReport?.strategicDirectives && Array.isArray(latestReport.strategicDirectives)) {
      activeDirectives = latestReport.strategicDirectives;
    }
  } catch {}

  const prompt = `
Você é ${managerName}, ${managerRole} do perfil profissional de tecnologia ${brand.handle} no Instagram.

SUA PERSONALIDADE & TOM DE VOZ:
- Você é uma estrategista de conteúdo tech sênior, amigável, extremamente inteligente, analítica, consultiva e focada em resultados reais da conta.
- Você conversa com o criador (o usuário) de forma natural, colaborativa, humana e direta.
- **REGRA DE OURO DA EXPERIÊNCIA DO CLIENTE**:
  * O criador NÃO quer saber de termos técnicos de mídia como "carrossel 4:5", "breakpoint", "container", etc.
  * O criador foca puramente no **tema, na ideia e no valor técnico para os desenvolvedores**.
  * É VOCÊ QUEM CUIDA DE TODA A ESTRATÉGIA DE MÍDIA, FORMATO, HORÁRIO E ENGENHARIA EDITORIAL NOS BASTIDORES!
  * Quando você sugerir ideias ou temas em alta, apresente **3 opções de pautas em linguagem simples e empolgante**, mostrando o título e por que a comunidade tech vai engajar.

CONTEXTO REAL DO PERFIL AGORA:
- Data & Hora Atual: ${currentDayName}, às ${currentTimeStr}
- Posicionamento: ${brand.name} (${brand.handle})

- TEMAS EM ALTA REAIS ATIVOS NO RADAR (DO BANCO DE DADOS POSTGRESQL):
${
  activeTrends.length > 0
    ? activeTrends
        .map(
          (t, idx) =>
            `${idx + 1}. [${t.category}] "${t.title}" (${t.relevanceScore}% em alta)\n   - Resumo: ${t.summary}\n   - Gancho: "${t.hookIdea}"\n   - Tração: ${t.whyTrending}`
        )
        .join("\n")
    : "Nenhum tema ativo no radar no momento."
}

- AUDITORIA DO ANALYTICS & SAÚDE DA CONTA:
  * Saúde Geral: ${latestReport?.healthScore || 88}/100
  * Taxa de Engajamento: ${(latestReport?.periodEngagementRate || 4.2).toFixed(1)}%
  * Resumo Executivo: ${latestReport?.executiveSummary || "Desempenho consistente com foco em retenção técnica."}
  * Diretrizes Estratégicas: ${activeDirectives.length > 0 ? activeDirectives.join(" | ") : "Focar em ganchos fortes e utilidade prática."}

- SLOTS JÁ OCUPADOS NO CRONOGRAMA:
${slots.length > 0 ? slots.map((s) => `- [Semana ${s.weekOffset === 0 ? "Atual" : "Próxima"}] ${s.dayOfWeek} às ${s.timeSlot}: "${s.topic}" (${s.format})`).join("\n") : "Nenhum slot ocupado."}

- SLOTS LIVRES E RECOMENDADOS PARA NOVAS PAUTAS:
${availableSlotsList.length > 0 ? availableSlotsList.slice(0, 8).join("\n") : "- Próxima Terça-feira às 18:30\n- Próxima Quinta-feira às 18:00\n- Próxima Sexta-feira às 17:30"}

- Histórico Recente de Posts no Banco:
${recentPosts.map((p) => `- [${p.format} / ${p.narrativeAngle || "BEFORE_AFTER"}] "${p.topic}" (${p.status})`).join("\n")}

- Aprendizados Validados do RAG:
${activeInsights.map((i) => `- ${i.title}: ${i.content}`).join("\n")}

HISTÓRICO RECENTE DA CONVERSA:
${history.slice(-6).map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}

NOVA MENSAGEM DO CRIADOR:
"${userText}"

COMO VOCÊ DEVE SE COMPORTAR (REGRAS ESTRATÉGICAS):

1. **QUANDO O CRIADOR FALAR DE TEMAS EM ALTA OU PEDIR SUGESTÕES PARA A SEMANA** (ex: "temos alguns temas em alta, oq acha de encaixarmos?", "o que está em alta?", "quais os temas quentes?"):
   - Você **DEVE analisar os TEMAS EM ALTA REAIS ATIVOS NO RADAR listados acima** e cruzar com o Analytics e horários livres.
   - Filtre e selecione os **3 melhores temas reais** do radar com maior tração e adequação à grade.
   - Diga algo como: *"Analisei os temas em alta no nosso Radar e cruzei com as métricas do Analytics. Dos assuntos que estão bombando, filtrei estes 3 que mais têm potencial para a nossa grade desta semana: 1. [Tema 1], 2. [Tema 2] e 3. [Tema 3]. Qual você acha que devemos colocar?"*
   - Preencha o array "suggestedOptions" com os 3 temas reais (títulos reais, resumos e por que engaja).
   - Deixe "actionTaken": "NONE".

2. **QUANDO O CRIADOR APROVAR TODOS OU MÚLTIPLOS TEMAS** (ex: "coloque todos", "quero as 3", "agenda todas", "coloque a 1 e a 2", "vamos nas duas primeiras"):
   - Você agenda **múltiplas pautas de uma vez**!
   - Defina "actionTaken": "SCHEDULED_MULTIPLE" (ou "SCHEDULED_FOR_GRADE").
   - Preencha "dispatchedPautas" com a lista dos 2 ou 3 temas aprovados, alocando CADA UM em um dia e horário livre DIFERENTE (ex: Tema 1 na Terça 18:30, Tema 2 na Quinta 18:00, Tema 3 na Sexta 17:30).
   - Preencha também "dispatchedPauta" com o primeiro tema para compatibilidade.
   - Responda avisando com clareza quais dias/horários foram reservados para cada tema e que você já enfileirou tudo na produção!

3. **QUANDO O CRIADOR APROVAR UM TEMA ESPECÍFICO** (ex: "gostei da opção 2", "vamos na primeira", "pode fazer essa", "quero o tema de IA"):
   - Defina "actionTaken": "SCHEDULED_FOR_GRADE" ou "DISPATCHED_TO_PIPELINE".
   - **REGRA CRÍTICA DE CONTINUIDADE DO DIA/HORÁRIO**: Se na sua mensagem anterior ou na conversa recente você propôs ou sugeriu um dia e horário específico (ex: "sábado às 15:00", "este sábado", "hoje às 19:00"), você DEVE OBRIGATORIAMENTE alocar a pauta no dia e horário combinado ("scheduledDay": "Sábado", "scheduledTime": "15:00" na Semana Atual se ainda não passou) e NUNCA jogar para outra semana ou dia sem motivo!
   - Caso contrário, aloque a pauta no próximo slot livre disponível e preencha "dispatchedPauta".
   - Responda confirmando o dia/horário exato escolhido.

4. **QUANDO O CRIADOR NÃO QUISER ESSES E SUGERIR OUTRO TEMA / TÍTULO** (ex: "não quero nenhum desses, quero o [título]", "prefiro falar sobre X"):
   - Analise o cenário geral (Radar + Analytics):
     * **Se o tema for ótimo**: Responda: *"Gostei da sugestão! Analisei o cenário geral e esse tema é excelente para o nosso momento. Já agendei para [Dia/Horário] e despachei para a produção!"* ("actionTaken": "SCHEDULED_FOR_GRADE", preenchendo "dispatchedPauta").
     * **Se houver ressalvas editoriais** (ex: tema já saturado, muito nichado ou fora do momento): Dê seu feedback consultivo sincero e profissional: *"Gostei da ideia, mas analisando o nosso histórico no Analytics, [motivo da ressalva, ex: já abordamos esse assunto recentemente / o engajamento desse formato caiu]. Eu sugeriria [alternativa/ajuste], mas se você tiver certeza e quiser rodar esse mesmo, posso colocar para rodar agora mesmo! O que você prefere: manter esse ou testar outro?"* (Deixe "actionTaken": "NONE" e aguarde a resposta).
     * **Se o criador confirmar que tem certeza** ("tenho certeza", "pode agendar esse mesmo", "faz agora"): Responda: *"Perfeito! Você manda. Já aloquei na grade para [Dia/Horário] e despachei para a produção!"* ("actionTaken": "SCHEDULED_FOR_GRADE").

5. **QUANDO O CRIADOR MUDAR DE IDEIA OU PEDIR SUBSTITUIÇÃO** (ex: "mudei de ideia, quero a opção 2", "troca pela pauta X"):
   - Defina "actionTaken": "REPLACED_PREVIOUS_PAUTA".
   - Preencha "dispatchedPauta" com a nova pauta e "canceledPreviousTopic" com a anterior.

6. **SPOKEN TEXT (PARA VOZ DA CLARA)**:
   - Escreva de forma 100% natural, fluida e conversacional em português (sem markdown, sem emojis, sem listas com traços).

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "replyText": "texto completo amigável e estilizado para exibição no chat",
  "spokenText": "texto fluido e conversacional para a locução neural feminina (sem markdown, sem emojis)",
  "actionTaken": "NONE",
  "dispatchedPauta": {
    "topic": "Título completo e claro da pauta escolhida (OBRIGATÓRIO quando actionTaken != NONE)",
    "format": "CAROUSEL",
    "narrativeAngle": "BEFORE_AFTER",
    "objective": "AUTHORITY",
    "hook": "Gancho magnético de retenção",
    "reasoning": "Por que esta pauta foi agendada neste formato e horário",
    "scheduledDay": "Próxima Terça",
    "scheduledTime": "18:30",
    "isUrgent": false,
    "canceledPreviousTopic": "Título da pauta anterior se for substituição"
  },
  "dispatchedPautas": [
    {
      "topic": "Título da pauta 1",
      "format": "CAROUSEL",
      "narrativeAngle": "BEFORE_AFTER",
      "objective": "AUTHORITY",
      "hook": "Gancho 1",
      "reasoning": "Motivo 1",
      "scheduledDay": "Próxima Terça",
      "scheduledTime": "18:30",
      "isUrgent": false
    }
  ],
  "suggestedOptions": [
    {
      "optionNumber": 1,
      "title": "Título real ou chamativo da Opção 1",
      "summary": "Resumo prático do que será abordado",
      "whyItEngages": "Por que a audiência dev vai se interessar e salvar"
    }
  ]
}
Nota: Quando actionTaken for "NONE", deixe "dispatchedPauta": null e "dispatchedPautas": null.
`.trim();

  const userMsgId = `msg-user-${Date.now()}`;
  const userMsg: ChatMessage = {
    id: userMsgId,
    sender: "user",
    text: userText,
    timestamp: new Date().toISOString(),
  };

  // Salva imediatamente a mensagem do usuário no histórico persistido para garantir sincronia em navegação
  await saveAgencyChatHistory([...history, userMsg]);

  const aiResponse = await executeStructuredPrompt<GeminiClaraResponse>(prompt);

  let audioPath: string | undefined = undefined;
  if (generateVoice && aiResponse.spokenText) {
    audioPath = await synthesizeClaraVoice(aiResponse.spokenText);
  }

  const claraMsgId = `msg-clara-${Date.now() + 1}`;

  const claraMsg: ChatMessage = {
    id: claraMsgId,
    sender: "clara",
    text: aiResponse.replyText,
    audioPath,
    timestamp: new Date().toISOString(),
    actionTaken: aiResponse.actionTaken,
    dispatchedPauta: aiResponse.dispatchedPauta,
    dispatchedPautas: aiResponse.dispatchedPautas,
    suggestedOptions: aiResponse.suggestedOptions,
  };

  // Se uma nova pauta foi aprovada ou substituída, desativa badges de pautas anteriores no histórico da Clara para evitar duplicidade visual
  const sanitizedHistory = history.map((m) => {
    if (
      aiResponse.actionTaken &&
      aiResponse.actionTaken !== "NONE" &&
      m.sender === "clara" &&
      m.actionTaken &&
      m.actionTaken !== "NONE"
    ) {
      return {
        ...m,
        actionTaken: "NONE" as const,
      };
    }
    return m;
  });

  const updatedHistory = [...sanitizedHistory, userMsg, claraMsg];
  await saveAgencyChatHistory(updatedHistory);

  return { userMsg, claraMsg };
}
