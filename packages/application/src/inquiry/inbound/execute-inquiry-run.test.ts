import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import { ExecuteInquiryRunUseCase } from "./execute-inquiry-run.ts";

const RETRY_AFTER_MS = 11 * 60 * 1000;
const RUN_TIMEOUT_MS = 60 * 1000;
const CREATED_AT = new Date();
const LONG_AGO = new Date(CREATED_AT.getTime() - 48 * 60 * 60 * 1000);

function run(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId("run-1"),
    question: "who is covering the Sudan famine",
    questionKey: "who-is-covering-the-sudan-famine",
    day: "2026-08-16",
    executedQuery: null,
    window: "1w",
    distribution: [],
    exemplars: [],
    synthesis: null,
    status: "queued",
    error: null,
    attempts: 0,
    createdAt: CREATED_AT,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function orchestrating(run: OrchestrationPort["run"]): OrchestrationPort {
  return {
    run,
    stream: () => {
      throw new Error("stream is not part of the worker path");
    },
    resume: () => {
      throw new Error("resume is not part of the worker path");
    },
  };
}

function answering(body: Record<string, unknown>): OrchestrationPort {
  return orchestrating(() => Promise.resolve(body));
}

function failing(error: Error): OrchestrationPort {
  return orchestrating(() => Promise.reject(error));
}

function hanging(): OrchestrationPort {
  return orchestrating(() => new Promise<Record<string, unknown>>(() => {}));
}

const SUCCESS_BODY = {
  status: "succeeded",
  error: null,
  executedQuery: '"Sudan" AND famine',
  distribution: [
    {
      country: "Sudan",
      awareness: 4.2,
      peak: 10,
      coveredBuckets: 20,
      totalBuckets: 166,
      confidence: "thin",
    },
  ],
  synthesis: "Regional press carries it; Western press does not.",
};

describe("ExecuteInquiryRunUseCase", () => {
  test("an empty queue executes nothing", async () => {
    const { store } = inMemoryInquiryRunStore();
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute();

    expect(result).toEqual({ runId: null, status: null });
  });

  test("a queued run is measured and its answer persisted", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute();

    expect(result.status).toBe("succeeded");
    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.executedQuery).toBe('"Sudan" AND famine');
    expect(stored?.synthesis).toBe("Regional press carries it; Western press does not.");
    expect(stored?.distribution).toHaveLength(1);
    expect(stored?.completedAt).not.toBeNull();
  });

  test("a first retryable failure stays retryable, so the run waits rather than dying", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const body = { status: "failed_retryable", error: "Please limit requests" };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(body),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_retryable");
    expect(stored?.error).toBe("Please limit requests");
    expect(stored?.attempts).toBe(1);
  });

  test("a retryable failure on the last attempt is demoted to permanent", async () => {
    const exhausting = run({
      status: "failed_retryable",
      attempts: 1,
      error: "Please limit requests",
      completedAt: new Date(CREATED_AT.getTime() - RETRY_AFTER_MS - 1),
    });
    const { store, runs } = inMemoryInquiryRunStore([exhausting]);
    const body = { status: "failed_retryable", error: "Please limit requests" };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(body),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.attempts).toBe(2);
    expect(stored?.status).toBe("failed_permanent");
  });

  test("a run still inside its quiet interval is not claimed", async () => {
    const waiting = run({
      status: "failed_retryable",
      attempts: 1,
      completedAt: new Date(),
    });
    const { store } = inMemoryInquiryRunStore([waiting]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute();

    expect(result).toEqual({ runId: null, status: null });
  });

  test("a thrown transport error is permanent, not retryable", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new Error("POST /graphs/awareness/run 500")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("POST /graphs/awareness/run 500");
  });

  test("a status the domain does not know is permanent, not silently accepted", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "kinda_worked" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("unusable graph status: kinda_worked");
  });

  test("an unfinished status is permanent, so no completed run is left unclaimable", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "running" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("unusable graph status: running");
  });

  test("a malformed distribution row is permanent, not persisted as an answer", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const body = {
      ...SUCCESS_BODY,
      distribution: [{ country: "Sudan", awareness: 4.2, covered_buckets: 20 }],
    };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(body),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph distribution");
    expect(stored?.distribution).toEqual([]);
  });

  test("a run stranded by a crash is reclaimed, not left running forever", async () => {
    const stranded = run({
      status: "running",
      attempts: 1,
      startedAt: new Date(Date.now() - RUN_TIMEOUT_MS * 3),
    });
    const { store, runs } = inMemoryInquiryRunStore([stranded]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.attempts).toBe(2);
  });

  test("a run still inside its timeout is left to the worker holding it", async () => {
    const live = run({ status: "running", attempts: 1, startedAt: new Date() });
    const { store } = inMemoryInquiryRunStore([live]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute();

    expect(result).toEqual({ runId: null, status: null });
  });

  test("a run stranded past its attempts is abandoned rather than measured again", async () => {
    const exhausted = run({
      status: "running",
      attempts: 2,
      startedAt: new Date(Date.now() - RUN_TIMEOUT_MS * 3),
    });
    const { store, runs } = inMemoryInquiryRunStore([exhausted]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new Error("the graph must not be called for an abandoned run")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("abandoned after 2 interrupted attempts");
    expect(stored?.completedAt).not.toBeNull();
  });

  test("a run stranded across a restart is abandoned rather than measured cold", async () => {
    const stale = run({
      status: "failed_retryable",
      attempts: 1,
      createdAt: LONG_AGO,
      completedAt: new Date(LONG_AGO.getTime() + RETRY_AFTER_MS),
    });
    const { store, runs } = inMemoryInquiryRunStore([stale]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new Error("the graph must not be called for a run this old")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("abandoned: outlived its retry budget");
  });

  test("a question queued while the worker was down is measured, not abandoned", async () => {
    const waiting = run({ createdAt: LONG_AGO });
    const { store, runs } = inMemoryInquiryRunStore([waiting]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
  });

  test("the freshest question is claimed first, so it never waits behind a stranded run", async () => {
    const stranded = run({
      id: makeInquiryRunId("run-stranded"),
      status: "failed_retryable",
      attempts: 1,
      createdAt: LONG_AGO,
      completedAt: new Date(LONG_AGO.getTime() + RETRY_AFTER_MS),
    });
    const fresh = run({ id: makeInquiryRunId("run-fresh") });
    const { store } = inMemoryInquiryRunStore([stranded, fresh]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute();

    expect(result).toEqual({ runId: fresh.id, status: "succeeded" });
  });

  test("a graph that never answers gives up and stays retryable, freeing the worker", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(store, hanging(), RETRY_AFTER_MS, 5);

    const result = await useCase.execute();

    expect(result.status).toBe("failed_retryable");
    const [stored] = runs();
    expect(stored?.status).toBe("failed_retryable");
    expect(stored?.error).toContain("did not answer within 5ms");
    expect(stored?.completedAt).not.toBeNull();
  });
});
