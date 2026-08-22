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

export interface ChatMessage {
  id: string;
  sender: "user" | "clara";
  text: string;
  audioPath?: string;
  timestamp: string;
  actionTaken?: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT" | "REPLACED_PREVIOUS_PAUTA" | "CANCELED_PAUTA";
  dispatchedPauta?: {
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
  };
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
  actionTaken: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT" | "REPLACED_PREVIOUS_PAUTA" | "CANCELED_PAUTA";
  dispatchedPauta?: {
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
  };
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

  // 1. Coleta Inteligente de Contexto
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

  const standardSlots = [
    { day: "Segunda-feira", time: "18:30", format: "CAROUSEL", label: "Segunda da Arquitetura & DevOps" },
    { day: "Terça-feira", time: "18:30", format: "CAROUSEL", label: "Terça de Backend & Algoritmos" },
    { day: "Quarta-feira", time: "19:00", format: "SINGLE_IMAGE", label: "Quarta de Clean Code & Boas Práticas" },
    { day: "Quinta-feira", time: "18:00", format: "REEL_SCRIPT", label: "Quinta de Lançamentos & Notícias Tech" },
    { day: "Sexta-feira", time: "17:30", format: "CAROUSEL", label: "Sexta de Engenharia de Software" },
    { day: "Domingo", time: "19:30", format: "CAROUSEL", label: "Domingo de Planejamento & Carreira Dev" },
  ];

  const occupiedSlotKeys = new Set(slots.map((s) => `${s.weekOffset === 0 ? "Semana Atual" : "Próxima Semana"} - ${s.dayOfWeek} às ${s.timeSlot}`));

  const availableSlotsList: string[] = [];
  for (const weekLabel of ["Semana Atual", "Próxima Semana"]) {
    for (const std of standardSlots) {
      const key = `${weekLabel} - ${std.day} às ${std.time}`;
      if (!occupiedSlotKeys.has(key)) {
        availableSlotsList.push(`- [${weekLabel}] ${std.day} às ${std.time} (LIVRE — Ideal para ${std.format} / ${std.label})`);
      }
    }
  }

  const insights = await getAllInsights();
  const activeInsights = insights.filter((i) => i.status === "VALIDATED").slice(0, 5);

