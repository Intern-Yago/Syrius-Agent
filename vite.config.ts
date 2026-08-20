import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

function localMediaMiddlewarePlugin() {
  return {
    name: "local-media-middleware",
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url || "";
        if (url.startsWith("/video/") || url.startsWith("/audio/") || url.startsWith("/media/")) {
          const cleanPath = decodeURIComponent(url.replace(/^\/(video|audio|media)\//, ""));
          let resolved = path.isAbsolute(cleanPath)
            ? cleanPath
            : path.resolve(process.cwd(), cleanPath);

          if (!fs.existsSync(resolved)) {
            const basename = path.basename(cleanPath);
            const candVideo = path.resolve(process.cwd(), "output", "reels-video", basename);
            const candAudio = path.resolve(process.cwd(), "output", "reels-audio", basename);
            if (fs.existsSync(candVideo)) resolved = candVideo;
            else if (fs.existsSync(candAudio)) resolved = candAudio;
          }

          if (fs.existsSync(resolved)) {
            const stat = fs.statSync(resolved);
            const fileSize = stat.size;
            const range = req.headers.range;
            const contentType = resolved.endsWith(".mp4") ? "video/mp4" : "audio/mpeg";

            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Accept-Ranges", "bytes");

            if (range) {
              const parts = range.replace(/bytes=/, "").split("-");
              const start = parseInt(parts[0], 10);
              const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
              const chunksize = end - start + 1;
              const file = fs.createReadStream(resolved, { start, end });
              res.writeHead(206, {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Content-Length": chunksize,
                "Content-Type": contentType,
              });
              file.pipe(res);
              return;
            } else {
              res.writeHead(200, {
                "Content-Length": fileSize,
                "Content-Type": contentType,
              });
              fs.createReadStream(resolved).pipe(res);
              return;
            }
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localMediaMiddlewarePlugin()],
  root: "electron/renderer",
  build: {
    outDir: "../../dist/renderer",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});