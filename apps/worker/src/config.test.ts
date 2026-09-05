import { describe, expect, test } from "bun:test";
import { STALE_TIMEOUT_MULTIPLE } from "@atlas/application";
import { readWorkerConfig } from "./config.ts";

const MONGODB_URI = "mongodb://127.0.0.1:27017";

describe("worker config liveness rule", () => {
  test("a live worker's heartbeat always beats the reclaim window", () => {
    const config = readWorkerConfig({
      MONGODB_URI,
      INQUIRY_OWNERSHIP_REFRESH_MS: "1000",
    });

    expect(config.reclaimIdleMs).toBeGreaterThan(config.ownershipRefreshMs);
  });

  test("the queue reclaims an abandoned job before its run counts as stale in Mongo", () => {
    const config = readWorkerConfig({ MONGODB_URI });

    expect(config.reclaimIdleMs).toBeLessThan(config.runTimeoutMs * STALE_TIMEOUT_MULTIPLE);
  });

  test("the blocking read timeout always exceeds the queue block window", () => {
    const config = readWorkerConfig({ MONGODB_URI, INQUIRY_QUEUE_BLOCK_MS: "60000" });

    expect(config.blockingCommandTimeoutMs).toBeGreaterThan(config.queueBlockMs);
  });
});
