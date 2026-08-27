import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "@atlas/domain";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import { GraphUnavailableError } from "../../world/outbound/orchestration.ts";
import { INQUIRY_MAX_ATTEMPTS } from "../outbound/inquiry-run-store.ts";
import { ExecuteInquiryRunUseCase } from "./execute-inquiry-run.ts";

const RETRY_AFTER_MS = 11 * 60 * 1000;
const RUN_TIMEOUT_MS = 60 * 1000;
const CREATED_AT = new Date();
const LONG_AGO = new Date(CREATED_AT.getTime() - 48 * 60 * 60 * 1000);

function run(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId("run-1"),
    ownerId: makeUserId("user-1"),
    question: "who is covering the Sudan famine",
    questionKey: "who-is-covering-the-sudan-famine",
    day: "2026-08-16",
    window: "1w",
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
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
  places: [
    {
      place: "Khartoum",
      country: "Sudan",
      latitude: 15.5,
      longitude: 32.56,
      claimCount: 1,
      claims: [
        {
          text: "clashes displaced 7,800 people",
          confidence: 0.8,
          sourceUrl: "https://example.test/article",
          sourceTitle: "a headline",
          publishedDate: "2026-08-20T00:00:00.000Z",
        },
      ],
    },
  ],
  claimCount: 3,
  unplacedClaims: 2,
  costUsd: 0.045,
  synthesis: "Reported activity concentrates on Khartoum.",
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
    expect(stored?.synthesis).toBe("Reported activity concentrates on Khartoum.");
    expect(stored?.places).toHaveLength(1);
    expect(stored?.places[0]?.claims[0]?.sourceUrl).toBe("https://example.test/article");
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

  test("an unreachable engine is retryable, so a restart does not kill the question", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new GraphUnavailableError("POST /graphs/inquiry/run unreachable: fetch failed")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_retryable");
    expect(stored?.error).toBe("POST /graphs/inquiry/run unreachable: fetch failed");
  });

  test("an engine that keeps failing still lands somewhere terminal", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run({ attempts: INQUIRY_MAX_ATTEMPTS - 1 })]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new GraphUnavailableError("POST /graphs/inquiry/run 500 Internal Server Error")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
  });

  test("a rejected request is permanent — retrying an unusable call changes nothing", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new Error("POST /graphs/inquiry/run 422 Unprocessable Entity")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toBe("POST /graphs/inquiry/run 422 Unprocessable Entity");
  });

  test("the run's window reaches the graph, so the label the UI shows is the one retrieved", async () => {
    const { store } = inMemoryInquiryRunStore([run({ window: "1w" })]);
    const seen: Record<string, unknown>[] = [];
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      orchestrating((input) => {
        seen.push(input.input);
        return Promise.resolve(SUCCESS_BODY);
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    expect(seen[0]).toEqual({ question: "who is covering the Sudan famine", window: "1w" });
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

  test("a malformed place row is permanent, not persisted as an answer", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const body = {
      ...SUCCESS_BODY,
      places: [{ place: "Khartoum", latitude: 15.5, claimCount: 1, claims: [] }],
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
    expect(stored?.error).toContain("unusable graph places");
    expect(stored?.places).toEqual([]);
  });

  test("a place counting more claims than it carries is permanent, not a wrong number on screen", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const place = { ...(SUCCESS_BODY.places[0] as Record<string, unknown>), claimCount: 9 };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, places: [place] }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph places");
  });

  test("a claim whose nullable fields are not text is permanent, not stored as undefined", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const place = SUCCESS_BODY.places[0] as { claims: Record<string, unknown>[] };
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        places: [{ ...place, claims: [{ ...place.claims[0], sourceTitle: 7 }] }],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph places");
  });

  test("a count that is not a count is permanent, not silently zeroed", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, unplacedClaims: "two" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph counts");
    expect(stored?.unplacedClaims).toBe(0);
  });

  test("a body that omits the counts keeps the run, reading them as nothing measured", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const { claimCount, unplacedClaims, costUsd, ...withoutCounts } = SUCCESS_BODY;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(withoutCounts),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.claimCount).toBe(0);
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
