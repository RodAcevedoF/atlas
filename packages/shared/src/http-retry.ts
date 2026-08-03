import { type RetryOptions, withRetry } from "./retry.ts";

const DEFAULT_RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

export class RetryableResponseError extends Error {
  constructor(readonly response: Response) {
    super(`retryable HTTP ${response.status}`);
    this.name = "RetryableResponseError";
  }
}

export interface FetchRetryOptions extends RetryOptions {
  retryableStatuses?: Set<number>;
}

function drainDiscardedResponse(error: unknown): void {
  if (error instanceof RetryableResponseError) {
    void error.response.body?.cancel();
  }
}

function parseRetryAfterMs(response: Response): number | undefined {
  const header = response.headers.get("retry-after");
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const dateMs = Date.parse(header);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.max(0, dateMs - Date.now());
}

export function fetchWithRetry(
  input: string | URL | Request,
  init?: RequestInit,
  options?: FetchRetryOptions,
): Promise<Response> {
  const retryableStatuses = options?.retryableStatuses ?? DEFAULT_RETRYABLE_STATUSES;

  return withRetry(
    async () => {
      const response = await fetch(input, init);
      if (retryableStatuses.has(response.status)) {
        throw new RetryableResponseError(response);
      }
      return response;
    },
    {
      ...options,
      shouldRetry: (error) =>
        error instanceof RetryableResponseError ||
        error instanceof TypeError ||
        (options?.shouldRetry?.(error) ?? false),
      delayHintMs: (error) =>
        error instanceof RetryableResponseError
          ? parseRetryAfterMs(error.response)
          : options?.delayHintMs?.(error),
      onRetry: (context) => {
        drainDiscardedResponse(context.error);
        options?.onRetry?.(context);
      },
    },
  ).catch((error) => {
    if (error instanceof RetryableResponseError) return error.response;
    throw error;
  });
}
