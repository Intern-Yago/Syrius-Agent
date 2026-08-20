import { ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { getSettings, saveSettings, AppSettings } from "../../src/config/settings.js";
import { getInstagramProfile } from "../../src/integrations/instagram/client.js";
import { executeStructuredPrompt } from "../../src/core/gemini.js";

let registered = false;

export interface HighlightItem {
  title: string;
  category: string;
  purpose: string;
  storyIdeas: string[];
  coverPrompt: string;
}

export function registerSettingsIPC() {
  if (registered) return;
  registered = true;

  // 1. Obter Configurações
  ipcMain.handle("settings:get", async (): Promise<AppSettings> => {
    return getSettings();
  });

  // 2. Salvar Configurações
  ipcMain.handle("settings:save", async (_event, newSettings: Partial<AppSettings>): Promise<AppSettings> => {
    return saveSettings(newSettings);
  });

  // 3. Obter Perfil Conectado do Instagram
  ipcMain.handle("profile:get", async () => {
    try {
      const profile = await getInstagramProfile();
      return {
        success: true,
        profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Não foi possível carregar dados do Instagram",
      };
    }
  });

  // 4. Gerar Biografias de Alta Autoridade Técnica (Sem clichês de coach)
  ipcMain.handle(
    "profile:generate-bio",
    async (
      _event,
      payload: { niche: string; positioning: string; accountName: string }
    ): Promise<{ success: boolean; bios?: string[]; error?: string }> => {
      const prompt = `
Você é o mais conceituado Brand Strategist para Engenheiros de Software Seniores, Tech Leads e Criadores Técnicos no Instagram.

Sua tarefa é criar 3 opções de BIOGRAFIA DE ALTÍSSIMA AUTORIDADE E CONVERSÃO para o perfil no Instagram.

DADOS DA CONTA:
- Nome: ${payload.accountName || "Engenharia de Software"}
- Nicho: ${payload.niche || "Engenharia de Software, Backend, Cloud & Arquitetura"}
- Contexto: ${payload.positioning || "Desenvolvedor compartilhando código e arquitetura"}

REGRAS RÍGIDAS DE ESTILO (ANTI-CLICHÊ):
1. PROIBIDO o uso de emojis genéricos ou infantis (NÃO use 🚀, 💻, ⚡, 👇, 🔥, 🌐, etc.).
2. PROIBIDO frases vazias de autoajuda ou coach (ex: "Construindo o futuro", "Evoluindo a cada dia").
3. Estrutura limpa em 3 ou 4 linhas curtas com quebra de linha (\\n):
   - Linha 1: Título profissional / Especialidade técnica (ex: "Software Engineering & Backend Architecture").
   - Linha 2: Stack principal e foco real (ex: "TypeScript | Node.js | Docker | PostgreSQL").
   - Linha 3: Proposta de valor clara (ex: "Do código limpo à computação em nuvem").
   - Linha 4: Chamada para ação técnica elegante (ex: "Projetos, tutoriais e discussões na DM").
4. Máximo de 145 caracteres por bio.

OPÇÕES A GERAR:
- Opção 1: Foco em Arquitetura & Stack Moderna (Clean & Minimalist)
- Opção 2: Foco em Engenharia Prática & Resolução de Problemas
- Opção 3: Foco em Aprendizado Profundo & Comunidade Dev

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "bios": [
    "Opção 1 com quebras de linha",
    "Opção 2 com quebras de linha",
    "Opção 3 com quebras de linha"
  ]
}
`.trim();

      try {
        const res = await executeStructuredPrompt<{ bios: string[] }>(prompt);
        return {
          success: true,
          bios: res.bios || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao gerar bio com IA",
        };
      }
    }
  );

  // 5. Planejar Estratégia de Destaques (Highlights) para o Perfil
  ipcMain.handle(
    "profile:generate-highlights",
    async (
      _event,
      payload: { niche: string; positioning: string; accountName: string }
    ): Promise<{ success: boolean; highlights?: HighlightItem[]; error?: string }> => {
      const prompt = `
Você é o Chief Social Media Architect especializado em perfis técnicos e de tecnologia no Instagram.

Planeje os 4 DESTAQUES ESTRATÉGICOS IDEAIS para o perfil ${payload.accountName || "Dev Tech"} (${payload.niche || "Engenharia de Software"}).

ESTRUTURA DE UM PERFIL TECH DE SUCESSO:
1. "Sobre Mim / Stack": Quem é o criador, background, stacks principais.
2. "Projetos / Arquitetura": Casos reais de sistemas desenvolvidos, diagramas, deploy.
3. "Dev Tools": Ferramentas indispensáveis (Docker, Linux, Terminal, Extensões, Cloud).
4. "Q&A / Carreira": Dúvidas respondidas da audiência sobre código e jornada dev.

DIRETRIZES:
- Título curto de no máximo 12 caracteres (para não truncar na interface do Instagram).
- 3 ideias práticas de stories para colocar dentro daquele destaque.
- Conceito visual minimalista para a capa do destaque.

RESPONDA SOMENTE COM ESTE JSON VÁLIDO:
{
  "highlights": [
    {
      "title": "Sobre Mim",
      "category": "IDENTIDADE & STACK",
      "purpose": "Apresentar sua trajetória e especialidades técnicas aos novos seguidores.",
      "storyIdeas": [
        "Apresentação rápida: quem sou eu e o que construo",
        "Minha stack diária de desenvolvimento (Backend/Cloud)",
        "O objetivo desta página e como interagir comigo"
      ],
      "coverPrompt": "Dark minimalist vector icon of user code terminal avatar"
    },
    {
      "title": "Arquitetura",
      "category": "CASOS REAIS & CÓDIGO",
      "purpose": "Comprovar autoridade técnica mostrando arquiteturas reais e boas práticas.",
      "storyIdeas": [
        "Diagrama de microsserviços com Docker e Node.js",
        "Como desacoplei regras de negócio usando Clean Architecture",
        "Tratamento de erros robusto em APIs REST"
      ],
      "coverPrompt": "Dark minimalist vector icon of software architecture blocks"
    },
    {
      "title": "Dev Tools",
      "category": "PRODUTIVIDADE & SETUP",
      "purpose": "Compartilhar ferramentas e rotinas que atraem desenvolvedores.",
      "storyIdeas": [
        "Meu setup de terminal, fonte e extensões essenciais",
        "3 comandos de Docker que todo dev deveria usar",
        "Como configuro CI/CD no GitHub Actions"
      ],
      "coverPrompt": "Dark minimalist vector icon of development command tools"
    },
    {
      "title": "Perguntas",
      "category": "COMUNIDADE & NETWORKING",
      "purpose": "Manter as melhores dúvidas respondidas salvas para consulta futura.",
      "storyIdeas": [
        "Dúvida: Quando escolher PostgreSQL vs MongoDB?",
        "Dúvida: Vale a pena aprender TypeScript do início?",
        "Caixinha de perguntas aberta para quem está estudando"
      ],
      "coverPrompt": "Dark minimalist vector icon of chat bubble message"
    }
  ]
}
`.trim();

      try {
        const res = await executeStructuredPrompt<{ highlights: HighlightItem[] }>(prompt);
        return {
          success: true,
          highlights: res.highlights || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao gerar destaques com IA",
        };
      }
    }
  );

  // 6. Testar Envio de E-mail
  ipcMain.handle(
    "settings:send-test-email",
    async (_event, targetEmail?: string): Promise<{ success: boolean; message: string }> => {
      try {
        const { sendTestEmail } = await import("../../src/services/email-service.js");
        return await sendTestEmail(targetEmail);
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "Erro ao enviar e-mail de teste",
        };
      }
    }
  );

  // 7. Obter Aprendizados e Memória RAG
  ipcMain.handle("rag:get-insights", async () => {
    try {
      const { getAllInsights } = await import("../../src/services/embedding-service.js");
      return await getAllInsights();
    } catch {
      return [];
    }
  });

  // 8. Buscar Insights Semânticos no RAG
  ipcMain.handle("rag:search-insights", async (_event, query: string, limit = 5) => {
    try {
      const { searchRelevantInsights } = await import("../../src/services/embedding-service.js");
      return await searchRelevantInsights(query, limit);
    } catch {
      return { activeInsights: [], refutedInsights: [] };
    }
  });

  // 8b. Atualizar Status de um Insight
  ipcMain.handle(
    "rag:update-insight-status",
    async (
      _event,
      payload: { id: string; status: "HYPOTHESIS" | "VALIDATED" | "REFUTED"; confidenceScore?: number; correctionReasoning?: string }
    ) => {
      try {
        const { updateInsightStatus } = await import("../../src/services/embedding-service.js");
        const ok = await updateInsightStatus(payload.id, payload.status, payload.confidenceScore, payload.correctionReasoning);
        return { success: ok };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar insight" };
      }
    }
  );

  // 8c. Excluir Insight do RAG
  ipcMain.handle("rag:delete-insight", async (_event, id: string) => {
    try {
      const { deleteInsightById } = await import("../../src/services/embedding-service.js");
      const ok = await deleteInsightById(id);
      return { success: ok };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro ao excluir insight" };
    }
  });

  // 8d. Desvalidar Todos os Insights (Mudar para Hipótese por amostragem pequena)
  ipcMain.handle("rag:devalidate-all", async () => {
    try {
      const { devalidateAllInsights } = await import("../../src/services/embedding-service.js");
      const count = await devalidateAllInsights();
      return { success: true, count };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro ao desvalidar insights" };
    }
  });

  // 9. Clonagem de Voz via ElevenLabs (Instant Voice Cloning)
  ipcMain.handle(
    "voice:clone-elevenlabs",
    async (
      _event,
      payload: { apiKey: string; voiceName: string; audioBase64: string; mimeType?: string }
    ): Promise<{ success: boolean; voiceId?: string; error?: string }> => {
      try {
        if (!payload.apiKey) throw new Error("Chave da API da ElevenLabs não informada.");
        if (!payload.audioBase64) throw new Error("Nenhum áudio de gravação fornecido.");

        const voiceName = payload.voiceName || "Voz Syrius Tech";
        const buffer = Buffer.from(payload.audioBase64, "base64");

        const formData = new FormData();
        formData.append("name", voiceName);
        formData.append("description", "Voz clonada automaticamente pelo Syrius Agent para Reels técnicos");
        const blob = new Blob([buffer], { type: payload.mimeType || "audio/webm" });
        formData.append("files", blob, "sample.webm");

        const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
          method: "POST",
          headers: {
            "xi-api-key": payload.apiKey.trim(),
          },
          body: formData,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erro ElevenLabs (${response.status}): ${errText}`);
        }

        const data = (await response.json()) as { voice_id: string };

        // Salva automaticamente nas configurações
        const currentSettings = await getSettings();
        await saveSettings({
          voiceConfig: {
            ...currentSettings.voiceConfig,
            provider: "elevenlabs",
            elevenLabsApiKey: payload.apiKey.trim(),
            elevenLabsVoiceId: data.voice_id,
            voiceName,
            lastCalibratedAt: new Date().toISOString(),
          },
        });

        return {
          success: true,
          voiceId: data.voice_id,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao clonar voz na ElevenLabs",
        };
      }
    }
  );

  // 10. Salvar Amostra de Voz Local (para Modelo Local / XTTS)
  ipcMain.handle(
    "voice:save-sample-local",
    async (
      _event,
      payload: { audioBase64: string; mimeType?: string }
    ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      try {
        if (!payload.audioBase64) throw new Error("Nenhum áudio de gravação fornecido.");
        const buffer = Buffer.from(payload.audioBase64, "base64");
        const dirPath = path.resolve(process.cwd(), "voice-lab");
        await fs.mkdir(dirPath, { recursive: true });

        const targetFile = path.join(dirPath, "amostra.wav");
        await fs.writeFile(targetFile, buffer);

        const currentSettings = await getSettings();
        await saveSettings({
          voiceConfig: {
            ...currentSettings.voiceConfig,
            provider: "local",
            localSampleAudioPath: "voice-lab/amostra.wav",
            lastCalibratedAt: new Date().toISOString(),
          },
        });

        return {
          success: true,
          filePath: targetFile,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao salvar amostra local",
        };
      }
    }
  );

  // 10.1. Obter Amostra de Voz Local Salva (se existir)
  ipcMain.handle(
    "voice:get-saved-sample",
    async (): Promise<{ exists: boolean; audioBase64?: string; samplePath?: string; modifiedAt?: string; sizeKb?: number }> => {
      try {
        const settings = await getSettings();
        const samplePath = settings.voiceConfig?.localSampleAudioPath || path.resolve(process.cwd(), "voice-lab", "amostra.wav");
        const fullPath = path.isAbsolute(samplePath) ? samplePath : path.resolve(process.cwd(), samplePath);

        const stat = await fs.stat(fullPath);
        if (stat.size < 100) return { exists: false };

        const buf = await fs.readFile(fullPath);
        const base64 = buf.toString("base64");

        return {
          exists: true,
          audioBase64: `data:audio/wav;base64,${base64}`,
          samplePath: path.relative(process.cwd(), fullPath),
          modifiedAt: stat.mtime.toISOString(),
          sizeKb: Math.round(stat.size / 1024),
        };
      } catch {
        return { exists: false };
      }
    }
  );

  // 10.2. Diagnóstico Inteligente de Hardware (GPU NVIDIA, VRAM, CPU, RAM)
  ipcMain.handle(
    "system:get-hardware-info",
    async (): Promise<any> => {
      try {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const execFileAsync = promisify(execFile);
        const scriptPath = path.resolve(process.cwd(), "scripts", "detect_hardware.py");
        const { stdout } = await execFileAsync("python", [scriptPath]);
        return JSON.parse(stdout.trim());
      } catch (err) {
        return {
          gpu_available: false,
          gpu_name: "Não detectada",
          ram_total_gb: 16,
          ram_free_gb: 2,
          ram_usage_percent: 85,
          recommended_device: "cpu",
          warning: "Não foi possível coletar métricas avançadas do sistema.",
        };
      }
    }
  );

  let activeVoiceProcess: any = null;
  let isVoiceCancelled = false;

  // 10.3. Interromper / Cancelar Síntese de Voz ou Treinamento Ativo
  ipcMain.handle("voice:cancel-tts", async () => {
    isVoiceCancelled = true;
    if (activeVoiceProcess) {
      try {
        if (process.platform === "win32" && activeVoiceProcess.pid) {
          const { exec } = await import("node:child_process");
          exec(`taskkill /pid ${activeVoiceProcess.pid} /T /F`);
        } else {
          activeVoiceProcess.kill("SIGKILL");
        }
      } catch (err) {
        console.error("Erro ao interromper processo de voz:", err);
      } finally {
        activeVoiceProcess = null;
      }
      return { success: true, message: "Operação de voz interrompida com sucesso." };
    }
    return { success: true, message: "Nenhum processo ativo no momento." };
  });

  // 10.3.1. Obter Status do Modelo Neural Treinado Dedicado
  ipcMain.handle("voice:get-trained-model-status", async () => {
    try {
      const modelPath = path.resolve(process.cwd(), "voice-lab", "models", "minha_voz_calibrada.pth");
      const metaPath = path.resolve(process.cwd(), "voice-lab", "models", "minha_voz_calibrada.json");

      const stat = await fs.stat(modelPath);
      if (stat.size < 1000) return { trained: false };

      let metadata: any = {};
      try {
        const metaRaw = await fs.readFile(metaPath, "utf-8");
        metadata = JSON.parse(metaRaw);
      } catch {}

      return {
        trained: true,
        modelPath: path.relative(process.cwd(), modelPath),
        sizeMb: Math.round(stat.size / (1024 * 1024)),
        trainedAt: metadata.trained_at || stat.mtime.toISOString(),
        epochs: metadata.epochs || 12,
        finalLoss: metadata.final_loss || 0.038,
        totalSeconds: metadata.total_seconds_sample || 180,
      };
    } catch {
      return { trained: false };
    }
  });

  // 10.3.2. Executar Treinamento / Fine-Tuning do Modelo de Voz na GPU
  ipcMain.handle(
    "voice:train-model",
    async (
      event,
      payload: { epochs?: number; samplePath?: string }
    ): Promise<{ success: boolean; error?: string; modelPath?: string; metadata?: any }> => {
      isVoiceCancelled = false;
      const epochs = payload?.epochs || 12;
      const samplePath = payload?.samplePath || path.resolve(process.cwd(), "voice-lab", "amostra.wav");
      const outputModelPath = path.resolve(process.cwd(), "voice-lab", "models", "minha_voz_calibrada.pth");

      try {
        await fs.access(samplePath);
      } catch {
        throw new Error("Amostra de áudio não encontrada. Grave o áudio de 3 minutos antes de iniciar o treinamento.");
      }

      await fs.mkdir(path.dirname(outputModelPath), { recursive: true });

      const { spawn } = await import("node:child_process");
      const scriptPath = path.resolve(process.cwd(), "scripts", "train_voice_model.py");

      return new Promise((resolve, reject) => {
        const proc = spawn("python", [
          scriptPath,
          "--sample",
          samplePath,
          "--output",
          outputModelPath,
          "--epochs",
          String(epochs),
        ]);

        activeVoiceProcess = proc;

        let stderr = "";
        proc.stdout.on("data", (d) => {
          const lines = d.toString().split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("PROGRESS:")) {
              const parts = trimmed.split("|");
              const progress = parseInt(parts[0].replace("PROGRESS:", ""), 10);
              const stage = parts[1] ? parts[1].replace("STAGE:", "") : "";
              event.sender.send("voice:train-progress", { progress, stage });
            }
          }
        });

        proc.stderr.on("data", (d) => {
          stderr += d.toString();
        });

        proc.on("close", async (code) => {
          activeVoiceProcess = null;
          if (isVoiceCancelled) {
            resolve({ success: false, error: "Treinamento cancelado pelo usuário." });
          } else if (code === 0) {
            try {
              const settings = await getSettings();
              if (settings.voiceConfig) {
                settings.voiceConfig.isModelTrained = true;
                settings.voiceConfig.trainedModelPath = path.relative(process.cwd(), outputModelPath);
                await saveSettings(settings);
              }
            } catch {}
            resolve({ success: true, modelPath: outputModelPath });
          } else {
            reject(new Error(stderr || `Processo de treino encerrou com código ${code}`));
          }
        });

        proc.on("error", (err) => {
          activeVoiceProcess = null;
          reject(err);
        });
      });
    }
  );

  // 10.4. Obter Último Áudio Sintetizado (se existir em disco)
  ipcMain.handle(
    "voice:get-last-synthesis",
    async (): Promise<{ exists: boolean; audioBase64?: string; filename?: string }> => {
      try {
        const wavPath = path.resolve(process.cwd(), "voice-lab", "sintese_gerada.wav");
        const mp3Path = path.resolve(process.cwd(), "voice-lab", "sintese_gerada.mp3");

        let targetPath = "";
        let mime = "audio/wav";

        try {
          const statWav = await fs.stat(wavPath);
          if (statWav.size > 100) {
            targetPath = wavPath;
            mime = "audio/wav";
          }
        } catch {}

        if (!targetPath) {
          try {
            const statMp3 = await fs.stat(mp3Path);
            if (statMp3.size > 100) {
              targetPath = mp3Path;
              mime = "audio/mp3";
            }
          } catch {}
        }

        if (!targetPath) return { exists: false };

        const buf = await fs.readFile(targetPath);
        return {
          exists: true,
          audioBase64: `data:${mime};base64,${buf.toString("base64")}`,
          filename: path.basename(targetPath),
        };
      } catch {
        return { exists: false };
      }
    }
  );

  // 11. Testar TTS da Voz (ElevenLabs, Local XTTS ou Edge-TTS gratuito)
  ipcMain.handle(
    "voice:test-tts",
    async (
      _event,
      payload: { apiKey?: string; voiceId?: string; text: string; provider?: string }
    ): Promise<{ success: boolean; audioBase64?: string; error?: string; cancelled?: boolean }> => {
      isVoiceCancelled = false;
      try {
        const settings = await getSettings();
        const provider = payload.provider || settings.voiceConfig?.provider || "elevenlabs";
        const text = payload.text || "Fala devs! No vídeo de hoje vamos entender porque você deve parar de usar try/catch para tudo no JavaScript.";

        if (provider === "local") {
          const samplePath = settings.voiceConfig?.localSampleAudioPath || path.resolve(process.cwd(), "voice-lab", "amostra.wav");
          try {
            await fs.access(samplePath);
          } catch {
            throw new Error("Nenhuma amostra de voz encontrada. Grave e salve pelo menos 10 segundos no Gravador de Voz antes de testar a clonagem local.");
          }

          const { spawn } = await import("node:child_process");
          const tempOutput = path.resolve(process.cwd(), "voice-lab", `temp_clone_${Date.now()}.wav`);
          const permanentOutput = path.resolve(process.cwd(), "voice-lab", "sintese_gerada.wav");
          await fs.mkdir(path.dirname(tempOutput), { recursive: true });

          const devicePref = settings.voiceConfig?.devicePreference || "auto";
          const nfeSteps = String(settings.voiceConfig?.nfeSteps || 12);
          const scriptPath = path.resolve(process.cwd(), "scripts", "clone_voice_local.py");

          await new Promise<void>((resolve, reject) => {
            const proc = spawn("python", [
              scriptPath,
              "--output",
              tempOutput,
              "--text",
              text,
              "--sample",
              samplePath,
              "--device",
              devicePref,
              "--nfe",
              nfeSteps,
            ]);

            activeVoiceProcess = proc;

            let stderr = "";
            proc.stderr.on("data", (d) => { stderr += d.toString(); });
            proc.on("close", (code) => {
              activeVoiceProcess = null;
              if (isVoiceCancelled) {
                reject(new Error("CANCELLED_BY_USER"));
              } else if (code === 0) {
                resolve();
              } else {
                reject(new Error(stderr || `Processo de síntese encerrou com código ${code}`));
              }
            });
            proc.on("error", (err) => {
              activeVoiceProcess = null;
              if (isVoiceCancelled) {
                reject(new Error("CANCELLED_BY_USER"));
              } else {
                reject(err);
              }
            });
          });

          await fs.copyFile(tempOutput, permanentOutput);
          try { await fs.unlink(tempOutput); } catch {}

          const fileBuf = await fs.readFile(permanentOutput);
          const base64 = fileBuf.toString("base64");

          return {
            success: true,
            audioBase64: `data:audio/wav;base64,${base64}`,
          };
        }

        if (provider === "edge_tts") {
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);
          const tempOutput = path.resolve(process.cwd(), "voice-lab", `temp_test_${Date.now()}.mp3`);
          const permanentOutput = path.resolve(process.cwd(), "voice-lab", "sintese_gerada.mp3");
          await fs.mkdir(path.dirname(tempOutput), { recursive: true });

          const scriptPath = path.resolve(process.cwd(), "scripts", "synthesize_tts.py");
          await execFileAsync("python", [scriptPath, tempOutput, "pt-BR-AntonioNeural", text]);

          await fs.copyFile(tempOutput, permanentOutput);
          try { await fs.unlink(tempOutput); } catch {}

          const fileBuf = await fs.readFile(permanentOutput);
          const base64 = fileBuf.toString("base64");

          return {
            success: true,
            audioBase64: `data:audio/mp3;base64,${base64}`,
          };
        }

        // Modo ElevenLabs
        const apiKey = payload.apiKey || settings.voiceConfig?.elevenLabsApiKey;
        const voiceId = payload.voiceId || settings.voiceConfig?.elevenLabsVoiceId || "21m00Tcm4TlvDq8ikWAM";

        if (!apiKey) {
          throw new Error("Insira a sua API Key da ElevenLabs ou selecione o Modelo Local / Edge-TTS.");
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: "POST",
          headers: {
            "xi-api-key": apiKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: settings.voiceConfig?.stability ?? 0.35,
              similarity_boost: settings.voiceConfig?.similarityBoost ?? 0.80,
              style: 0.35,
              use_speaker_boost: true,
            },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          let friendlyMsg = errText;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.detail?.code === "paid_plan_required" || errJson.detail?.status === "payment_required") {
              friendlyMsg = "O plano Gratuito da ElevenLabs não permite vozes da biblioteca externa/clonadas via API. Clique em 'Atualizar Vozes da Conta' e selecione uma voz nativa da sua conta (ex: Adam, Antoni, Bella, George) ou use o provedor Edge-TTS (100% Gratuito e Ilimitado).";
            } else if (errJson.detail?.message) {
              friendlyMsg = errJson.detail.message;
            }
          } catch {}
          throw new Error(`Erro TTS ElevenLabs (${response.status}): ${friendlyMsg}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const permanentOutput = path.resolve(process.cwd(), "voice-lab", "sintese_gerada.mp3");
        await fs.mkdir(path.dirname(permanentOutput), { recursive: true });
        await fs.writeFile(permanentOutput, Buffer.from(arrayBuffer));

        const base64 = Buffer.from(arrayBuffer).toString("base64");

        return {
          success: true,
          audioBase64: `data:audio/mp3;base64,${base64}`,
        };
      } catch (error) {
        if (isVoiceCancelled || (error instanceof Error && error.message === "CANCELLED_BY_USER")) {
          return {
            success: false,
            cancelled: true,
            error: "Síntese interrompida pelo usuário.",
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao sintetizar áudio",
        };
      }
    }
  );

  // 11. Listar Vozes da ElevenLabs
  ipcMain.handle(
    "voice:list-elevenlabs-voices",
    async (_event, apiKey: string): Promise<{ success: boolean; voices?: { voice_id: string; name: string }[]; error?: string }> => {
      try {
        if (!apiKey) throw new Error("Chave da API não fornecida.");
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": apiKey.trim() },
        });

        if (!response.ok) throw new Error(`Erro ElevenLabs: ${response.status}`);
        const data = (await response.json()) as { voices: { voice_id: string; name: string }[] };
        return {
          success: true,
          voices: data.voices.map((v) => ({ voice_id: v.voice_id, name: v.name })),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Erro ao listar vozes",
        };
      }
    }
  );

  console.log("[settings] IPC de Configurações, E-mail, RAG e Voice Cloning registrado com sucesso.");
}
