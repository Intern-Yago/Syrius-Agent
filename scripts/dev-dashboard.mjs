import { spawn, execSync } from "node:child_process";
import readline from "node:readline";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let qrcodeTerminal = null;
try {
  qrcodeTerminal = require("./mobile/node_modules/qrcode-terminal");
} catch {}

function getLocalIp() {
  const nets = os.networkInterfaces();
  // 1. Prioriza interfaces físicas reais (Ethernet, Wi-Fi, sem virtual/wsl/docker)
  for (const name of Object.keys(nets)) {
    if (/vEthernet|virtual|wsl|loopback|docker/i.test(name)) continue;
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// Cores ANSI
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const BG_BLUE = "\x1b[44m";
const BG_CYAN = "\x1b[46m";
const BG_DARK = "\x1b[48;5;236m";
const FG_WHITE = "\x1b[97m";
const FG_CYAN = "\x1b[36m";
const FG_BLUE = "\x1b[34m";
const FG_MAGENTA = "\x1b[35m";
const FG_GREEN = "\x1b[32m";
const FG_YELLOW = "\x1b[33m";
const FG_RED = "\x1b[31m";
const FG_GRAY = "\x1b[90m";

const TABS = [
  { id: "all", label: "0. GERAL", title: "Todos os Processos", color: FG_CYAN },
  { id: "electron", label: "1. ELECTRON", title: "Electron (Main / IPC / API Gateway)", color: FG_BLUE },
  { id: "desktop", label: "2. DESKTOP_UI", title: "Desktop UI (Vite + React)", color: FG_CYAN },
  { id: "mobile", label: "3. EXPO_MOBILE", title: "Expo Mobile (Metro / React Native)", color: FG_MAGENTA },
];

let activeTabIndex = 0;
const MAX_LOGS = 3000;

const logBuffers = {
  all: [],
  electron: [],
  desktop: [],
  mobile: [],
};

const processes = {
  electron: { name: "ELECTRON", status: "Iniciando...", color: FG_BLUE, child: null, port: 3001 },
  desktop: { name: "DESKTOP_UI", status: "Iniciando...", color: FG_CYAN, child: null, port: 5173 },
  mobile: { name: "EXPO_MOBILE", status: "Iniciando...", color: FG_MAGENTA, child: null, port: 8081 },
};

let isShuttingDown = false;

function formatTimestamp() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// Libera portas no Windows antes de iniciar
function freePort(port) {
  if (process.platform !== "win32") return;
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const lines = output.split("\n").filter((l) => l.includes("LISTENING"));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(Number(pid)) && Number(pid) > 0) {
        execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
      }
    }
  } catch {}
}

function isQRLine(text) {
  return /[\u2580-\u259F\u2588\u2584\u2580]/.test(text) || text.includes("exp://") || text.includes("Scan the QR code") || text.includes("Metro waiting on");
}

function pushLog(source, rawText) {
  if (isShuttingDown) return;
  const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const time = formatTimestamp();

  for (const line of lines) {
    if (source === "desktop" && line.includes("5173")) {
      processes.desktop.status = `${FG_GREEN}Online (5173)${RESET}`;
    }
    if (source === "electron" && (line.includes("3001") || line.includes("ativo"))) {
      processes.electron.status = `${FG_GREEN}Online (3001)${RESET}`;
    }
    if (source === "mobile" && (line.includes("8081") || line.includes("Waiting on") || line.includes("Logs for your project"))) {
      processes.mobile.status = `${FG_GREEN}Online (8081)${RESET}`;
    }

    const logItem = {
      source,
      time,
      text: line,
    };

    if (logBuffers[source]) {
      logBuffers[source].push(logItem);
      if (logBuffers[source].length > MAX_LOGS) logBuffers[source].shift();
    }

    logBuffers.all.push(logItem);
    if (logBuffers.all.length > MAX_LOGS) logBuffers.all.shift();

    const activeTab = TABS[activeTabIndex];
    if (activeTab.id === "all" || activeTab.id === source) {
      printLogLine(logItem);
    }
  }
}

function printLogLine(item) {
  if (isQRLine(item.text)) {
    // Linha de QR Code / Link direto do Expo Go — imprime sem prefixos que quebram o alinhamento
    process.stdout.write(`${item.text}\n`);
    return;
  }

  const sourceColor =
    item.source === "electron" ? FG_BLUE : item.source === "desktop" ? FG_CYAN : FG_MAGENTA;
  const sourceTag = item.source.toUpperCase().padEnd(9, " ");
  process.stdout.write(
    `${FG_GRAY}[${item.time}]${RESET} ${sourceColor}${BOLD}[${sourceTag}]${RESET} ${item.text}\n`
  );
}

