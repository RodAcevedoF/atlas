import { describe, expect, test } from "bun:test";
import type { InquiryRun, InquiryRunActor, PublicInquiryRun } from "@atlas/domain";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { fakeSubscriptions } from "../../testing/inquiry-run-subscriptions.fake.ts";
import { inquiryRun } from "../../testing/inquiry-run.builder.ts";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";
import type { InquiryRunReader } from "./get-inquiry-run.ts";
import { type InquiryRunStream, StreamInquiryRunUseCase } from "./stream-inquiry-run.ts";

const RUN_ID = makeInquiryRunId("run-1");
const OWNER: InquiryRunActor = { id: makeUserId("user-1"), role: "user" };
const STRANGER: InquiryRunActor = { id: makeUserId("user-2"), role: "user" };
const OCCURRED_AT = new Date("2026-09-06T10:00:00Z");

function reachMap(store: InquiryRunStorePort, sequence: number): Promise<number | null> {
  return store.applyInquiryRunCheckpoint({
    id: RUN_ID,
    attempt: 1,
    sequence,
    occurredAt: OCCURRED_AT,
    stage: "map_ready",
    places: [],
    claimCount: 3,
    unplacedClaims: 0,
  });
}

function finish(store: InquiryRunStorePort): Promise<number | null> {
  return store.completeInquiryRun({
    id: RUN_ID,
    status: "succeeded",
    places: [],
    documents: [],
    claimCount: 3,
    unplacedClaims: 0,
    costUsd: 0.05,
    synthesis: "what the sources say",
    failure: null,
    error: null,
    completion: "complete",
    degradations: [],
    completedAt: OCCURRED_AT,
  });
}

function advancingWhenRead(states: InquiryRun[], announce: () => void): InquiryRunReader {
  let read = 0;
  return {
    findInquiryRunById: () => {
      const state = states[Math.min(read, states.length - 1)] ?? null;
      read += 1;
      if (read < states.length) announce();
      return Promise.resolve(state);
    },
  };
}

async function opened(
  store: InquiryRunReader,
  subscriptions: ReturnType<typeof fakeSubscriptions>,
  actor: InquiryRunActor = OWNER,
): Promise<InquiryRunStream> {
  const useCase = new StreamInquiryRunUseCase(store, subscriptions.subscriptions);
  const stream = await useCase.execute(RUN_ID, actor);
  if (!stream) throw new Error("expected the run to be streamable");
  return stream;
}

async function take(stream: InquiryRunStream, count: number): Promise<PublicInquiryRun[]> {
  const taken: PublicInquiryRun[] = [];
  for await (const snapshot of stream.snapshots) {
    taken.push(snapshot);
    if (taken.length === count) break;
  }
  return taken;
}

describe("a client sees the run it opened and everything persisted after it", () => {
  test("a revision persisted while the first snapshot was being read still reaches the client", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const subscriptions = fakeSubscriptions();
    let announced = false;
    const racing: InquiryRunReader = {
      async findInquiryRunById(id) {
        const run = await store.findInquiryRunById(id);
        if (!announced) {
          announced = true;
          await reachMap(store, 1);
          subscriptions.announce(RUN_ID);
        }
        return run;
      },
    };

    const snapshots = await take(await opened(racing, subscriptions), 2);

    expect(snapshots.map((snapshot) => snapshot.progress)).toMatchObject([
      { stage: "queued", revision: 0 },
      { stage: "map_ready", revision: 1 },
    ]);
  });

  test("a change that left the run where it was is not replayed as a second snapshot", async () => {
    const held = inquiryRun();
    const advanced = {
      ...held,
      progress: { stage: "map_ready" as const, revision: 1, updatedAt: OCCURRED_AT },
    };
    const subscriptions = fakeSubscriptions();
    const publishing = advancingWhenRead([held, held, advanced], () =>
      subscriptions.announce(RUN_ID),
    );

    const snapshots = await take(await opened(publishing, subscriptions), 2);

    expect(snapshots.map((snapshot) => snapshot.progress.revision)).toEqual([0, 1]);
  });
});

describe("the stream ends where the run does", () => {
  test("the terminal snapshot is flushed and nothing follows it", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const subscriptions = fakeSubscriptions();
    const stream = await opened(store, subscriptions);

    const consumed = take(stream, 5);
    await finish(store);
    subscriptions.announce(RUN_ID);

    expect((await consumed).map((snapshot) => snapshot.status)).toEqual(["queued", "succeeded"]);
  });

  test("a run that finished before the client arrived is sent once and closed", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const subscriptions = fakeSubscriptions();
    await finish(store);
    const stream = await opened(store, subscriptions);

    const snapshots = await take(stream, 5);

    expect(snapshots.map((snapshot) => snapshot.status)).toEqual(["succeeded"]);
  });

  test("a run deleted while its client watches ends the stream instead of holding it open", async () => {
    const subscriptions = fakeSubscriptions();
    let served = false;
    const vanishing: InquiryRunReader = {
      findInquiryRunById: () => {
        if (served) return Promise.resolve(null);
        served = true;
        return Promise.resolve(inquiryRun());
      },
    };
    const stream = await opened(vanishing, subscriptions);

    const consumed = take(stream, 5);
    subscriptions.announce(RUN_ID);

    expect(await consumed).toHaveLength(1);
  });

  test("closing the stream releases its subscription so a gone client stops being fed", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const subscriptions = fakeSubscriptions();
    const stream = await opened(store, subscriptions);

    const consumed = take(stream, 5);
    await stream.close();

    expect(await consumed).toHaveLength(1);
    expect(subscriptions.openCount()).toBe(0);
  });
});

describe("a run only its owner may read", () => {
  test("a stranger is refused the run and leaves no subscription behind", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const subscriptions = fakeSubscriptions();
    const useCase = new StreamInquiryRunUseCase(store, subscriptions.subscriptions);

    const stream = await useCase.execute(RUN_ID, STRANGER);

    expect(stream).toBeNull();
    expect(subscriptions.openCount()).toBe(0);
  });

  test("a run nobody stored is refused and leaves no subscription behind", async () => {
    const { store } = inMemoryInquiryRunStore();
    const subscriptions = fakeSubscriptions();
    const useCase = new StreamInquiryRunUseCase(store, subscriptions.subscriptions);

    const stream = await useCase.execute(RUN_ID, OWNER);

    expect(stream).toBeNull();
    expect(subscriptions.openCount()).toBe(0);
  });
});

describe("a stream that cannot be opened releases what it took", () => {
  test("a store that fails the first read leaves no subscription behind", async () => {
    const subscriptions = fakeSubscriptions();
    const failing: InquiryRunReader = {
      findInquiryRunById: () => Promise.reject(new Error("mongo is away")),
    };
    const useCase = new StreamInquiryRunUseCase(failing, subscriptions.subscriptions);

    await expect(useCase.execute(RUN_ID, OWNER)).rejects.toThrow("mongo is away");

    expect(subscriptions.openCount()).toBe(0);
  });
});
