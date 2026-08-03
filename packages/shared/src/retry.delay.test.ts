import { describe, expect, mock, test } from "bun:test";
import { withRetry } from "./retry.ts";

const alwaysRetry = () => true;

const alwaysFails = () => Promise.reject(new Error("boom"));

function recordingSleep() {
  const delays: number[] = [];
  const sleep = mock((ms: number) => {
    delays.push(ms);
    return Promise.resolve();
  });
  return { delays, sleep };
}

describe("withRetry delay behavior", () => {
  test("uses the server hint instead of computed backoff", async () => {
    const { delays, sleep } = recordingSleep();

    await withRetry(alwaysFails, {
      maxRetries: 2,
      shouldRetry: alwaysRetry,
      delayHintMs: () => 2_000,
      sleep,
    }).catch(() => undefined);

    expect(delays).toEqual([2_000, 2_000]);
  });

  test("caps the server hint at maxDelayMs", async () => {
    const { delays, sleep } = recordingSleep();

    await withRetry(alwaysFails, {
      maxRetries: 1,
      maxDelayMs: 5_000,
      shouldRetry: alwaysRetry,
      delayHintMs: () => 999_999,
      sleep,
    }).catch(() => undefined);

    expect(delays).toEqual([5_000]);
  });

  test("keeps every jittered delay within the exponential ceiling", async () => {
    const { delays, sleep } = recordingSleep();
    const baseDelayMs = 100;
    const maxDelayMs = 10_000;

    await withRetry(alwaysFails, {
      maxRetries: 8,
      baseDelayMs,
      maxDelayMs,
      shouldRetry: alwaysRetry,
      sleep,
    }).catch(() => undefined);

    delays.forEach((delay, attempt) => {
      const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(ceiling);
    });
  });

  test("reports the same delay to onRetry that it sleeps for", async () => {
    const { delays, sleep } = recordingSleep();
    const reported: number[] = [];

    await withRetry(alwaysFails, {
      maxRetries: 3,
      shouldRetry: alwaysRetry,
      onRetry: ({ delayMs }) => reported.push(delayMs),
      sleep,
    }).catch(() => undefined);

    expect(reported).toEqual(delays);
  });

  test("stops retrying when the wait is aborted", async () => {
    const abortReason = new Error("aborted");
    const rejectingSleep = mock(() => Promise.reject(abortReason));
    const operation = mock(alwaysFails);

    const outcome = withRetry(operation, {
      maxRetries: 5,
      shouldRetry: alwaysRetry,
      sleep: rejectingSleep,
    });

    await expect(outcome).rejects.toBe(abortReason);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
