import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PipelineContext, PipelineStageHandler } from "../types.js";
import { getSettings } from "../../config/settings.js";
import { generateReelsCodeScenes } from "../../services/reels-animation-builder.js";

const execFileAsync = promisify(execFile);

export const videoProductionStage: PipelineStageHandler = {
  id: "video",
  name: "Produção de Áudio e Vídeo Reels",
  execute: async (ctx: PipelineContext, log) => {
    const isReel =
      ctx.content?.format === "REEL_SCRIPT" ||
      ctx.content?.format === "REEL" ||
      ctx.content?.format === "REELS" ||
      ctx.decision?.format === "REEL_SCRIPT" ||
      ctx.decision?.format === "REEL";

    if (!isReel) {
      log("⏩ Formato não é Vídeo Reels. Pulando etapa de renderização de vídeo.");
      return;
    }

    if (!ctx.postId || !ctx.content) {
      log("⚠️ Contexto de conteúdo ou Post ID ausente para produção de vídeo.", "warning");
      return;
    }

    const audioDir = path.resolve(process.cwd(), "output", "reels-audio");
    const videoDir = path.resolve(process.cwd(), "output", "reels-video");
    await fs.mkdir(audioDir, { recursive: true });
    await fs.mkdir(videoDir, { recursive: true });

    const audioPath = path.join(audioDir, `reels_${ctx.postId}.mp3`);
    const videoPath = path.join(videoDir, `reels_${ctx.postId}.mp4`);
    const configPath = path.join(videoDir, `config_${ctx.postId}.json`);

    // 1. Sintetiza a Narração Neural (TTS)
    log("🎙️ Sintetizando voz neural para a locução do Reels...");
    const slides = ctx.content.slides || [];
    const narrationParts = slides.map((s) => s.text.replace(/\[.*?\]/g, "").trim()).filter(Boolean);
    const fullNarration = narrationParts.length > 0
      ? narrationParts.join(" ... ")
      : `${ctx.content.topic}. ${ctx.content.caption || ""}`;

    const settings = await getSettings();
    const elevenLabsKey = settings.voiceConfig?.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;
    const elevenLabsVoiceId = settings.voiceConfig?.elevenLabsVoiceId || "HmMggjJh26aAzvp7MtDb";

    let ttsSuccess = false;

    // Tentativa 1: ElevenLabs (se configurada)
    if (elevenLabsKey && elevenLabsKey.trim().length > 10) {
      try {
        log(`📡 Enviando para ElevenLabs AI (Voice ID: ${elevenLabsVoiceId})...`);
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: fullNarration,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.35,
              similarity_boost: 0.8,
            },
          }),
        });

        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          await fs.writeFile(audioPath, buf);
          log("✅ Áudio de alta definição ElevenLabs gerado com sucesso!");
          ttsSuccess = true;
        } else {
          log(`⚠️ ElevenLabs retornou erro ${res.status}. Utilizando fallback Edge TTS neural...`, "warning");
        }
      } catch (e) {
        log(`⚠️ Falha na conexão com ElevenLabs: ${e}. Usando Edge TTS neural...`, "warning");
      }
    }

    // Tentativa 2: Edge TTS Neural (Local Python pt-BR-AntonioNeural)
    if (!ttsSuccess) {
      log("🎙️ Sintetizando com Edge TTS Neural em Português (pt-BR-AntonioNeural)...");
      try {
        const pythonScript = path.resolve(process.cwd(), "scripts", "synthesize_tts.py");
        await execFileAsync("python", [pythonScript, audioPath, "pt-BR-AntonioNeural", fullNarration]);
        log("✅ Áudio Edge TTS gerado com sucesso!");
        ttsSuccess = true;
      } catch (edgeErr) {
        log(`❌ Falha ao sintetizar áudio TTS: ${edgeErr}`, "error");
        return;
      }
    }

    // 2. Prepara Cenas de Código Realistas com IA (Gemini) para Animação no VS Code
    log("💻 Gerando código-fonte realista e progressivo com IA para a animação do VS Code...");
    const scenes = await generateReelsCodeScenes({
      topic: ctx.content.topic,
      caption: ctx.content.caption,
      slides: slides.map((s) => ({ number: s.number, title: s.title, text: s.text })),
    });

    const videoConfig = {
      postId: ctx.postId,
      topic: ctx.content.topic,
      audioPath,
      outputPath: videoPath,
      scenes,
    };

    await fs.writeFile(configPath, JSON.stringify(videoConfig, null, 2), "utf-8");

    // 3. Renderiza o Vídeo com Animação de Digitação e Whisper AI
    log("🎬 Renderizando vídeo Reels 1080x1920 (Digitação Animada + Legendas Whisper)...");
    try {
      const renderScript = path.resolve(process.cwd(), "scripts", "render_reels_for_post.py");
      await execFileAsync("python", [renderScript, configPath]);
      log(`✅ Vídeo Reels renderizado com sucesso em: ${videoPath}!`, "success");
    } catch (renderErr) {
      log(`⚠️ Erro ao renderizar vídeo com script dinâmico: ${renderErr}`, "warning");
    }
  },
};
