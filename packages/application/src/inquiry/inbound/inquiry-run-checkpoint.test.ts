import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import {
  CREATED_AT,
  RETRY_AFTER_MS,
  RUN_TIMEOUT_MS,
  SUCCESS_BODY,
  inquiryRun,
} from "../../testing/inquiry-run.builder.ts";
import {
  failing,
  progressing,
  stalling,
  streaming,
  terminalEnvelope,
} from "../../testing/orchestration.fake.ts";
import { GraphUnavailableError } from "../../world/outbound/orchestration.ts";
import type { InquiryRunEnvelope } from "../../world/outbound/run-envelope.ts";
import { ExecuteInquiryRunUseCase } from "./execute-inquiry-run.ts";

describe("a durable milestone outlives the attempt that produced it", () => {
  const CLAIMED_REVISION = 1;

  function milestone(
    type: InquiryRunEnvelope["type"],
    sequence: number,
    data: Record<string, unknown>,
  ): InquiryRunEnvelope {
    return {
      schemaVersion: 1,
      runId: "run-1",
      attempt: 1,
      sequence,
      type,
      occurredAt: CREATED_AT,
      durationMs: 0,
      data,
    };
  }

  const RETRIEVED = milestone("retrieval_complete", 1, {
    documents: SUCCESS_BODY.documents,
    claimCount: 2,
    costUsd: 0.047,
  });

  const MAPPED = milestone("map_ready", 2, {
    places: SUCCESS_BODY.places,
    claimCount: 2,
    unplacedClaims: 0,
  });

  test("the map is readable while the analyst is still working, not only once the run ends", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const observed: (InquiryRun | null)[] = [];
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      streaming(async function* () {
        yield RETRIEVED;
        yield MAPPED;
        observed.push(await store.findInquiryRunById(makeInquiryRunId("run-1")));
        yield terminalEnvelope(SUCCESS_BODY, 3);
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    expect(observed[0]?.status).toBe("running");
    expect(observed[0]?.progress.stage).toBe("map_ready");
    expect(observed[0]?.places).toHaveLength(1);
    expect(observed[0]?.costUsd).toBe(0.047);
  });

  test("an analyst that never answers leaves a degraded success, because the map was already paid for", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      stalling([RETRIEVED, MAPPED]),
      RETRY_AFTER_MS,
      5,
    );

    const result = await useCase.execute();

    const [stored] = runs();
    expect(result.status).toBe("succeeded");
    expect(stored?.completion).toBe("degraded");
    expect(stored?.degradations).toEqual(["enrichment_timeout"]);
    expect(stored?.places).toHaveLength(1);
  });

  test("a stall before the map still fails retryably, since no product artifact exists yet", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(store, stalling([RETRIEVED]), RETRY_AFTER_MS, 5);

    const result = await useCase.execute();

    const [stored] = runs();
    expect(result.status).toBe("failed_retryable");
    expect(stored?.completion).toBeNull();
    expect(stored?.documents).toEqual(SUCCESS_BODY.documents);
  });

  test("a retry that dies before its own map keeps the map an earlier attempt paid for", async () => {
    const mapped = inquiryRun({
      status: "failed_retryable",
      attempts: 1,
      places: SUCCESS_BODY.places as InquiryRun["places"],
      claimCount: 2,
      completedAt: new Date(CREATED_AT.getTime() - RETRY_AFTER_MS - 1),
    });
    const { store, runs } = inMemoryInquiryRunStore([mapped]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new GraphUnavailableError("intelligence unreachable")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.places).toHaveLength(1);
  });

  test("a success without a synthesis is degraded rather than quietly complete", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      progressing([MAPPED], { ...SUCCESS_BODY, synthesis: null }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.completion).toBe("degraded");
    expect(stored?.degradations).toEqual(["synthesis_unavailable"]);
  });

  test("an unusable milestone leaves no trace rather than persisting a broken map", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun()]);
    const observed: (InquiryRun | null)[] = [];
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      streaming(async function* () {
        yield milestone("map_ready", 1, { places: "not a map" });
        observed.push(await store.findInquiryRunById(makeInquiryRunId("run-1")));
        yield terminalEnvelope(SUCCESS_BODY, 2);
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute();

    expect(observed[0]?.progress.stage).toBe("queued");
    expect(observed[0]?.progress.revision).toBe(CLAIMED_REVISION);
    expect(result.status).toBe("succeeded");
  });

  test("a stream that outlives its deadline stops writing, so a late milestone never lands", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      streaming(async function* () {
        yield RETRIEVED;
        yield MAPPED;
        await new Promise((resolve) => setTimeout(resolve, 20));
        yield milestone("synthesis_ready", 3, { synthesis: "a draft nobody is waiting for" });
        await new Promise<never>(() => {});
      }),
      RETRY_AFTER_MS,
      5,
    );

    await useCase.execute();
    await new Promise((resolve) => setTimeout(resolve, 40));

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.synthesis).toBeNull();
    expect(stored?.progress.stage).toBe("terminal");
  });

  test("a replayed milestone the store refused cannot roll the run's map back", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      streaming(async function* () {
        yield MAPPED;
        yield milestone("map_ready", 1, { places: [], claimCount: 0, unplacedClaims: 0 });
        await new Promise<never>(() => {});
      }),
      RETRY_AFTER_MS,
      5,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.places).toHaveLength(1);
    expect(stored?.claimCount).toBe(2);
  });

  test("a lost enrichment keeps the reason it was lost, instead of a silent degraded success", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      stalling([RETRIEVED, MAPPED]),
      RETRY_AFTER_MS,
      5,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.error).toBe("the inquiry graph did not answer within 5ms");
  });

  test("documents this attempt retrieved survive a terminal result that omits them", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      progressing([RETRIEVED], { ...SUCCESS_BODY, documents: [] }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.documents).toEqual(SUCCESS_BODY.documents as InquiryRun["documents"]);
  });
});
