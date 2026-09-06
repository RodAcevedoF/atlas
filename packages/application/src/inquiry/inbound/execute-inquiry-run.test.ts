import { describe, expect, test } from "bun:test";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import {
  CREATED_AT,
  LONG_AGO,
  RETRY_AFTER_MS,
  RUN_TIMEOUT_MS,
  SUCCESS_BODY,
  inquiryRun,
} from "../../testing/inquiry-run.builder.ts";
import { answering, failing, hanging, orchestrating } from "../../testing/orchestration.fake.ts";
import { GraphUnavailableError, GraphUnreadableError } from "../../world/outbound/orchestration.ts";
import { INQUIRY_MAX_ATTEMPTS } from "../outbound/inquiry-run-store.ts";
import { ExecuteInquiryRunUseCase } from "./execute-inquiry-run.ts";

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
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
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
    expect(stored?.failure).toBeNull();
    expect(stored?.synthesis).toBe("Reported activity concentrates on Khartoum.");
    expect(stored?.places).toHaveLength(1);
    expect(stored?.places[0]?.claims[0]?.sourceUrl).toBe("https://example.test/article");
    expect(stored?.places[0]?.claims[0]?.sourceImageUrl).toBe(
      "https://images.example.test/article.jpg",
    );
    expect(stored?.places[0]?.read).toEqual(SUCCESS_BODY.places[0]?.read);
    expect(stored?.documents).toEqual(SUCCESS_BODY.documents);
    expect(stored?.completedAt).not.toBeNull();
  });

  test("a first retryable failure stays retryable, so the run waits rather than dying", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
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
    expect(stored?.failure).toBe("transport");
    expect(stored?.error).toBe("Please limit requests");
    expect(stored?.attempts).toBe(1);
  });

  test("a retryable failure on the last attempt is demoted to permanent", async () => {
    const exhausting = inquiryRun({
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

  test("a later pre-retrieval failure does not erase documents paid for on an earlier attempt", async () => {
    const paidDocuments = SUCCESS_BODY.documents;
    const retrying = inquiryRun({
      status: "failed_retryable",
      attempts: 1,
      documents: paidDocuments,
      error: "normaliser unavailable",
      completedAt: new Date(CREATED_AT.getTime() - RETRY_AFTER_MS - 1),
    });
    const { store, runs } = inMemoryInquiryRunStore([retrying]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "failed_retryable", error: "Exa unavailable" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.documents).toEqual(paidDocuments);
  });

  test("a run still inside its quiet interval is not claimed", async () => {
    const waiting = inquiryRun({
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
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new GraphUnavailableError("POST /graphs/inquiry/run unreachable: fetch failed")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_retryable");
    expect(stored?.failure).toBe("transport");
    expect(stored?.error).toBe("POST /graphs/inquiry/run unreachable: fetch failed");
  });

  test("an engine that keeps failing still lands somewhere terminal", async () => {
    const { store, runs } = inMemoryInquiryRunStore([
      inquiryRun({ attempts: INQUIRY_MAX_ATTEMPTS - 1 }),
    ]);
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
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(new Error("POST /graphs/inquiry/run 422 Unprocessable Entity")),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.failure).toBe("internal");
    expect(stored?.error).toBe("POST /graphs/inquiry/run 422 Unprocessable Entity");
  });

  test("the run's window reaches the graph, so the label the UI shows is the one retrieved", async () => {
    const { store } = inMemoryInquiryRunStore([inquiryRun({ window: "1w" })]);
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
  test("a run stranded by a crash is reclaimed, not left running forever", async () => {
    const stranded = inquiryRun({
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
    const live = inquiryRun({ status: "running", attempts: 1, startedAt: new Date() });
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
    const exhausted = inquiryRun({
      status: "running",
      attempts: 2,
      documents: SUCCESS_BODY.documents,
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
    expect(stored?.failure).toBe("abandoned");
    expect(stored?.error).toBe("abandoned after 2 interrupted attempts");
    expect(stored?.documents).toEqual(SUCCESS_BODY.documents);
    expect(stored?.completedAt).not.toBeNull();
  });

  test("a run stranded across a restart is abandoned rather than measured cold", async () => {
    const stale = inquiryRun({
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
    expect(stored?.failure).toBe("abandoned");
    expect(stored?.error).toBe("abandoned: outlived its retry budget");
  });

  test("a question queued while the worker was down is measured, not abandoned", async () => {
    const waiting = inquiryRun({ createdAt: LONG_AGO });
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
    const stranded = inquiryRun({
      id: makeInquiryRunId("run-stranded"),
      status: "failed_retryable",
      attempts: 1,
      createdAt: LONG_AGO,
      completedAt: new Date(LONG_AGO.getTime() + RETRY_AFTER_MS),
    });
    const fresh = inquiryRun({ id: makeInquiryRunId("run-fresh") });
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
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(store, hanging(), RETRY_AFTER_MS, 5);

    const result = await useCase.execute();

    expect(result.status).toBe("failed_retryable");
    const [stored] = runs();
    expect(stored?.status).toBe("failed_retryable");
    expect(stored?.failure).toBe("transport");
    expect(stored?.error).toContain("did not answer within 5ms");
    expect(stored?.completedAt).not.toBeNull();
  });

  test("a graph answering with an unreadable body blames the answer, not Atlas", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      failing(
        new GraphUnreadableError("POST /graphs/inquiry/run answered with an unreadable body"),
      ),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.failure).toBe("unusable_result");
  });

  test("an honest empty answer carries no class — no coverage is not a failure", async () => {
    const { store, runs } = inMemoryInquiryRunStore([inquiryRun()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, status: "no_coverage", places: [] }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("no_coverage");
    expect(stored?.failure).toBeNull();
  });

  test("a re-claimed run drops the class of its last attempt rather than carrying it", async () => {
    const retried = inquiryRun({
      status: "failed_retryable",
      failure: "transport",
      error: "POST /graphs/inquiry/run unreachable",
      attempts: 1,
      completedAt: new Date(CREATED_AT.getTime() - RETRY_AFTER_MS - 1),
    });
    const { store, runs } = inMemoryInquiryRunStore([retried]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(SUCCESS_BODY),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.failure).toBeNull();
  });

  test("a dispatched job executes the run it names, not whichever run is newest", async () => {
    const target = inquiryRun({ id: makeInquiryRunId("run-wanted") });
    const newer = inquiryRun({
      id: makeInquiryRunId("run-newer"),
      createdAt: new Date(CREATED_AT.getTime() + 60_000),
    });
    const { store, runs } = inMemoryInquiryRunStore([target, newer]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "no_coverage" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute(target.id);

    expect(result.runId).toBe(target.id);
    expect(runs().find((stored) => stored.id === newer.id)?.status).toBe("queued");
  });

  test("a run another worker already holds is not executed a second time", async () => {
    const held = inquiryRun({ status: "running", startedAt: CREATED_AT });
    const { store } = inMemoryInquiryRunStore([held]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "no_coverage" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const result = await useCase.execute(held.id);

    expect(result.runId).toBeNull();
    expect(result.status).toBeNull();
  });

  test("a duplicate delivery of the same job runs the inquiry once", async () => {
    const queued = inquiryRun();
    const { store } = inMemoryInquiryRunStore([queued]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ status: "no_coverage" }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    const first = await useCase.execute(queued.id);
    const second = await useCase.execute(queued.id);

    expect(first.runId).toBe(queued.id);
    expect(second.runId).toBeNull();
  });
});