  const now = new Date();
  const currentDayName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][now.getDay()];
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const prompt = `
Você é ${managerName}, ${managerRole} do perfil profissional de tecnologia ${brand.handle} no Instagram.

SUA PERSONALIDADE & TOM DE VOZ:
- Você é uma estrategista de conteúdo tech sênior, amigável, extremamente inteligente, ágil e focada em resultados.
- Você conversa com o criador (o usuário) de forma natural, colaborativa e direta.
- **REGRA DE OURO DA EXPERIÊNCIA DO CLIENTE**:
  * O criador NÃO quer saber de termos técnicos de mídia como "carrossel 4:5", "hot take", "single image", "breakpoint", etc.
  * O criador foca puramente no **tema, na ideia e no valor técnico para os desenvolvedores**.
  * É VOCÊ QUEM CUIDA DE TODA A ESTRATÉGIA DE MÍDIA, FORMATO, HORÁRIO E ENGENHARIA EDITORIAL NOS BASTIDORES!
  * Quando você sugerir ideias, apresente **3 opções de pautas em linguagem simples e empolgante**, mostrando o título provocativo e por que a comunidade tech vai amar.

CONTEXTO REAL DA GRADE EDITORIAL DO PERFIL AGORA:
- Data & Hora Atual: ${currentDayName}, às ${currentTimeStr}
- Posicionamento: ${brand.name} (${brand.handle})
- Histórico Recente de Posts no Banco:
${recentPosts.map((p) => `- [${p.format} / ${p.narrativeAngle || "BEFORE_AFTER"}] "${p.topic}" (${p.status})`).join("\n")}

- SLOTS JÁ OCUPADOS NO CRONOGRAMA:
${slots.length > 0 ? slots.map((s) => `- [Semana ${s.weekOffset === 0 ? "Atual" : "Próxima"}] ${s.dayOfWeek} às ${s.timeSlot}: "${s.topic}" (${s.format})`).join("\n") : "Nenhum slot ocupado."}

- SLOTS LIVRES E RECOMENDADOS PARA NOVAS PAUTAS:
${availableSlotsList.length > 0 ? availableSlotsList.slice(0, 8).join("\n") : "- Próxima Quinta-feira às 18:00\n- Próxima Sexta-feira às 17:30\n- Próxima Segunda-feira às 18:30"}

- Diretrizes Validadas do RAG:
${activeInsights.map((i) => `- ${i.title}: ${i.content}`).join("\n")}

HISTÓRICO RECENTE DA CONVERSA:
${history.slice(-6).map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}

NOVA MENSAGEM DO CRIADOR:
"${userText}"

COMO VOCÊ DEVE SE COMPORTAR:

1. **FASE DE IDEAÇÃO / SUGESTÃO DE TEMA**:
   - Se o criador mandou um tema (ex: "vamos falar de IPC no Electron", "quero falar de Docker") ou pediu ideias:
   - Responda amigavelmente validando a ideia e apresente **3 opções de abordagens complementares** no campo "suggestedOptions".
   - No texto ("replyText" e "spokenText"), fale de forma leve e empolgada sobre as 3 opções.
   - Deixe "actionTaken": "NONE".

2. **FASE DE APROVAÇÃO E DESPACHO AUTÔNOMO**:
   - Se o criador disse que gostou de uma opção (ex: "gostei da opção 2", "pode fazer essa", "vamos na primeira", "adorei", "manda ver"):
   - Você **assume o controle total**:
     * Decide nos bastidores o melhor formato (CAROUSEL, REEL_SCRIPT ou SINGLE_IMAGE) e ângulo narrativo (BEFORE_AFTER, HOT_TAKE, MIGRATION_GUIDE, etc.).
     * **REGRA CRÍTICA DE AGENDAMENTO (DISTRIBUIÇÃO EQUILIBRADA NA SEMANA)**:
       - **NÃO agende todas as pautas para o mesmo dia/horário!** Se Terça-feira já está ocupada, escolha Quinta-feira, Sexta-feira, Quarta-feira ou Segunda-feira.
       - Consulte a lista de SLOTS LIVRES acima e selecione o próximo dia/horário mais estratégico e vago.
     * **Se o criador pediu URGÊNCIA** ("urgente", "faz logo", "quero pra hoje", "posta amanhã"):
       - Defina "actionTaken": "SCHEDULED_URGENT" ou "DISPATCHED_TO_PIPELINE".
       - Responda avisando que já se reuniu com o Analytics e enfileirou a produção com prioridade máxima para a janela mais quente de hoje/amanhã.
     * **Se for uma pauta normal**:
       - Defina "actionTaken": "SCHEDULED_FOR_GRADE" ou "DISPATCHED_TO_PIPELINE".
       - Responda tranquilizando o criador citando o dia e horário REAL escolhido (ex: *"Perfeito! Já me reuni com o Analytics, defini o formato ideal e encaixei na nossa grade para a próxima Quinta-feira às 18:00. Já despachei para a produção e você não precisa se preocupar com mais nada!"*).
     * Preencha "dispatchedPauta" com o dia escolhido ("scheduledDay": "Quinta-feira", "scheduledTime": "18:00", etc.).

3. **FASE DE MUDANÇA DE IDEIA OU SUBSTITUIÇÃO DE PAUTA**:
   - Se o criador disse que mudou de ideia, preferiu outra opção ou quer trocar uma pauta já aprovada anteriormente (ex: "mudei de ideia, quero o 2", "cancela e faz a 1", "na verdade prefiro a opção 3", "troca para a pauta X", "nn quero essa, faz a outra"):
   - Você deve:
     * Ser super compreensiva, ágil, prestativa e natural: *"Sem problemas! Já cancelei a pauta anterior no cronograma e substitui pela Opção [N]: [Título da nova pauta]!"*
     * Identificar qual é a nova pauta escolhida a partir do histórico de opções.
     * Identificar qual foi a pauta anterior que deve ser cancelada.
     * Definir "actionTaken": "REPLACED_PREVIOUS_PAUTA".
     * Preencher "dispatchedPauta" com os dados da NOVA pauta escolhida e incluir o campo "canceledPreviousTopic" com o título/tema da pauta anterior que foi substituída.

4. **FASE DE REFINAMENTO**:
   - Se o criador pedir ajustes ("não gostei", "quero algo mais para iniciantes", "muda o foco para segurança"):
   - Seja receptiva, compreenda o direcionamento e gere 3 novas opções afinadas.

5. **SPOKEN TEXT (PARA VOZ DA CLARA)**:
   - O campo "spokenText" será lido diretamente pela voz neural feminina.
   - Escreva de forma 100% natural e conversacional em português (sem markdown, sem listas com asteriscos, sem emojis).

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
    "canceledPreviousTopic": "Título da pauta anterior que foi cancelada/substituída se for o caso"
  },
  "suggestedOptions": [
    {
      "optionNumber": 1,
      "title": "Título chamativo da Opção 1",
      "summary": "Resumo prático do que será abordado",
      "whyItEngages": "Por que a audiência dev vai se interessar e salvar"
    }
  ]
}
Nota: Quando actionTaken for "NONE", deixe "dispatchedPauta": null. Quando actionTaken for "DISPATCHED_TO_PIPELINE", "SCHEDULED_FOR_GRADE", "SCHEDULED_URGENT" ou "REPLACED_PREVIOUS_PAUTA", o objeto "dispatchedPauta" deve conter obrigatoriamente o campo "topic".
`.trim();

  const aiResponse = await executeStructuredPrompt<GeminiClaraResponse>(prompt);

  let audioPath: string | undefined = undefined;
  if (generateVoice && aiResponse.spokenText) {
    audioPath = await synthesizeClaraVoice(aiResponse.spokenText);
  }

  const userMsgId = `msg-user-${Date.now()}`;
  const claraMsgId = `msg-clara-${Date.now() + 1}`;

  const userMsg: ChatMessage = {
    id: userMsgId,
    sender: "user",
    text: userText,
    timestamp: new Date().toISOString(),
  };

  const claraMsg: ChatMessage = {
    id: claraMsgId,
    sender: "clara",
    text: aiResponse.replyText,
    audioPath,
    timestamp: new Date().toISOString(),
    actionTaken: aiResponse.actionTaken,
    dispatchedPauta: aiResponse.dispatchedPauta,
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
