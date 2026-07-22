export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions<T> {
  failureThreshold: number; // Number of failures before tripping OPEN
  recoveryTimeout: number; // Cooldown time in ms before transitioning to HALF_OPEN
  successThreshold: number; // Number of successes needed to close the circuit
  timeoutMs: number; // Timeout for individual request
  fallbackValue: T | (() => T);
}

export class CircuitBreaker<T> {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange: number = Date.now();

  constructor(
    private name: string,
    private requestFn: (...args: any[]) => Promise<T>,
    private options: CircuitBreakerOptions<T>
  ) {}

  async execute(...args: any[]): Promise<T> {
    const now = Date.now();

    // Check if cooldown elapsed in OPEN state
    if (this.state === "OPEN" && now - this.lastStateChange > this.options.recoveryTimeout) {
      this.state = "HALF_OPEN";
      this.lastStateChange = now;
      this.successCount = 0;
      console.warn(`[CircuitBreaker:${this.name}] Cooldown elapsed. Entering HALF_OPEN state.`);
    }

    // Fast-fail if OPEN
    if (this.state === "OPEN") {
      console.warn(`[CircuitBreaker:${this.name}] Circuit is OPEN. Fast-failing request.`);
      return typeof this.options.fallbackValue === "function"
        ? (this.options.fallbackValue as Function)()
        : this.options.fallbackValue;
    }

    // Enforce Timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

    try {
      // Execute request passing the abort signal
      const result = await this.requestFn(...args, controller.signal);
      clearTimeout(timeoutId);

      // Handle Success transitions
      if (this.state === "HALF_OPEN") {
        this.successCount++;
        if (this.successCount >= this.options.successThreshold) {
          console.log(`[CircuitBreaker:${this.name}] Successfully closed circuit.`);
          this.state = "CLOSED";
          this.failureCount = 0;
          this.successCount = 0;
          this.lastStateChange = Date.now();
        }
      } else {
        this.failureCount = 0; // reset on normal success
      }

      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.failureCount++;

      console.error(
        `[CircuitBreaker:${this.name}] Request failed (Failures: ${this.failureCount}/${this.options.failureThreshold}). Error:`,
        err.message || err
      );

      // Transition to OPEN on threshold exceed
      if (this.state === "CLOSED" && this.failureCount >= this.options.failureThreshold) {
        console.warn(`[CircuitBreaker:${this.name}] Failure threshold reached. Tripping circuit to OPEN.`);
        this.state = "OPEN";
        this.lastStateChange = Date.now();
      } else if (this.state === "HALF_OPEN") {
        console.warn(`[CircuitBreaker:${this.name}] Failure in HALF_OPEN. Resetting to OPEN.`);
        this.state = "OPEN";
        this.successCount = 0;
        this.lastStateChange = Date.now();
      }

      return typeof this.options.fallbackValue === "function"
        ? (this.options.fallbackValue as Function)()
        : this.options.fallbackValue;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Global registry helper to avoid hot-reload state resets
const globalForBreakers = globalThis as unknown as {
  __breakers?: Record<string, CircuitBreaker<any>>;
};

if (!globalForBreakers.__breakers) {
  globalForBreakers.__breakers = {};
}

export function getOrCreateBreaker<T>(
  name: string,
  requestFn: (...args: any[]) => Promise<T>,
  options: CircuitBreakerOptions<T>
): CircuitBreaker<T> {
  if (!globalForBreakers.__breakers![name]) {
    globalForBreakers.__breakers![name] = new CircuitBreaker(name, requestFn, options);
  }
  return globalForBreakers.__breakers![name] as CircuitBreaker<T>;
}
