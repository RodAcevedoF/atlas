export interface RetryContext {
  attempt: number;
  delayMs: number;
  error: unknown;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  delayHintMs?: (error: unknown) => number | undefined;
  onRetry?: (context: RetryContext) => void;
  signal?: AbortSignal;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 10_000;

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function backoffDelayMs(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return Math.random() * ceiling;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const shouldRetry = options.shouldRetry ?? (() => false);
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error)) throw error;

      const hint = options.delayHintMs?.(error);
      const delayMs = Math.min(
        maxDelayMs,
        hint ?? backoffDelayMs(attempt, baseDelayMs, maxDelayMs),
      );
      options.onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs, options.signal);
    }
  }
}
