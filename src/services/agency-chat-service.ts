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

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");

export interface ChatMessage {
  id: string;
  sender: "user" | "clara";
  text: string;
  audioPath?: string;
  timestamp: string;
  actionTaken?: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT";
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
  actionTaken: "NONE" | "DISPATCHED_TO_PIPELINE" | "SCHEDULED_FOR_GRADE" | "SCHEDULED_URGENT";
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
  };
  suggestedOptions?: Array<{
    optionNumber: number;
    title: string;
    summary: string;
    whyItEngages: string;
  }>;
}

const HISTORY_FILE_PATH = path.join(projectRoot, "output", "agency-chat-history.json");

/**
 * Carrega o histórico da conversa com a Clara
 */
export async function getAgencyChatHistory(): Promise<ChatMessage[]> {
  try {
    const data = await fs.readFile(HISTORY_FILE_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [
      {
        id: "msg-welcome",
        sender: "clara",
        text: "Olá! Eu sou a Clara, sua Gestora Editorial aqui na Syrius. Estou sempre de olho nas métricas do perfil e nas maiores tendências de desenvolvimento. Me conta: que ideia ou assunto você está pensando em abordar agora? Podemos trocar uma ideia e eu cuido de todo o resto!",
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
  try {
    const dir = path.dirname(HISTORY_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(history.slice(-40), null, 2), "utf-8");
  } catch (err) {
    console.error("[AgencyChat] Erro ao salvar histórico:", err);
  }
}

/**
 * Limpa o histórico da conversa
 */
export async function clearAgencyChatHistory(): Promise<void> {
  try {
    await fs.unlink(HISTORY_FILE_PATH);
  } catch {}
}

/**
 * Sintetiza o áudio da voz da Clara usando Edge TTS (pt-BR-FranciscaNeural)
 */
export async function synthesizeClaraVoice(text: string): Promise<string> {
  const audioDir = path.join(projectRoot, "output", "audio");
  await fs.mkdir(audioDir, { recursive: true });

  const fileName = `clara-${Date.now()}.mp3`;
  const outputPath = path.join(audioDir, fileName);

  const cleanText = text
    .replace(/[*_#`~>\[\]]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  const scriptPath = path.join(projectRoot, "scripts", "synthesize_tts.py");

  try {
    await execFileAsync("python", [scriptPath, outputPath, "pt-BR-FranciscaNeural", cleanText]);
    return outputPath;
  } catch (err) {
    console.warn("[AgencyChat] Fallback ao gerar voz da Clara:", err);
    return "";
  }
}

/**
 * Transcreve áudio do usuário enviado via microfone
 */
export async function transcribeUserAudio(audioBase64: string, mimeType = "audio/webm"): Promise<string> {
  try {
    const { ai } = getGeminiAI();
    const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
              text: "Transcreva este áudio do usuário em português brasileiro exatamente como foi falado. Retorne APENAS o texto puro transcrito, sem comentários, sem aspas e sem explicações.",
            },
          ],
        },
      ],
    });

    return response.text?.trim() || "";
  } catch (err) {
    console.error("[AgencyChat] Erro ao transcrever áudio do usuário:", err);
    throw new Error(`Erro na transcrição de voz: ${err instanceof Error ? err.message : "Erro desconhecido"}`);
  }
}

/**
 * Processa a mensagem do usuário com a Gestora Clara
 */
