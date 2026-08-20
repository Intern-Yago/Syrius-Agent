import http from "node:http";
import fs from "node:fs";
import path from "node:path";

let serverPort = 0;
let mediaServer: http.Server | null = null;

export function startMediaServer(): Promise<number> {
  if (serverPort > 0) return Promise.resolve(serverPort);

  return new Promise((resolve, reject) => {
    mediaServer = http.createServer((req, res) => {
      // Headers de CORS para permitir requisições do frontend Vite/Electron
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const parsedUrl = new URL(req.url || "/", `http://127.0.0.1:${serverPort}`);
        const cleanPath = decodeURIComponent(
          parsedUrl.pathname.replace(/^\/(media|video|audio|images|image)\//, "").replace(/^\//, "")
        );

        let resolvedPath = path.isAbsolute(cleanPath)
          ? path.resolve(cleanPath)
          : path.resolve(process.cwd(), cleanPath);

        // Fallbacks inteligentes locais
        if (!fs.existsSync(resolvedPath)) {
          const basename = path.basename(cleanPath);
          const altVideo = path.resolve(process.cwd(), "output", "reels-video", basename);
          const altAudio = path.resolve(process.cwd(), "output", "reels-audio", basename);
          const altImages = path.resolve(process.cwd(), "output", "images", cleanPath);
          const altImagesBase = path.resolve(process.cwd(), "output", "images", basename);
          const altVoiceLab = path.resolve(process.cwd(), "voice-lab", basename);

          if (fs.existsSync(altVideo)) resolvedPath = altVideo;
          else if (fs.existsSync(altAudio)) resolvedPath = altAudio;
          else if (fs.existsSync(altImages)) resolvedPath = altImages;
          else if (fs.existsSync(altImagesBase)) resolvedPath = altImagesBase;
          else if (fs.existsSync(altVoiceLab)) resolvedPath = altVoiceLab;
        }

        if (!fs.existsSync(resolvedPath)) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end(`Media not found: ${cleanPath}`);
          return;
        }

        const stat = fs.statSync(resolvedPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const isMp4 = resolvedPath.endsWith(".mp4");
        const isMp3 = resolvedPath.endsWith(".mp3") || resolvedPath.endsWith(".wav");
        const isPng = resolvedPath.endsWith(".png");
        const isJpg = resolvedPath.endsWith(".jpg") || resolvedPath.endsWith(".jpeg");
        const isWebp = resolvedPath.endsWith(".webp");

        let contentType = "application/octet-stream";
        if (isMp4) contentType = "video/mp4";
        else if (isMp3) contentType = resolvedPath.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
        else if (isPng) contentType = "image/png";
        else if (isJpg) contentType = "image/jpeg";
        else if (isWebp) contentType = "image/webp";

        // Suporte total a Range Requests (HTTP 206) para seek bar / timeline scrubbing
        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = end - start + 1;
          const file = fs.createReadStream(resolvedPath, { start, end });

          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": contentType,
          });
          file.pipe(res);
        } else {
          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
          });
          fs.createReadStream(resolvedPath).pipe(res);
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    });

    mediaServer.listen(0, "127.0.0.1", () => {
      const address = mediaServer!.address();
      if (address && typeof address === "object") {
        serverPort = address.port;
        console.log(`🎬 Local Media Server running on http://127.0.0.1:${serverPort}`);
        resolve(serverPort);
      } else {
        reject(new Error("Failed to get media server port"));
      }
    });

    mediaServer.on("error", (err) => {
      console.error("[Media Server Error]:", err);
      reject(err);
    });
  });
}

export function getMediaServerPort(): number {
  return serverPort;
}

export function getMediaUrl(filename: string): string {
  if (serverPort === 0) return "";
  const basename = path.basename(filename);
  return `http://127.0.0.1:${serverPort}/video/${basename}`;
}
