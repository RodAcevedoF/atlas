import { expect, test } from "bun:test";
import type { InquiryRunStatus } from "@atlas/domain";
import type { InquiryRunRecord } from "../repositories/inquiry-repository.ts";
import { buildInquiryRun } from "../testing/inquiry-builder.ts";
import { inMemoryInquiryStreamRepository } from "../testing/inquiry-stream-repository.fake.ts";
import { type InquiryStreamPolicy, makeWatchInquiryRunStream } from "./stream-inquiry-run.ts";

const FAST: InquiryStreamPolicy = { reconnectDelaysMs: [1], retryReopenDelaysMs: [1, 1] };

function runningSnapshot(revision: number): InquiryRunRecord {
  return buildInquiryRun({
    id: "run-1",
    status: "running",
    progress: { stage: "map_ready", revision, updatedAt: "2026-09-06T10:00:00.000Z" },
  });
}

function terminalSnapshot(status: InquiryRunStatus, revision: number): InquiryRunRecord {
  return buildInquiryRun({
    id: "run-1",
    status,
    progress: { stage: "terminal", revision, updatedAt: "2026-09-06T10:01:00.000Z" },
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function until(condition: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      if (condition()) return resolve();
      if (Date.now() - startedAt > 1_000) return reject(new Error("condition never held"));
      setTimeout(tick, 1);
    };
    tick();
  });
}

function watching(policy: InquiryStreamPolicy = FAST) {
  const { repository, connections } = inMemoryInquiryStreamRepository();
  const seen: InquiryRunRecord[] = [];
  let stalled = false;
  const watch = makeWatchInquiryRunStream({ inquiryStreamRepository: repository }, policy)(
    "run-1",
    (run) => seen.push(run),
    () => {
      stalled = true;
    },
  );
  return { connections, seen, watch, isStalled: () => stalled };
}

test("snapshots flow to the listener until the terminal one, which ends the stream", async () => {
  const { connections, seen } = watching();

  connections[0]?.emit(runningSnapshot(1));
  connections[0]?.emit(terminalSnapshot("succeeded", 2));

  expect(seen.map((run) => run.progress.revision)).toEqual([1, 2]);
  expect(connections[0]?.isOpen).toBe(false);
  await delay(10);
  expect(connections).toHaveLength(1);
});

test("a dropped connection reopens, and the fresh stream resumes the flow", async () => {
  const { connections, seen } = watching();

  connections[0]?.drop();
  await until(() => connections.length === 2);
  connections[1]?.emit(runningSnapshot(2));

  expect(seen.map((run) => run.progress.revision)).toEqual([2]);
});

test("reconnects are bounded — a dead API reports the stall instead of retrying forever", async () => {
  const { connections, isStalled } = watching();

  connections[0]?.drop();
  await until(() => connections.length === 2);
  connections[1]?.drop();

  await until(isStalled);
  await delay(10);
  expect(connections).toHaveLength(2);
});

test("a delivered snapshot restores the reconnect budget", async () => {
  const { connections, isStalled } = watching();

  connections[0]?.drop();
  await until(() => connections.length === 2);
  connections[1]?.emit(runningSnapshot(2));
  connections[1]?.drop();

  await until(() => connections.length === 3);
  expect(isStalled()).toBe(false);
});

test("a retryable failure keeps a paced eye on the run until its retry streams again", async () => {
  const { connections, seen } = watching();

  connections[0]?.emit(terminalSnapshot("failed_retryable", 2));
  expect(connections[0]?.isOpen).toBe(false);
  await until(() => connections.length === 2);
  connections[1]?.emit(terminalSnapshot("failed_retryable", 2));
  await until(() => connections.length === 3);
  connections[2]?.emit(runningSnapshot(3));
  connections[2]?.emit(terminalSnapshot("succeeded", 4));

  expect(seen.at(-1)?.status).toBe("succeeded");
  await delay(10);
  expect(connections).toHaveLength(3);
});

test("retry reopens are bounded, so an abandoned failure does not watch forever", async () => {
  const { connections, isStalled } = watching();

  connections[0]?.emit(terminalSnapshot("failed_retryable", 2));
  await until(() => connections.length === 2);
  connections[1]?.emit(terminalSnapshot("failed_retryable", 2));
  await until(() => connections.length === 3);
  connections[2]?.emit(terminalSnapshot("failed_retryable", 2));

  await delay(10);
  expect(connections).toHaveLength(3);
  expect(isStalled()).toBe(false);
});

test("stop closes the connection and cancels any pending reopen", async () => {
  const { connections, watch } = watching();

  connections[0]?.emit(terminalSnapshot("failed_retryable", 2));
  watch.stop();

  await delay(10);
  expect(connections).toHaveLength(1);
  expect(connections[0]?.isOpen).toBe(false);
});
