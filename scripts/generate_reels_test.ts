import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { runPipeline } from "../src/pipeline/orchestrator.js";
import { prisma } from "../src/core/database.js";
import { getSettings } from "../src/config/settings.js";

async function main() {
  console.log("\n========================================================");
  console.log("🎬 GERANDO ROTEIRO E ASSETS DE REELS + LOCUÇÃO ELEVENLABS");
  console.log("========================================================\n");

  const topic = "POV: Você herda um sistema legado sem testes unitários e a primeira tarefa é corrigir um bug crítico de pagamento";

  const slot = {
    topic,
    format: "REEL_SCRIPT",
    objective: "AUTHORITY",
    hook: "POV: Você herdou um sistema legado de pagamentos sem testes unitários.",
    reasoning: "POV de alta identificação entre desenvolvedores e líderes técnicos, gerando engajamento, salvamentos e identificação com desafios de engenharia real.",
  };

  // 1. Executa o Pipeline Completo
  console.log("🚀 Executando Pipeline Editorial Autônomo...");
  const result = await runPipeline({
    slot,
    onLog: (msg, type) => {
      const prefix = type === "success" ? "✅" : type === "warning" ? "⚠️" : type === "error" ? "❌" : "ℹ️";
      console.log(`${prefix} ${msg}`);
    },
  });

  if (!result.success || !result.postId) {
    console.error("❌ Falha na execução do pipeline:", result.message);
    process.exit(1);
  }

  console.log(`\n🎉 Pipeline concluído com sucesso! Post ID: ${result.postId}`);

  // 2. Busca o post gerado com todas as cenas
  const post = await prisma.post.findUnique({
    where: { id: result.postId },
    include: { slides: { orderBy: { number: "asc" } } },
  });

  if (!post) {
    throw new Error("Post não encontrado no banco de dados.");
  }

  console.log("\n--------------------------------------------------------");
  console.log(`📜 ROTEIRO GERADO (${post.slides.length} CENAS):`);
  console.log("--------------------------------------------------------");

  const voiceScriptParts: string[] = [];

  post.slides.forEach((slide) => {
    console.log(`\n[${slide.title}]`);
    console.log(`🗣️ Narração: "${slide.text}"`);
    console.log(`🎥 Direção Visual: ${slide.visualDirection}`);
    if (slide.imagePath) {
      console.log(`🖼️ Capa/Arte: ${slide.imagePath}`);
    }
    voiceScriptParts.push(slide.text);
  });

  // 3. Monta o roteiro completo de narração contínua
  const fullVoiceScript = voiceScriptParts.join(" ... ");
  console.log("\n--------------------------------------------------------");
  console.log("🎙️ ROTEIRO COMPLETO PARA LOCUÇÃO DA IA:");
  console.log(fullVoiceScript);
  console.log("--------------------------------------------------------\n");

  // 4. Sintetiza a Locução na ElevenLabs usando a voz clonada
  const settings = await getSettings();
  const apiKey = settings.voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
  const voiceId = settings.voiceConfig?.elevenLabsVoiceId;

  if (!apiKey || !voiceId) {
    console.warn("⚠️ API Key ou Voice ID da ElevenLabs não configurados nas preferências.");
    return;
  }

  console.log(`🤖 Sintetizando locução com ElevenLabs (Voice ID: ${voiceId})...`);

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey.trim(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: fullVoiceScript,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: settings.voiceConfig?.stability ?? 0.5,
        similarity_boost: settings.voiceConfig?.similarityBoost ?? 0.75,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`❌ Erro TTS ElevenLabs (${response.status}):`, errText);
    return;
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioDir = path.resolve(process.cwd(), "output", "reels-audio");
  await fs.mkdir(audioDir, { recursive: true });
  
  const audioFilePath = path.join(audioDir, `reels_${result.postId}.mp3`);
  const permanentVoiceLab = path.resolve(process.cwd(), "voice-lab", "sintese_gerada.mp3");

  await fs.writeFile(audioFilePath, Buffer.from(arrayBuffer));
  await fs.writeFile(permanentVoiceLab, Buffer.from(arrayBuffer));

  console.log(`\n✅ ÁUDIO DE LOCUÇÃO GERADO COM SUCESSO!`);
  console.log(`📁 Arquivo do Reels: ${audioFilePath}`);
  console.log(`📁 Player do Dashboard: ${permanentVoiceLab}`);
  console.log(`📊 Tamanho do áudio: ${(arrayBuffer.byteLength / 1024).toFixed(1)} KB`);

  console.log("\n========================================================");
  console.log("🚀 TUDO PRONTO PARA PRODUÇÃO DO REEL!");
  console.log("========================================================\n");
}

main()
  .catch((err) => {
    console.error("❌ Erro fatal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
