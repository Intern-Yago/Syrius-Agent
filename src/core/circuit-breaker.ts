export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit Breaker para Provedores de IA:
 * Protege o sistema contra loops de falha e cascatas de erros quando o provedor externo
 * sofrer quedas, sobrecargas ou bloqueios temporários.
 */
class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private maxFailures = 4;
  private resetTimeoutMs = 25000; // 25 segundos para testar recuperação (HALF_OPEN)
  private lastFailureTime = 0;

  public canExecute(): boolean {
    if (this.state === "CLOSED") return true;

    if (this.state === "OPEN") {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        console.log("[CircuitBreaker] Estado transicionado para HALF_OPEN. Testando recuperação da API...");
        return true;
      }
      return false;
    }

    return true; // HALF_OPEN permite 1 tentativa de teste
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    if (this.state !== "CLOSED") {
      this.state = "CLOSED";
      console.log("[CircuitBreaker] Serviço recuperado com sucesso. Disjuntor fechado (CLOSED).");
    }
  }

  public recordFailure(err: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    // Abre apenas após falhas repetidas (permitindo chave 2 e modelos de fallback tentarem)
    if (this.failureCount >= 3) {
      this.state = "OPEN";
      console.warn(`[CircuitBreaker] DISJUNTOR ABERTO (OPEN) após ${this.failureCount} falhas. Protegendo o sistema por ${this.resetTimeoutMs / 1000}s.`);
    }
  }

  public getState(): CircuitState {
    return this.state;
  }
}

export const aiCircuitBreaker = new CircuitBreaker();
