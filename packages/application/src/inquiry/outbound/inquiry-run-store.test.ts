import { describe, expect, test } from "bun:test";
import type { InquiryPlace, InquiryRun } from "@atlas/domain";
import { makeInquiryRunId, makeUserId, queuedInquiryProgress } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import type { InquiryRunCheckpoint } from "./inquiry-run-store.ts";

const RUN_ID = makeInquiryRunId("run-1");
const CREATED_AT = new Date("2026-09-06T10:00:00Z");
const OCCURRED_AT = new Date("2026-09-06T10:00:30Z");

function place(overrides: Partial<InquiryPlace> = {}): InquiryPlace {
  return {
    place: "Khartoum",
    country: "Sudan",
    latitude: 15.5,
    longitude: 32.56,
    claimCount: 0,
    read: null,
    claims: [],
    ...overrides,
  };
}

function queuedRun(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: RUN_ID,
    ownerId: makeUserId("user-1"),
    question: "who is covering the sudan famine",
    questionKey: "who-is-covering-the-sudan-famine",
    day: "2026-09-06",
    window: "1w",
    places: [],
    documents: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "running",
    failure: null,
    error: null,
    attempts: 1,
    progress: queuedInquiryProgress(CREATED_AT),
    completion: null,
    degradations: [],
    createdAt: CREATED_AT,
    startedAt: CREATED_AT,
    completedAt: null,
    ...overrides,
  };
}

function mapReady(overrides: Partial<Extract<InquiryRunCheckpoint, { stage: "map_ready" }>> = {}) {
  return {
    id: RUN_ID,
    attempt: 1,
    sequence: 2,
    occurredAt: OCCURRED_AT,
    stage: "map_ready",
    places: [place()],
    claimCount: 12,
    unplacedClaims: 3,
    ...overrides,
  } as const satisfies InquiryRunCheckpoint;
}

