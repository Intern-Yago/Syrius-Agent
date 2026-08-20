/**
 * Limitador de Concorrência e Fila Global de Requisições:
 * Garante que nunca existam mais de 2 chamadas simultâneas ativas na API de IA,
 * enfileirando requisições paralelas e aplicando espaçamento seguro para evitar HTTP 429.
 */
class GlobalQueueLimiter {
  private maxConcurrent = 2;
  private minIntervalMs = 150;
  private runningCount = 0;
  private queue: Array<() => Promise<void>> = [];
  private lastExecutionTime = 0;

  public async run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const executeTask = async () => {
        this.runningCount++;
        try {
          // Espaçamento mínimo para proteger RPM
          const now = Date.now();
          const elapsed = now - this.lastExecutionTime;
          if (elapsed < this.minIntervalMs) {
            await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
          }
          this.lastExecutionTime = Date.now();

          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.runningCount--;
          this.processNext();
        }
      };

      if (this.runningCount < this.maxConcurrent) {
        executeTask();
      } else {
        this.queue.push(executeTask);
      }
    });
  }

  private processNext(): void {
    if (this.queue.length > 0 && this.runningCount < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  public getStats(): { running: number; queued: number } {
    return {
      running: this.runningCount,
      queued: this.queue.length,
    };
  }
}

export const globalAiLimiter = new GlobalQueueLimiter();
