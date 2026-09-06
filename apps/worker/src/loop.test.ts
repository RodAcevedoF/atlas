import { describe, expect, test } from "bun:test";
import { runConsumeLoop } from "./loop.ts";
import { silentLogger } from "./testing/logger.fake.ts";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const NEVER_STOPPED = new Promise<void>(() => {});

describe("inquiry consume loop", () => {
  test("a drain that keeps failing paces itself instead of hot-spinning", async () => {
    let attempts = 0;
    let running = true;
    const startedAt = Date.now();

    await runConsumeLoop({
      drainOnce: () => {
        attempts += 1;
        if (attempts === 3) running = false;
        return Promise.reject(new Error("redis unreachable"));
      },
      isRunning: () => running,
      stopRequested: NEVER_STOPPED,
      shutdownGraceMs: 20,
      errorBackoffMs: 10,
      log: silentLogger,
    });

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(25);
  });

  test("a stop during an in-flight drain lets it settle before the loop returns", async () => {
    let attempts = 0;
    let settled = false;
    let running = true;

    await runConsumeLoop({
      drainOnce: async () => {
        attempts += 1;
        running = false;
        await delay(20);
        settled = true;
      },
      isRunning: () => running,
      stopRequested: NEVER_STOPPED,
      shutdownGraceMs: 50,
      errorBackoffMs: 10,
      log: silentLogger,
    });

    expect(settled).toBe(true);
    expect(attempts).toBe(1);
  });

  test("a stop request during a drain that never settles returns after the grace period", async () => {
    let running = true;
    let requestStop = (): void => {};
    const stopRequested = new Promise<void>((resolve) => {
      requestStop = resolve;
    });
    const startedAt = Date.now();

    const loop = runConsumeLoop({
      drainOnce: () => new Promise(() => {}),
      isRunning: () => running,
      stopRequested,
      shutdownGraceMs: 20,
      errorBackoffMs: 10,
      log: silentLogger,
    });
    running = false;
    requestStop();
    await loop;

    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(20);
  });
});
