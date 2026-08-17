import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
} from "electron";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Define o App User Model ID no Windows para garantir que o ícone na barra de tarefas seja o customizado
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;

let mainWindow:
  | BrowserWindow
  | null = null;

function getAppIcon() {
  const candidates = [
    path.join(__dirname, "..", "electron", "assets", "icon.png"),
    path.join(__dirname, "..", "electron", "assets", "logo.png"),
    path.join(__dirname, "assets", "icon.png"),
    path.join(__dirname, "assets", "logo.png"),
    path.join(process.cwd(), "electron", "assets", "icon.png"),
    path.join(process.cwd(), "electron", "assets", "logo.png"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return nativeImage.createFromPath(c);
    }
  }
  return undefined;
}

function createWindow() {
  const appIcon = getAppIcon();

  mainWindow =
    new BrowserWindow({
      width: 1400,
      height: 900,
      icon: appIcon,

      minWidth: 1100,
      minHeight: 700,

      backgroundColor:
        "#09090b",

      webPreferences: {
        preload:
          path.join(
            __dirname,
            "preload.cjs"
          ),

        contextIsolation: true,

        nodeIntegration: false,
      },
    });

  if (appIcon && !appIcon.isEmpty()) {
    mainWindow.setIcon(appIcon);
  }

  if (isDev) {
    mainWindow.loadURL(
      "http://localhost:5173"
    );
  } else {
    mainWindow.loadFile(
      path.join(
        __dirname,
        "renderer",
        "index.html"
      )
    );
  }

  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    }
  );
}

app.whenReady().then(() => {
  createWindow();

  registerAgentIPC(
    () => mainWindow
  );

  registerPostsIPC();

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

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !==
      "darwin"
    ) {
      app.quit();
    }
  }
);