import { ipcMain, BrowserWindow } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface TestModuleInfo {
  id: string;
  filename: string;
  title: string;
  description: string;
  category: string;
}

export interface TestLogEntry {
  type: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
}

export interface TestRunResult {
  success: boolean;
  message?: string;
  duration?: string;
  logs?: TestLogEntry[];
}

let registered = false;
const runningProcesses = new Map<string, { proc: ChildProcess; startTime: number; logs: TestLogEntry[] }>();
const testLogsCache = new Map<string, TestLogEntry[]>();

function formatTitleFromFilename(filename: string): string {
  const base = filename.replace(/\.ts$/, "").replace(/^test-/, "");
  return base
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseTestDocstring(content: string, filename: string): { title: string; description: string; category: string } {
  let title = formatTitleFromFilename(filename);
  let description = `Executa o teste unitário de ${title}.`;
  let category = "Unit Test";

  const testInfoMatch = content.match(/export\s+const\s+testInfo\s*=\s*\{([^}]+)\}/s);
  if (testInfoMatch) {
    const block = testInfoMatch[1];
    const tMatch = block.match(/title:\s*["'`]([^"'`]+)["'`]/);
    const dMatch = block.match(/description:\s*["'`]([^"'`]+)["'`]/);
    const cMatch = block.match(/category:\s*["'`]([^"'`]+)["'`]/);
    if (tMatch) title = tMatch[1];
    if (dMatch) description = dMatch[1];
    if (cMatch) category = cMatch[1];
    return { title, description, category };
  }

  const jsdocMatch = content.match(/^\s*\/\*\*([\s\S]*?)\*\//);
  if (jsdocMatch) {
    const commentLines = jsdocMatch[1]
      .split("\n")
      .map((line) => line.replace(/^\s*\*\s?/, "").trim())
      .filter((line) => Boolean(line) && !line.startsWith("@"));

    const tagsMatchCategory = jsdocMatch[1].match(/@category\s+([^\n]+)/);
    const tagsMatchTitle = jsdocMatch[1].match(/@title\s+([^\n]+)/);
    const tagsMatchDesc = jsdocMatch[1].match(/@description\s+([^\n]+)/);

    if (tagsMatchTitle) title = tagsMatchTitle[1].trim();
    else if (commentLines.length > 0) title = commentLines[0];

    if (tagsMatchDesc) description = tagsMatchDesc[1].trim();
    else if (commentLines.length > 1) description = commentLines.slice(1).join(" ");
    else if (commentLines.length === 1 && !tagsMatchTitle) description = commentLines[0];

    if (tagsMatchCategory) category = tagsMatchCategory[1].trim();

    return { title, description, category };
  }

  return { title, description, category };
}

export function registerTestsIPC(getMainWindow: () => BrowserWindow | null) {
  if (registered) return;
  registered = true;

  const projectRoot = path.resolve(__dirname, "..", "..", "..");
  const testsDir = path.join(projectRoot, "src", "tests");

  // LISTAR TESTES AUTOMATICAMENTE
  ipcMain.handle("tests:list", async (): Promise<TestModuleInfo[]> => {
    try {
      const files = await fs.readdir(testsDir);
      const testFiles = files.filter((f) => f.startsWith("test-") && f.endsWith(".ts"));

      const modules: TestModuleInfo[] = [];

      for (const file of testFiles) {
        const filePath = path.join(testsDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const { title, description, category } = parseTestDocstring(content, file);

        modules.push({
          id: file.replace(/\.ts$/, ""),
          filename: file,
          title,
          description,
          category,
        });
      }

      return modules;
    } catch (err) {
      console.error("Erro ao listar testes unitários de src/tests:", err);
      return [];
    }
  });

  // OBTER LOGS SALVOS DE UM TESTE
  ipcMain.handle("tests:get-logs", async (_event, filename: string): Promise<TestLogEntry[]> => {
    return testLogsCache.get(filename) || [];
  });

  // CANCELAR TESTE EM EXECUÇÃO
  ipcMain.handle("tests:cancel", async (_event, filename: string): Promise<boolean> => {
    const running = runningProcesses.get(filename);
    if (running) {
      running.proc.kill();
      runningProcesses.delete(filename);
      return true;
    }
    return false;
  });

  // EXECUTAR UM TESTE ESPECÍFICO
  ipcMain.handle("tests:run", async (_event, filename: string): Promise<TestRunResult> => {
    if (runningProcesses.has(filename)) {
      return { success: false, message: "Este teste já está em execução." };
    }

    const testPath = `src/tests/${filename.endsWith(".ts") ? filename : `${filename}.ts`}`;
    const startTime = Date.now();
    const accumulatedLogs: TestLogEntry[] = [];

    const isWindows = process.platform === "win32";
    const command = isWindows ? "cmd.exe" : "npx";
    const args = isWindows ? ["/d", "/s", "/c", `npx tsx ${testPath}`] : ["tsx", testPath];

    const sendLog = (type: "info" | "success" | "warning" | "error", message: string) => {
      const entry: TestLogEntry = {
        type,
        message,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
      };
      accumulatedLogs.push(entry);
      testLogsCache.set(filename, [...accumulatedLogs]);

      const window = getMainWindow();
      if (!window || window.isDestroyed()) return;
      window.webContents.send("test:log", { filename, ...entry });
      window.webContents.send("agent:log", { type, message });
    };

    sendLog("info", `🧪 =========================================`);
    sendLog("info", `🚀 INICIANDO TESTE: ${filename}`);
    sendLog("info", `🧪 =========================================\n`);

    const proc = spawn(command, args, {
      cwd: projectRoot,
      env: process.env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    runningProcesses.set(filename, { proc, startTime, logs: accumulatedLogs });

    // Notifica início
    const window = getMainWindow();
    if (window && !window.isDestroyed()) {
      window.webContents.send("test:status-change", {
        filename,
        status: "running",
        runningCount: runningProcesses.size,
      });
    }

    if (proc.stdout) {
      proc.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        process.stdout.write(text);
        sendLog("info", text);
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        process.stderr.write(text);
        sendLog("error", text);
      });
    }

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (result: TestRunResult) => {
        if (resolved) return;
        resolved = true;
        runningProcesses.delete(filename);

        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send("test:status-change", {
            filename,
            status: result.success ? "success" : "error",
            duration: result.duration,
            runningCount: runningProcesses.size,
          });
        }

        resolve({
          ...result,
          logs: accumulatedLogs,
        });
      };

      proc.once("close", (code) => {
        const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
        if (code === 0) {
          sendLog("success", `\n✅ Teste "${filename}" finalizado com SUCESSO em ${duration}.`);
          finish({ success: true, duration });
        } else {
          sendLog("error", `\n❌ Teste "${filename}" falhou (código de saída ${code}).`);
          finish({ success: false, message: `Falha no teste com código ${code}`, duration });
        }
      });

      proc.once("error", (err) => {
        sendLog("error", `\n❌ Erro ao disparar processo do teste: ${err.message}`);
        finish({ success: false, message: err.message });
      });
    });
  });

  console.log("[tests] IPC de testes dinâmicos com streaming de logs registrado.");
}
