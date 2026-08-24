import {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  protocol,
  net,
  Menu,
  Tray,
} from "electron";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getAppIcon, getAppIconPath, sendNativeNotification } from "./notification.js";

// Desativa completamente o menu padrão (File, Edit, View, Window, Help)
Menu.setApplicationMenu(null);

// Registra privilégios para streaming de vídeo/áudio com requisições Range (play, pause, scrub)
protocol.registerSchemesAsPrivileged([
  {
    scheme: "media",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

// Define nome da aplicação e App User Model ID no Windows para notificações e barra de tarefas
app.name = "Syrius Agent";
if (process.platform === "win32") {
  app.setAppUserModelId("com.syrius.agent");
}

import {
  registerAgentIPC,
} from "./ipc/agent.js";

import {
  registerPostsIPC,
} from "./ipc/posts.js";

import {
  registerTestsIPC,
} from "./ipc/tests.js";

import {
  registerScheduleIPC,
} from "./ipc/schedule.js";

import {
  registerSettingsIPC,
} from "./ipc/settings.js";

import {
  registerAnalyticsIPC,
} from "./ipc/analytics.js";

import {
  registerInteractionsIPC,
} from "./ipc/interactions.js";

import {
  registerTrendingIPC,
} from "./ipc/trending.js";

import {
  registerGitHubIPC,
} from "./ipc/github.js";

import {
  registerExperimentsIPC,
} from "./ipc/experiments.js";

import {
  registerAgencyChatHandlers,
} from "./ipc/agency-chat.js";

import {
  startMediaServer,
} from "./media-server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createTray() {
  if (tray) return;

  const appIcon = getAppIcon();
  if (!appIcon) return;

  tray = new Tray(appIcon);
  tray.setToolTip("Syrius Agent • Autonomous Instagram Growth Engine");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir Syrius Agent",
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: "separator" },
    {
      label: "Status: Rodando em Segundo Plano",
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Sair do Aplicativo",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const iconPath = getAppIconPath();
  const appIcon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: iconPath || appIcon,
    minWidth: 1100,
    minHeight: 700,
    frame: false, // Janela Frameless customizada (Adeus barra cinza feia do Windows)
    autoHideMenuBar: true,
    backgroundColor: "#09090b",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (appIcon && !appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
  }

  // Notifica o renderer sobre mudanças de estado de maximização
  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send("window:maximized-change", true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send("window:maximized-change", false);
  });

  // Atalhos essenciais de desenvolvimento e diagnóstico (F12 para DevTools, F5 / Ctrl+R para recarregar)
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === "F5" || (input.control && input.key.toLowerCase() === "r")) {
      mainWindow?.reload();
      event.preventDefault();
    }
  });

  // Intercepta o fechamento para manter o app rodando silenciosamente na bandeja (System Tray)
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Blindagem de Segurança: Bloquear abertura de popups arbitrários e redirecionar links externos para o navegador padrão do SO
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Impedir redirecionamento ou navegação não autorizada para fora da aplicação
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);
      if (isDev && parsedUrl.origin === "http://localhost:5173") {
        return;
      }
      if (!isDev && parsedUrl.protocol === "file:") {
        return;
      }
    } catch {
      // url inválida
    }
    event.preventDefault();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Inicia servidor HTTP local de alta velocidade para streaming de mídias
  try {
    await startMediaServer();
  } catch (e) {
    console.warn("Aviso ao iniciar media server:", e);
  }

  // Protocolo customizado para streaming de vídeo (MP4) e áudio (MP3) locais com suporte a Seeking (HTTP 206)
  protocol.handle("media", (request) => {
    try {
      let raw = decodeURIComponent(request.url.replace(/^media:\/\//, ""));
      raw = raw.replace(/^local\//, "");

      // Normaliza caminhos no Windows (ex: "C/Users" -> "C:/Users", "/C:/Users" -> "C:/Users")
      if (/^[a-zA-Z]\//.test(raw)) {
        raw = raw[0] + ":" + raw.slice(1);
      } else if (/^\/[a-zA-Z]:/.test(raw)) {
        raw = raw.slice(1);
      } else if (/^\/[a-zA-Z]\//.test(raw)) {
        raw = raw[1] + ":" + raw.slice(2);
      }

      let resolvedPath = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(process.cwd(), raw);

      // Fallbacks inteligentes se for apenas o nome do arquivo
      if (!fs.existsSync(resolvedPath)) {
        const basename = path.basename(raw);
        const altVideo = path.resolve(process.cwd(), "output", "reels-video", basename);
        const altAudio = path.resolve(process.cwd(), "output", "reels-audio", basename);
        const altAgencyAudio = path.resolve(process.cwd(), "output", "audio", basename);
        if (fs.existsSync(altVideo)) resolvedPath = altVideo;
        else if (fs.existsSync(altAudio)) resolvedPath = altAudio;
        else if (fs.existsSync(altAgencyAudio)) resolvedPath = altAgencyAudio;
      }

      if (!fs.existsSync(resolvedPath)) {
        console.error(`[Media Protocol 404]: Arquivo não encontrado: ${request.url} -> ${resolvedPath}`);
        return new Response("Media file not found", { status: 404 });
      }

      return net.fetch(pathToFileURL(resolvedPath).toString());
    } catch (err) {
      console.error("[Media Protocol Error]:", err);
      return new Response("Failed to load media file", { status: 500 });
    }
  });

  createWindow();

  registerAgentIPC(
    () => mainWindow
  );

  registerPostsIPC(
    () => mainWindow
  );

  registerTestsIPC(
    () => mainWindow
  );

  registerScheduleIPC(
    () => mainWindow
  );

  registerSettingsIPC();

  registerAnalyticsIPC(
    () => mainWindow
  );

  registerInteractionsIPC();
  registerTrendingIPC();
  registerGitHubIPC();
  registerExperimentsIPC();
  registerAgencyChatHandlers(() => mainWindow);

  // Criação do System Tray
  createTray();

  // Handlers para controle customizado da janela (Frameless)
  ipcMain.handle("window:minimize", () => {
    mainWindow?.minimize();
    return true;
  });

  ipcMain.handle("window:toggle-maximize", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow?.unmaximize();
    } else {
      mainWindow?.maximize();
    }
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle("window:is-maximized", () => {
    return mainWindow?.isMaximized() ?? false;
  });

  ipcMain.handle("window:close", () => {
    if (!isQuitting) {
      mainWindow?.hide();
    } else {
      mainWindow?.close();
    }
    return true;
  });

  // Handler para disparar notificações nativas do SO
  ipcMain.handle("notification:send", (_event, payload: { title: string; body: string }) => {
    sendNativeNotification(payload?.title, payload?.body);
    return { success: true };
  });

  ipcMain.handle("app:open-external", async (_event, url: string) => {
    try {
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: "URL inválida ou insegura" };
    } catch (err: any) {
      return { success: false, error: err?.message || "Erro ao abrir link externo" };
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    // Mantém rodando no Tray; só fecha se for quitting explícito
    if (isQuitting) {
      app.quit();
    }
  }
});