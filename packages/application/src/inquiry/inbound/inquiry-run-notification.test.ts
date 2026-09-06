import { describe, expect, test } from "bun:test";
import { recordingNotifier } from "../../testing/inquiry-run-notifier.fake.ts";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import {
  LONG_AGO,
  NOTIFICATION_WINDOW_MS,
  RETRY_AFTER_MS,
  RUN_TIMEOUT_MS,
  SUCCESS_BODY,
  inquiryRun,
} from "../../testing/inquiry-run.builder.ts";
import { milestoneEnvelope, progressing, streaming } from "../../testing/orchestration.fake.ts";
import type { InquiryRunStorePort } from "../outbound/inquiry-run-store.ts";
import { ExecuteInquiryRunUseCase } from "./execute-inquiry-run.ts";
import { ReconcileInquiryNotificationsUseCase } from "./inquiry-run-notification.ts";

const BATCH_SIZE = 10;
const WHOLE_HISTORY = { limit: BATCH_SIZE, updatedAfter: LONG_AGO };

const MAPPED = milestoneEnvelope("map_ready", 1, {
  places: SUCCESS_BODY.places,
  claimCount: 2,
  unplacedClaims: 0,
});

describe("a persisted revision is announced once it is durable", () => {
  test("the claim, each milestone and the terminal write are announced in revision order", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const { notifier, published } = recordingNotifier();
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      progressing([MAPPED], SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      notifier,
    );

    await useCase.execute();

    expect(published().map((notification) => notification.revision)).toEqual([1, 2, 3]);
    expect(published().every((notification) => notification.runId === "run-1")).toBe(true);
  });

  test("a milestone the store refused is not announced, so no revision is invented", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const { notifier, published } = recordingNotifier();
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      streaming(async function* () {
        yield MAPPED;
        yield milestoneEnvelope("map_ready", 1, { places: [], claimCount: 0, unplacedClaims: 0 });
        await new Promise<never>(() => {});
      }),
      RETRY_AFTER_MS,
      5,
      notifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(published().map((notification) => notification.revision)).toEqual([1, 2, 3]);
    expect(stored?.progress.revision).toBe(3);
  });

  test("a cursor Mongo refused still finishes the run, since reconciliation owns the gap", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const refusing: InquiryRunStorePort = {
      ...store,
      confirmInquiryRunNotification: () => Promise.reject(new Error("mongo is down")),
    };
    const { notifier } = recordingNotifier();
    const useCase = new ExecuteInquiryRunUseCase(
      refusing,
      progressing([MAPPED], SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      notifier,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.synthesis).toBe(SUCCESS_BODY.synthesis);
  });

  test("an announcement Redis never took leaves the run behind its cursor", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const { notifier } = recordingNotifier(false);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      progressing([MAPPED], SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      notifier,
    );

    await useCase.execute();

    expect(await store.findUnnotifiedInquiryRuns(WHOLE_HISTORY)).toEqual([
      { runId: inquiryRun().id, revision: 3 },
    ]);
  });

  test("a delivered announcement leaves nothing for reconciliation to find", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const { notifier } = recordingNotifier();
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      progressing([MAPPED], SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
      notifier,
    );

    await useCase.execute();

    expect(await store.findUnnotifiedInquiryRuns(WHOLE_HISTORY)).toEqual([]);
  });
});

describe("reconciliation republishes what a dead worker never announced", () => {
  test("a run persisted past its cursor is republished at its current revision", async () => {
    const { store } = inMemoryInquiryRunStore([
      inquiryRun({ progress: { stage: "map_ready", revision: 4, updatedAt: new Date() } }),
    ]);
    const { notifier, published } = recordingNotifier();
    const useCase = new ReconcileInquiryNotificationsUseCase(
      store,
      notifier,
      BATCH_SIZE,
      NOTIFICATION_WINDOW_MS,
    );

    const outcome = await useCase.reconcile();

    expect(outcome).toEqual({ stranded: 1, republished: 1 });
    expect(published()).toEqual([{ runId: inquiryRun().id, revision: 4 }]);
  });

  test("a republished revision is not announced twice on the next pass", async () => {
    const { store } = inMemoryInquiryRunStore([
      inquiryRun({ progress: { stage: "map_ready", revision: 4, updatedAt: new Date() } }),
    ]);
    const { notifier, published } = recordingNotifier();
    const useCase = new ReconcileInquiryNotificationsUseCase(
      store,
      notifier,
      BATCH_SIZE,
      NOTIFICATION_WINDOW_MS,
    );

    await useCase.reconcile();
    const outcome = await useCase.reconcile();

    expect(outcome).toEqual({ stranded: 0, republished: 0 });
    expect(published()).toHaveLength(1);
  });

  test("a run whose queued revision was never bumped is left alone", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const { notifier, published } = recordingNotifier();
    const useCase = new ReconcileInquiryNotificationsUseCase(
      store,
      notifier,
      BATCH_SIZE,
      NOTIFICATION_WINDOW_MS,
    );

    await useCase.reconcile();

    expect(published()).toEqual([]);
  });

  test("a run that stopped advancing before the window is left to its own history", async () => {
    const { store } = inMemoryInquiryRunStore([
      inquiryRun({ progress: { stage: "map_ready", revision: 4, updatedAt: LONG_AGO } }),
    ]);
    const { notifier, published } = recordingNotifier();
    const useCase = new ReconcileInquiryNotificationsUseCase(
      store,
      notifier,
      BATCH_SIZE,
      NOTIFICATION_WINDOW_MS,
    );

    const outcome = await useCase.reconcile();

    expect(outcome).toEqual({ stranded: 0, republished: 0 });
    expect(published()).toEqual([]);
  });

  test("a republish Redis refuses stays stranded for the next pass", async () => {
    const { store } = inMemoryInquiryRunStore([
      inquiryRun({ progress: { stage: "map_ready", revision: 4, updatedAt: new Date() } }),
    ]);
    const { notifier } = recordingNotifier(false);
    const useCase = new ReconcileInquiryNotificationsUseCase(
      store,
      notifier,
      BATCH_SIZE,
      NOTIFICATION_WINDOW_MS,
    );

    const outcome = await useCase.reconcile();

    expect(outcome).toEqual({ stranded: 1, republished: 0 });
    expect(await store.findUnnotifiedInquiryRuns(WHOLE_HISTORY)).toHaveLength(1);
  });
});
