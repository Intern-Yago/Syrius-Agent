import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface CacheEntry<T = any> {
  hash: string;
  model: string;
  response: T;
  createdAt: number;
  expiresAt: number;
}

const CACHE_DIR = path.resolve(process.cwd(), "output", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "ai-prompt-cache.json");

class PromptCacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private isLoaded = false;

  private generateHash(prompt: string, model: string): string {
    const normalized = `${model}:::${prompt.trim().toLowerCase()}`;
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  private async loadDiskCache(): Promise<void> {
    if (this.isLoaded) return;
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const data = await fs.readFile(CACHE_FILE, "utf-8");
      const parsed: Record<string, CacheEntry> = JSON.parse(data);
      const now = Date.now();

      for (const [key, entry] of Object.entries(parsed)) {
        if (entry.expiresAt > now) {
          this.memoryCache.set(key, entry);
        }
      }
    } catch {
      // Arquivo inexistente ou corrompido, inicia vazio
    } finally {
      this.isLoaded = true;
    }
  }

  private async saveDiskCache(): Promise<void> {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const obj: Record<string, CacheEntry> = {};
      const now = Date.now();

      // Mantém no máximo 500 entradas mais recentes para não inflar disco
      const entries = Array.from(this.memoryCache.entries())
        .filter(([_, v]) => v.expiresAt > now)
        .slice(-500);

      for (const [k, v] of entries) {
        obj[k] = v;
      }

      await fs.writeFile(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
    } catch (err) {
      console.warn("[PromptCache] Aviso ao salvar cache em disco:", err);
    }
  }

  public async get<T>(prompt: string, model: string): Promise<T | null> {
    await this.loadDiskCache();
    const hash = this.generateHash(prompt, model);
    const entry = this.memoryCache.get(hash);

    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(hash);
      return null;
    }

    return entry.response as T;
  }

  public async set<T>(prompt: string, model: string, response: T, ttlMinutes = 1440): Promise<void> {
    await this.loadDiskCache();
    const hash = this.generateHash(prompt, model);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      hash,
      model,
      response,
      createdAt: now,
      expiresAt: now + ttlMinutes * 60 * 1000,
    };

    this.memoryCache.set(hash, entry);
    // Salva em background assíncrono
    this.saveDiskCache().catch(() => {});
  }

  public async clear(): Promise<void> {
    this.memoryCache.clear();
    try {
      await fs.rm(CACHE_FILE, { force: true });
    } catch {}
  }
}

export const promptCache = new PromptCacheManager();