function renderBottomBar() {
  const width = Math.min(process.stdout.columns || 100, 100);
  const divider = "─".repeat(width);

  console.log(`\n${FG_GRAY}${divider}${RESET}`);

  // Status dos 3 processos
  const statusElectron = `${FG_BLUE}● ELECTRON: ${processes.electron.status}${RESET}`;
  const statusDesktop = `${FG_CYAN}● DESKTOP_UI: ${processes.desktop.status}${RESET}`;
  const statusMobile = `${FG_MAGENTA}● EXPO_MOBILE: ${processes.mobile.status}${RESET}`;
  console.log(` ${statusElectron}   │   ${statusDesktop}   │   ${statusMobile}`);

  // Abas de navegação
  let tabsRender = " ";
  TABS.forEach((tab, idx) => {
    const isSelected = idx === activeTabIndex;
    if (isSelected) {
      tabsRender += `${BG_BLUE}${FG_WHITE}${BOLD}  ► ${tab.label} ◄  ${RESET}  `;
    } else {
      tabsRender += `${BG_DARK}${FG_GRAY}  ${tab.label}  ${RESET}  `;
    }
  });

  console.log(tabsRender);
  console.log(
    `${FG_GRAY} [←/→/0-3] Abas  │  [R] Recarregar Mobile  │  [J] JS Debugger  │  [M] Dev Menu  │  [C] Limpar  │  [Q] Sair${RESET}`
  );
  console.log(`${FG_GRAY}${divider}${RESET}\n`);
}

function switchTab(newIndex) {
  activeTabIndex = (newIndex + TABS.length) % TABS.length;
  console.clear();

  const activeTab = TABS[activeTabIndex];
  console.log(
    `${FG_CYAN}${BOLD}🌌 SYRIUS AGENT — MODO DE VISUALIZAÇÃO: ${activeTab.color}${activeTab.title.toUpperCase()}${RESET}`
  );
  console.log(`${FG_GRAY}Rolagem livre com mouse/teclado ativada. Pressione as setas ou 0-3 para alternar.${RESET}\n`);

  // Imprime os últimos logs da aba selecionada
  const logs = logBuffers[activeTab.id] || [];
  const recentLogs = logs.slice(Math.max(0, logs.length - 80));
  for (const item of recentLogs) {
    printLogLine(item);
  }

  renderBottomBar();
}

