import {
  BrowserWindow,
  ipcMain,
} from "electron";

import {
  spawn,
  type ChildProcess,
} from "node:child_process";

import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let agentProcess:
  | ChildProcess
  | null = null;

type AgentStage =
  | string
  | undefined;

/**
 * ==========================================
 * REGISTRO DO IPC DO AGENTE
 * ==========================================
 */

export function registerAgentIPC(
  getMainWindow: () => BrowserWindow | null
) {
  ipcMain.handle(
    "agent:run",
    async (
      _event,
      fromStage?: AgentStage,
      slot?: any
    ) => {
      /**
       * Impede duas execuções simultâneas.
       */

      if (agentProcess) {
        return {
          success: false,
          message:
            "O agente já está em execução.",
        };
      }

      console.log(
        "\n================================="
      );

      console.log(
        slot
          ? `🤖 PRODUZINDO SLOT SELECIONADO: ${slot.topic} (${slot.format})`
          : fromStage
          ? `🤖 REEXECUÇÃO A PARTIR DE: ${fromStage}`
          : "🤖 EXECUÇÃO SOLICITADA PELO DASHBOARD"
      );

      console.log(
        "=================================\n"
      );

      /**
       * ==========================================
       * RAIZ DO PROJETO
       * ==========================================
       */

      const projectRoot =
        path.resolve(
          __dirname,
          "..",
          "..",
          ".."
        );

      console.log(
        `📁 Projeto: ${projectRoot}`
      );

      /**
       * ==========================================
       * COMANDO
       * ==========================================
       */

      const isWindows =
        process.platform ===
        "win32";

      const command = isWindows
        ? "cmd.exe"
        : "npx";

      /**
       * IMPORTANTE:
       *
       * O agente recebe a etapa e slot
       * através de variáveis de ambiente.
       */

      const env = {
        ...process.env,

        ...(fromStage
          ? {
              AGENT_FROM_STAGE:
                fromStage,
            }
          : {
              AGENT_FROM_STAGE:
                "",
            }),

        ...(slot
          ? {
              AGENT_SLOT_JSON:
                JSON.stringify(slot),
            }
          : {
              AGENT_SLOT_JSON:
                "",
            }),
      };

      const args = isWindows
        ? [
            "/d",
            "/s",
            "/c",
            "npx tsx src/index.ts",
          ]
        : [
            "tsx",
            "src/index.ts",
          ];

      console.log(
        fromStage
          ? `🚀 Continuando a partir de: ${fromStage}`
          : "🚀 Executando pipeline completo"
      );

      /**
       * ==========================================
       * PROCESSO
       * ==========================================
       */

      agentProcess =
        spawn(
          command,
          args,
          {
            cwd: projectRoot,

            env,

            windowsHide: true,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          }
        );

      const processRef =
        agentProcess;

      if (!processRef) {
        throw new Error(
          "Não foi possível iniciar o processo do agente."
        );
      }

      /**
       * ==========================================
       * ENVIA LOG PARA O REACT
       * ==========================================
       */

      const sendLog = (
        type:
          | "info"
          | "success"
          | "warning"
          | "error",
        message: string
      ) => {
        const window =
          getMainWindow();

        if (
          !window ||
          window.isDestroyed()
        ) {
          return;
        }

        window.webContents.send(
          "agent:log",
          {
            type,
            message,
          }
        );
      };

      /**
       * ==========================================
       * STDOUT
       * ==========================================
       */

      if (processRef.stdout) {
        processRef.stdout.on(
          "data",
          (data: Buffer) => {
            const message =
              data.toString();

            process.stdout.write(
              message
            );

            sendLog(
              "info",
              message
            );
          }
        );
      }

      /**
       * ==========================================
       * STDERR
       * ==========================================
       */

      if (processRef.stderr) {
        processRef.stderr.on(
          "data",
          (data: Buffer) => {
            const message =
              data.toString();

            process.stderr.write(
              message
            );

            const isWarning =
              message.includes("Tentando novamente") ||
              message.includes("Aviso:") ||
              message.includes("⚠️") ||
              message.includes("ExperimentalWarning") ||
              message.includes("DeprecationWarning");

            sendLog(
              isWarning ? "warning" : "error",
              message
            );
          }
        );
      }

      /**
       * ==========================================
       * FINALIZAÇÃO
       * ==========================================
       */

      return await new Promise(
        (resolve) => {
          let finished =
            false;

          const finish = (
            result: {
              success: boolean;
              message: string;
            }
          ) => {
            if (finished) {
              return;
            }

            finished = true;

            agentProcess =
              null;

            resolve(result);
          };

          processRef.once(
            "close",
            (code) => {
              if (code === 0) {
                sendLog(
                  "success",
                  "✅ Pipeline concluído com sucesso."
                );

                finish({
                  success: true,
                  message:
                    "Pipeline concluído com sucesso.",
                });

                return;
              }

              sendLog(
                "error",
                `❌ Agente encerrado com código ${code}.`
              );

              finish({
                success: false,
                message:
                  `Agente encerrado com código ${code}.`,
              });
            }
          );

          processRef.once(
            "error",
            (error) => {
              console.error(
                "❌ Erro ao iniciar agente:",
                error
              );

              sendLog(
                "error",
                `❌ Erro ao iniciar agente: ${error.message}`
              );

              finish({
                success: false,
                message:
                  error.message,
              });
            }
          );
        }
      );
    }
  );

  ipcMain.handle("agent:stop", async () => {
    if (!agentProcess) {
      return { success: true, message: "Nenhum agente em execução." };
    }

    try {
      console.log("🛑 Cancelamento de execução solicitado pelo usuário...");
      if (process.platform === "win32" && agentProcess.pid) {
        spawn("taskkill", ["/pid", agentProcess.pid.toString(), "/f", "/t"]);
      } else {
        agentProcess.kill("SIGKILL");
      }
      agentProcess = null;

      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send("agent:log", {
          type: "warning",
          message: "🛑 Execução cancelada pelo usuário.",
          timestamp: new Date().toLocaleTimeString("pt-BR"),
        });
      }

      return { success: true, message: "Execução do agente cancelada com sucesso." };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : "Erro ao cancelar agente." };
    }
  });
}