export async function processAgencyMessage(
  userText: string,
  generateVoice = true
): Promise<{ userMsg: ChatMessage; claraMsg: ChatMessage }> {
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

  const insights = await getAllInsights();
  const activeInsights = insights.filter((i) => i.status === "VALIDATED").slice(0, 5);

  const now = new Date();
  const currentDayName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][now.getDay()];
  const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const prompt = `
Você é a **Clara**, a **Head Editorial & Gestora de Conteúdo Sênior** do perfil profissional de tecnologia ${brand.handle} no Instagram.

SUA PERSONALIDADE & TOM DE VOZ:
- Você é uma estrategista de conteúdo tech sênior, amigável, extremamente inteligente, ágil e focada em resultados.
- Você conversa com o criador (o usuário) de forma natural, colaborativa e direta.
- **REGRA DE OURO DA EXPERIÊNCIA DO CLIENTE**:
  * O criador NÃO quer saber de termos técnicos de mídia como "carrossel 4:5", "hot take", "single image", "breakpoint", etc.
  * O criador foca puramente no **tema, na ideia e no valor técnico para os desenvolvedores**.
  * É VOCÊ QUEM CUIDA DE TODA A ESTRATÉGIA DE MÍDIA, FORMATO, HORÁRIO E ENGENHARIA EDITORIAL NOS BASTIDORES!
  * Quando você sugerir ideias, apresente **3 opções de pautas em linguagem simples e empolgante**, mostrando o título provocativo e por que a comunidade tech vai amar.

CONTEXTO REAL DO PERFIL AGORA:
- Data & Hora Atual: ${currentDayName}, às ${currentTimeStr}
- Posicionamento: ${brand.name} (${brand.handle})
- Histórico Recente de Posts no Banco:
${recentPosts.map((p) => `- [${p.format} / ${p.narrativeAngle || "BEFORE_AFTER"}] "${p.topic}" (${p.status})`).join("\n")}
- Slots no Cronograma Semanal:
${slots.map((s) => `- [Semana ${s.weekOffset === 0 ? "Atual" : "Próxima"}] ${s.dayOfWeek} ${s.timeSlot}: "${s.topic}" (${s.status})`).join("\n")}
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
     * **Se o criador pediu URGÊNCIA** ("urgente", "faz logo", "quero pra hoje", "posta amanhã"):
       - Defina "actionTaken": "SCHEDULED_URGENT" ou "DISPATCHED_TO_PIPELINE".
       - Responda avisando que já se reuniu com o Analytics e enfileirou a produção com prioridade máxima para a janela mais quente de hoje/amanhã.
     * **Se for uma pauta normal**:
       - Defina "actionTaken": "SCHEDULED_FOR_GRADE" ou "DISPATCHED_TO_PIPELINE".
       - Analise a grade e escolha o melhor dia/horário estratégico.
       - Responda tranquilizando o criador: *"Perfeito! Já me reuni com o Analytics e decidi o melhor formato e horário (${currentDayName === "Segunda-feira" ? "Terça às 18:30" : "Quinta às 18:00"}). Já despachei para a produção e você não precisa se preocupar com mais nada!"*
     * Preencha "dispatchedPauta" com todos os detalhes técnicos que você escolheu.

3. **FASE DE REFINAMENTO**:
   - Se o criador pedir ajustes ("não gostei", "quero algo mais para iniciantes", "muda o foco para segurança"):
   - Seja receptiva, compreenda o direcionamento e gere 3 novas opções afinadas.

4. **SPOKEN TEXT (PARA VOZ DA CLARA)**:
   - O campo "spokenText" será lido diretamente pela voz neural feminina.
   - Escreva de forma 100% natural e conversacional em português (sem markdown, sem listas com asteriscos, sem emojis).

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "replyText": "texto completo amigável e estilizado para exibição no chat",
  "spokenText": "texto fluido e conversacional para a locução neural feminina",
  "actionTaken": "NONE",
  "dispatchedPauta": null,
  "suggestedOptions": [
    {
      "optionNumber": 1,
      "title": "Título chamativo da Opção 1",
      "summary": "Resumo prático do que será abordado",
      "whyItEngages": "Por que a audiência dev vai se interessar e salvar"
    }
  ]
}
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

  const updatedHistory = [...history, userMsg, claraMsg];
  await saveAgencyChatHistory(updatedHistory);

  return { userMsg, claraMsg };
}