// Inicia processos
function startProcesses() {
  const isWin = process.platform === "win32";
  const npmCmd = isWin ? "npm.cmd" : "npm";

  // Libera porta 8081 antes de iniciar o Metro Bundler
  freePort(8081);

  // 1. Desktop UI (Vite)
  const desktopProc = spawn(npmCmd, ["run", "dev:renderer"], {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  processes.desktop.child = desktopProc;

  desktopProc.stdout.on("data", (d) => pushLog("desktop", d.toString()));
  desktopProc.stderr.on("data", (d) => pushLog("desktop", d.toString()));
  desktopProc.on("exit", (code) => {
    processes.desktop.status = `${FG_RED}Finalizado (${code})${RESET}`;
    pushLog("desktop", `Processo Vite encerrado com código ${code}`);
  });

  // 2. Electron (Main & API Gateway)
  const electronProc = spawn(npmCmd, ["run", "dev:electron"], {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  processes.electron.child = electronProc;

  electronProc.stdout.on("data", (d) => pushLog("electron", d.toString()));
  electronProc.stderr.on("data", (d) => pushLog("electron", d.toString()));
  electronProc.on("exit", (code) => {
    processes.electron.status = `${FG_RED}Finalizado (${code})${RESET}`;
    pushLog("electron", `Processo Electron encerrado com código ${code}`);
  });

  // 3. Mobile (Expo Metro)
  const mobileProc = spawn(npmCmd, ["--prefix", "mobile", "run", "start", "--", "--host", "lan", "--port", "8081"], {
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  processes.mobile.child = mobileProc;

  // Imprime imediatamente o banner de conexão do Expo Go com o IP Local e QR Code
  printExpoConnectionBanner();

  mobileProc.stdout.on("data", (d) => pushLog("mobile", d.toString()));
  mobileProc.stderr.on("data", (d) => pushLog("mobile", d.toString()));
  mobileProc.on("exit", (code) => {
    processes.mobile.status = `${FG_RED}Finalizado (${code})${RESET}`;
    pushLog("mobile", `Processo Expo encerrado com código ${code}`);
  });
}

function printExpoConnectionBanner() {
  const ip = getLocalIp();
  const expoUrl = `exp://${ip}:8081`;

  pushLog("mobile", `${BG_BLUE}${FG_WHITE}${BOLD} 📱 SYRIUS MOBILE — CONEXÃO DIRETA COM O EXPO GO ${RESET}`);
  pushLog("mobile", `${FG_CYAN}${BOLD}● Endereço do Servidor:${RESET} ${FG_WHITE}${expoUrl}${RESET}`);
  pushLog("mobile", `${FG_YELLOW}● Escaneie o QR Code abaixo com o app Expo Go (Android) ou Câmera (iOS):${RESET}\n`);

  if (qrcodeTerminal) {
    qrcodeTerminal.generate(expoUrl, { small: true }, (qrcodeStr) => {
      const qrLines = qrcodeStr.split("\n");
      for (const qLine of qrLines) {
        pushLog("mobile", qLine);
      }
    });
  } else {
    pushLog("mobile", `Abra o aplicativo Expo Go no celular e digite: ${expoUrl}`);
  }

  pushLog("mobile", `${FG_GRAY}────────────────────────────────────────────────────────────────${RESET}\n`);
}

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${FG_YELLOW}🛑 Encerrando todos os processos (Electron, Vite, Expo Metro)...${RESET}`);

  for (const key of Object.keys(processes)) {
    const p = processes[key];
    if (p.child && !p.child.killed) {
      if (process.platform === "win32" && p.child.pid) {
        try {
          spawn("taskkill", ["/pid", String(p.child.pid), "/T", "/F"], { stdio: "ignore" });
        } catch {}
      } else {
        try {
          p.child.kill("SIGTERM");
        } catch {}
      }
    }
  }

  setTimeout(() => {
    process.exit(0);
  }, 400);
}

// Configuração de entrada do teclado
function setupKeyboardInput() {
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  const sendToExpo = (char, desc) => {
    if (processes.mobile.child && processes.mobile.child.stdin && !processes.mobile.child.stdin.destroyed) {
      try {
        processes.mobile.child.stdin.write(char + "\n");
        pushLog("mobile", `${FG_MAGENTA}${BOLD}📱 [Expo Shortcut] ${desc}${RESET}`);
      } catch (err) {
        console.error("Erro ao enviar comando para o Expo:", err);
      }
    }
  };

  process.stdin.on("keypress", (str, key) => {
    if (!key) return;

    if ((key.ctrl && key.name === "c") || key.name === "q") {
      shutdown();
      return;
    }

    // Atalhos Expo Mobile
    if (key.name === "r" || str === "r" || str === "R") {
      sendToExpo("r", "Recarregando aplicativo em todos os dispositivos conectados (Reload)...");
      return;
    }

    if (key.name === "j" || str === "j" || str === "J") {
      sendToExpo("j", "Abrindo JS Debugger / Chrome DevTools no navegador...");
      return;
    }

    if (key.name === "m" || str === "m" || str === "M") {
      sendToExpo("m", "Abrindo Developer Menu na tela do smartphone...");
      return;
    }

    if (key.name === "a" || str === "a" || str === "A") {
      sendToExpo("a", "Conectando ao emulador Android...");
      return;
    }

    if (key.name === "i" || str === "i" || str === "I") {
      sendToExpo("i", "Conectando ao simulador iOS...");
      return;
    }

    // Navegação entre abas de logs do dashboard
    if (key.name === "left") {
      switchTab(activeTabIndex - 1);
      return;
    }

    if (key.name === "right" || key.name === "tab") {
      switchTab(activeTabIndex + 1);
      return;
    }

    if (str === "0") {
      switchTab(0);
      return;
    }
    if (str === "1") {
      switchTab(1);
      return;
    }
    if (str === "2") {
      switchTab(2);
      return;
    }
    if (str === "3") {
      switchTab(3);
      return;
    }

    if (key.name === "c") {
      logBuffers[TABS[activeTabIndex].id] = [];
      console.clear();
      renderBottomBar();
      return;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.clear();
console.log(`${FG_CYAN}${BOLD}🌌 INICIANDO SYRIUS AGENT — DASHBOARD COM ROLAGEM NATIVA DO TERMINAL${RESET}`);
console.log(`${FG_GRAY}Rolagem livre com mouse/teclado ativada. Use as setas ← / → para filtrar os processos.${RESET}\n`);
renderBottomBar();

startProcesses();
setupKeyboardInput();