describe("a checkpoint is applied once and only moves a run forward", () => {
  test("the first checkpoint advances the stage and reports the revision the browser should see", async () => {
    const { store } = inMemoryInquiryRunStore([queuedRun()]);

    const revision = await store.applyInquiryRunCheckpoint(mapReady());

    const run = await store.findInquiryRunById(RUN_ID);
    expect(revision).toBe(1);
    expect(run?.progress).toEqual({ stage: "map_ready", revision: 1, updatedAt: OCCURRED_AT });
    expect(run?.places).toEqual([place()]);
  });

  const STALE = [
    { name: "the identical pair a redelivered job replays", attempt: 1, sequence: 2 },
    { name: "an older sequence arriving out of order", attempt: 1, sequence: 1 },
    { name: "an older attempt finishing late", attempt: 0, sequence: 99 },
  ];

  for (const { name, attempt, sequence } of STALE) {
    test(`${name} is a no-op, so it cannot spend a revision`, async () => {
      const { store } = inMemoryInquiryRunStore([queuedRun()]);
      await store.applyInquiryRunCheckpoint(mapReady());

      const revision = await store.applyInquiryRunCheckpoint(
        mapReady({ attempt, sequence, places: [], claimCount: 0, unplacedClaims: 0 }),
      );

      const run = await store.findInquiryRunById(RUN_ID);
      expect(revision).toBeNull();
      expect(run?.progress.revision).toBe(1);
      expect(run?.places).toEqual([place()]);
    });
  }

  test("a retry restarts its sequence at 1 and is still applied, because the attempt moved on", async () => {
    const { store } = inMemoryInquiryRunStore([queuedRun()]);
    await store.applyInquiryRunCheckpoint(mapReady());

    const revision = await store.applyInquiryRunCheckpoint({
      id: RUN_ID,
      attempt: 2,
      sequence: 1,
      occurredAt: OCCURRED_AT,
      stage: "retrieval_complete",
      documents: [],
      claimCount: 40,
      costUsd: 0.047,
    });

    expect(revision).toBe(2);
  });

  test("a retry's earlier stage keeps its artifacts but cannot drag the run back before the map", async () => {
    const { store } = inMemoryInquiryRunStore([queuedRun()]);
    await store.applyInquiryRunCheckpoint(mapReady());

    await store.applyInquiryRunCheckpoint({
      id: RUN_ID,
      attempt: 2,
      sequence: 1,
      occurredAt: OCCURRED_AT,
      stage: "retrieval_complete",
      documents: [],
      claimCount: 40,
      costUsd: 0.047,
    });

    const run = await store.findInquiryRunById(RUN_ID);
    expect(run?.progress.stage).toBe("map_ready");
    expect(run?.costUsd).toBe(0.047);
  });

  test("a place read lands on its own place and leaves the rest of the map alone", async () => {
    const other = place({ place: "El Fasher", latitude: 13.62, longitude: 25.35 });
    const { store } = inMemoryInquiryRunStore([queuedRun()]);
    await store.applyInquiryRunCheckpoint(mapReady({ places: [place(), other] }));

    await store.applyInquiryRunCheckpoint({
      id: RUN_ID,
      attempt: 1,
      sequence: 3,
      occurredAt: OCCURRED_AT,
      stage: "place_read_ready",
      latitude: 13.62,
      longitude: 25.35,
      read: { text: "displacement is accelerating", sourceUrls: ["https://example.test/a"] },
    });

    const run = await store.findInquiryRunById(RUN_ID);
    expect(run?.places[0]?.read).toBeNull();
    expect(run?.places[1]?.read).toEqual({
      text: "displacement is accelerating",
      sourceUrls: ["https://example.test/a"],
    });
  });

  test("completing a run spends a revision too, so a terminal update is never silently equal to the last", async () => {
    const { store } = inMemoryInquiryRunStore([queuedRun()]);
    await store.applyInquiryRunCheckpoint(mapReady());
    const completedAt = new Date("2026-09-06T10:01:11Z");

    await store.completeInquiryRun({
      id: RUN_ID,
      status: "succeeded",
      places: [place()],
      documents: [],
      claimCount: 12,
      unplacedClaims: 3,
      costUsd: 0.047,
      synthesis: "the famine is widening",
      failure: null,
      error: null,
      completion: "complete",
      degradations: [],
      completedAt,
    });

    const run = await store.findInquiryRunById(RUN_ID);
    expect(run?.progress).toEqual({ stage: "terminal", revision: 2, updatedAt: completedAt });
    expect(run?.completion).toBe("complete");
  });

  test("a milestone from a stream that outlived the run cannot rewrite a finished result", async () => {
    const { store } = inMemoryInquiryRunStore([queuedRun()]);
    await store.applyInquiryRunCheckpoint(mapReady());
    await store.completeInquiryRun({
      id: RUN_ID,
      status: "succeeded",
      places: [place()],
      documents: [],
      claimCount: 12,
      unplacedClaims: 3,
      costUsd: 0.047,
      synthesis: "the famine is widening",
      failure: null,
      error: null,
      completion: "complete",
      degradations: [],
      completedAt: new Date("2026-09-06T10:01:11Z"),
    });

    const revision = await store.applyInquiryRunCheckpoint({
      id: RUN_ID,
      attempt: 1,
      sequence: 9,
      occurredAt: OCCURRED_AT,
      stage: "synthesis_ready",
      synthesis: "a late draft nobody asked for",
    });

    const run = await store.findInquiryRunById(RUN_ID);
    expect(revision).toBeNull();
    expect(run?.synthesis).toBe("the famine is widening");
    expect(run?.progress).toEqual({
      stage: "terminal",
      revision: 2,
      updatedAt: new Date("2026-09-06T10:01:11Z"),
    });
  });

  test("re-claiming a finished run reopens its stage, so a retry is not read as already terminal", async () => {
    const now = new Date("2026-09-06T10:05:00Z");
    const abandoned = queuedRun({
      status: "failed_retryable",
      completedAt: new Date("2026-09-06T10:01:11Z"),
      progress: { stage: "terminal", revision: 4, updatedAt: new Date("2026-09-06T10:01:11Z") },
    });
    const { store } = inMemoryInquiryRunStore([abandoned]);

    const claimed = await store.claimInquiryRunById(RUN_ID, {
      now,
      completedBefore: new Date("2026-09-06T10:04:00Z"),
      startedBefore: new Date("2026-09-06T10:03:00Z"),
    });

    expect(claimed?.progress).toEqual({ stage: "queued", revision: 5, updatedAt: now });
  });
});
