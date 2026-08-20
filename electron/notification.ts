import { Notification, nativeImage, app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cachedAppIcon: Electron.NativeImage | undefined;

export function getAppIcon(): Electron.NativeImage | undefined {
  if (cachedAppIcon) return cachedAppIcon;

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
      cachedAppIcon = nativeImage.createFromPath(c);
      return cachedAppIcon;
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

    const icon = getAppIcon();
    const notif = new Notification({
      title: title || "Syrius Agent",
      body: body || "",
      icon: icon && !icon.isEmpty() ? icon : undefined,
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
