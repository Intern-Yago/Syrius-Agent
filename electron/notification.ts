import { Notification, nativeImage, app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedAppIcon: Electron.NativeImage | undefined;
let cachedAppIconPath: string | undefined;

export function getAppIconPath(): string | undefined {
  if (cachedAppIconPath && fs.existsSync(cachedAppIconPath)) return cachedAppIconPath;

  const appPath = app?.isPackaged ? path.dirname(app.getPath("exe")) : (app ? app.getAppPath() : process.cwd());

  const isWin = process.platform === "win32";

  const candidates = [
    ...(isWin ? [
      path.join(process.cwd(), "electron", "assets", "icon.ico"),
      path.join(process.cwd(), "dist-electron", "assets", "icon.ico"),
      path.join(appPath, "electron", "assets", "icon.ico"),
      path.join(appPath, "dist-electron", "assets", "icon.ico"),
      path.join(__dirname, "..", "assets", "icon.ico"),
      path.join(__dirname, "assets", "icon.ico"),
    ] : []),
    path.join(process.cwd(), "electron", "assets", "logo.png"),
    path.join(process.cwd(), "electron", "assets", "icon.png"),
    path.join(process.cwd(), "dist-electron", "assets", "logo.png"),
    path.join(process.cwd(), "dist-electron", "assets", "icon.png"),
    path.join(appPath, "electron", "assets", "logo.png"),
    path.join(appPath, "electron", "assets", "icon.png"),
    path.join(appPath, "dist-electron", "assets", "logo.png"),
    path.join(appPath, "dist-electron", "assets", "icon.png"),
    path.join(__dirname, "..", "assets", "logo.png"),
    path.join(__dirname, "..", "assets", "icon.png"),
    path.join(__dirname, "..", "..", "electron", "assets", "logo.png"),
    path.join(__dirname, "..", "..", "electron", "assets", "icon.png"),
    path.join(__dirname, "assets", "logo.png"),
    path.join(__dirname, "assets", "icon.png"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      cachedAppIconPath = path.resolve(c);
      return cachedAppIconPath;
    }
  }
  return undefined;
}

export function getAppIcon(): Electron.NativeImage | undefined {
  if (cachedAppIcon && !cachedAppIcon.isEmpty()) return cachedAppIcon;
  const iconPath = getAppIconPath();
  if (iconPath) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      cachedAppIcon = img;
      return cachedAppIcon;
    }
  }

  // Fallback direto para o PNG em disco
  const fallbackPaths = [
    path.join(process.cwd(), "electron", "assets", "icon.png"),
    path.join(process.cwd(), "electron", "assets", "logo.png"),
    path.join(process.cwd(), "dist-electron", "assets", "icon.png"),
    path.join(__dirname, "..", "assets", "icon.png"),
    path.join(__dirname, "assets", "icon.png"),
  ];

  for (const fp of fallbackPaths) {
    if (fs.existsSync(fp)) {
      const img = nativeImage.createFromPath(fp);
      if (!img.isEmpty()) {
        cachedAppIcon = img;
        return cachedAppIcon;
      }
    }
  }

  return undefined;
}

/**
 * Dispara uma notificação nativa do Windows/macOS/Linux.
 * Se o app estiver minimizado, em segundo plano ou no System Tray,
 * a notificação aparece no canto da tela do sistema operacional.
 */
export function sendNativeNotification(title: string, body: string, onClick?: () => void): void {
  try {
    if (!Notification.isSupported()) {
      console.log(`[Notification Fallback]: ${title} - ${body}`);
      return;
    }

    const iconPath = getAppIconPath();
    const iconImage = getAppIcon();

    const notif = new Notification({
      title: title || "Syrius Agent",
      body: body || "",
      icon: iconPath || (iconImage && !iconImage.isEmpty() ? iconImage : undefined),
      silent: false,
    });

    notif.on("click", () => {
      const windows = BrowserWindow.getAllWindows();
      if (windows.length > 0) {
        const win = windows[0];
        if (win.isMinimized()) win.restore();
        if (!win.isVisible()) win.show();
        win.focus();
      }
      if (onClick) onClick();
    });

    notif.show();
  } catch (err) {
    console.warn("[Notification Error]:", err);
  }
}
