import { describe, expect, test } from "bun:test";
import type { ExecuteInquiryRun, ExecuteInquiryRunOutput } from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { createConsumer } from "./consumer.ts";
import { InMemoryInquiryJobQueue } from "./testing/inquiry-job-queue.fake.ts";
import { silentLogger } from "./testing/logger.fake.ts";

const RUN_ID = makeInquiryRunId("run-1");

function executing(
  run: (runId?: InquiryRunId) => Promise<ExecuteInquiryRunOutput>,
): ExecuteInquiryRun {
  return { execute: run };
}

function consumerFor(queue: InMemoryInquiryJobQueue, executeInquiryRun: ExecuteInquiryRun) {
  return createConsumer({
    queue,
    executeInquiryRun,
    ownershipRefreshMs: 60_000,
    reclaimIdleMs: 150_000,
    reclaimBatchSize: 10,
    log: silentLogger,
  });
}

describe("inquiry job consumer", () => {
  test("a finished job is released so no other worker reclaims it", async () => {
    const queue = new InMemoryInquiryJobQueue();
    await queue.publish(RUN_ID);
    const consumer = consumerFor(
      queue,
      executing((runId) => Promise.resolve({ runId: runId ?? null, status: "succeeded" })),
    );

    await consumer.drainOnce();

    expect(await queue.reclaimStale(0, 10)).toEqual([]);
    expect(queue.deadLettered()).toEqual([]);
  });

  test("a job whose execution throws is dead-lettered instead of redelivered forever", async () => {
    const queue = new InMemoryInquiryJobQueue();
    await queue.publish(RUN_ID);
    const consumer = consumerFor(
      queue,
      executing(() => Promise.reject(new Error("intelligence unreachable"))),
    );

    await consumer.drainOnce();

    expect(queue.deadLettered().map((entry) => entry.job.runId)).toEqual([RUN_ID]);
    expect(await queue.reclaimStale(0, 10)).toEqual([]);
  });

  test("a job for a run another worker already holds is released, not dead-lettered", async () => {
    const queue = new InMemoryInquiryJobQueue();
    await queue.publish(RUN_ID);
    const consumer = consumerFor(
      queue,
      executing(() => Promise.resolve({ runId: null, status: null })),
    );

    await consumer.drainOnce();

    expect(queue.deadLettered()).toEqual([]);
    expect(await queue.reclaimStale(0, 10)).toEqual([]);
  });

  test("a run that succeeded is not dead-lettered when only its ack fails", async () => {
    const queue = new InMemoryInquiryJobQueue();
    await queue.publish(RUN_ID);
    queue.failAcknowledge();
    const consumer = consumerFor(
      queue,
      executing((runId) => Promise.resolve({ runId: runId ?? null, status: "succeeded" })),
    );

    await expect(consumer.drainOnce()).rejects.toThrow("redis unavailable");

    expect(queue.deadLettered()).toEqual([]);
  });

  test("an abandoned job left by a dead worker is picked up by the recovery pass", async () => {
    const queue = new InMemoryInquiryJobQueue();
    await queue.publish(RUN_ID);
    await queue.reserve(1);
    const consumer = consumerFor(
      queue,
      executing((runId) => Promise.resolve({ runId: runId ?? null, status: "succeeded" })),
    );

    await consumer.recoverOnce();

    expect(await queue.reclaimStale(0, 10)).toEqual([]);
    expect(queue.deadLettered()).toEqual([]);
  });

  test("a stranded Mongo run is still recovered when the Redis reclaim fails", async () => {
    const queue = new InMemoryInquiryJobQueue();
    queue.failReclaim();
    const stranded = [RUN_ID];
    const recovered: InquiryRunId[] = [];
    const consumer = consumerFor(
      queue,
      executing((runId) => {
        const claimed = runId ?? stranded.shift() ?? null;
        if (claimed) recovered.push(claimed);
        return Promise.resolve({ runId: claimed, status: claimed ? "succeeded" : null });
      }),
    );

    await consumer.recoverOnce();

    expect(recovered).toEqual([RUN_ID]);
  });
});
