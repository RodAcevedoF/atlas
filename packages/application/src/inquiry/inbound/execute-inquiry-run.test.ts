import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "@atlas/domain";
import { makeInquiryRunId, makeUserId, queuedInquiryProgress } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import type {
  GraphRunInput,
  GraphStreamInput,
  OrchestrationPort,
} from "../../world/outbound/orchestration.ts";
import { GraphUnavailableError, GraphUnreadableError } from "../../world/outbound/orchestration.ts";
import type { InquiryRunEnvelope } from "../../world/outbound/run-envelope.ts";
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
    documents: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "queued",
    failure: null,
    error: null,
    attempts: 0,
    progress: queuedInquiryProgress(CREATED_AT),
    completion: null,
    degradations: [],
    createdAt: CREATED_AT,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

function terminal(body: Record<string, unknown>, sequence: number): InquiryRunEnvelope {
  return {
    schemaVersion: 1,
    runId: "run-1",
    attempt: 1,
    sequence,
    type: body.status === "succeeded" ? "run_complete" : "run_failed",
    occurredAt: CREATED_AT,
    durationMs: 0,
    data: { result: body, failureClass: "transport" },
  };
}

function streaming(frames: (input: GraphStreamInput) => AsyncIterable<InquiryRunEnvelope>) {
  return {
    run: () => Promise.reject(new Error("run is no longer the worker path")),
    stream: frames,
    resume: () => {
      throw new Error("resume is not part of the worker path");
    },
  } satisfies OrchestrationPort;
}

function orchestrating(answer: (input: GraphRunInput) => Promise<Record<string, unknown>>) {
  return streaming(async function* (input) {
    yield terminal(await answer(input), 1);
  });
}

function answering(body: Record<string, unknown>): OrchestrationPort {
  return orchestrating(() => Promise.resolve(body));
}

function progressing(
  milestones: InquiryRunEnvelope[],
  body: Record<string, unknown>,
): OrchestrationPort {
  return streaming(async function* () {
    yield* milestones;
    yield terminal(body, milestones.length + 1);
  });
}

function stalling(milestones: InquiryRunEnvelope[]): OrchestrationPort {
  return streaming(async function* () {
    yield* milestones;
    await new Promise<never>(() => {});
  });
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
      claimCount: 2,
      read: {
        text: "Reports describe displacement and disrupted aid routes.",
        sourceUrls: ["https://example.test/article"],
      },
      claims: [
        {
          text: "clashes displaced 7,800 people",
          confidence: 0.8,
          sourceUrl: "https://example.test/article",
          sourceTitle: "a headline",
          publishedDate: "2026-08-20T00:00:00.000Z",
          sourceImageUrl: "https://images.example.test/article.jpg",
        },
        {
          text: "aid routes were disrupted",
          confidence: 0.7,
          sourceUrl: "https://example.test/article-2",
          sourceTitle: "another headline",
          publishedDate: "2026-08-20T00:00:00.000Z",
          sourceImageUrl: null,
        },
      ],
    },
  ],
  documents: [
    {
      url: "https://example.test/article",
      title: "a headline",
      publishedDate: "2026-08-20T00:00:00.000Z",
      text: "the article body",
      highlights: ["a highlighted passage"],
    },
  ],
  claimCount: 3,
  unplacedClaims: 1,
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
    expect(stored?.failure).toBe("transport");
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

  test("a later pre-retrieval failure does not erase documents paid for on an earlier attempt", async () => {
    const paidDocuments = SUCCESS_BODY.documents;
    const retrying = run({
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
    expect(stored?.failure).toBe("transport");
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
    expect(stored?.failure).toBe("internal");
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
    expect(stored?.failure).toBe("unusable_result");
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
        places: [
          {
            ...place,
            claims: [{ ...place.claims[0], sourceTitle: 7 }, place.claims[1]],
          },
        ],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph places");
  });

  test("a historical graph response without an image field is normalized to null", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const place = SUCCESS_BODY.places[0];
    const claim = place.claims[0];
    const { sourceImageUrl, ...historicalClaim } = claim;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        places: [{ ...place, claims: [historicalClaim, place.claims[1]] }],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(sourceImageUrl).toBe("https://images.example.test/article.jpg");
    expect(stored?.places[0]?.claims[0]?.sourceImageUrl).toBeNull();
  });

  test("a historical graph response without a place read normalizes it to null", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const place = SUCCESS_BODY.places[0];
    const { read, ...historicalPlace } = place;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({ ...SUCCESS_BODY, places: [historicalPlace] }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(read).not.toBeNull();
    expect(stored?.places[0]?.read).toBeNull();
  });

  test("a place read citing another source is dropped without losing the research run", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const place = SUCCESS_BODY.places[0];
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        places: [
          {
            ...place,
            read: { text: place.read.text, sourceUrls: ["https://example.test/not-a-claim"] },
          },
        ],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("succeeded");
    expect(stored?.synthesis).toBe(SUCCESS_BODY.synthesis);
    expect(stored?.places[0]?.read).toBeNull();
  });

  test("a historical graph response without documents persists an empty collection", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const { documents, ...historicalBody } = SUCCESS_BODY;
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering(historicalBody),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(documents).toHaveLength(1);
    expect(stored?.documents).toEqual([]);
  });

  test("an unusable source document cannot corrupt the stored extraction inputs", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new ExecuteInquiryRunUseCase(
      store,
      answering({
        ...SUCCESS_BODY,
        documents: [{ ...SUCCESS_BODY.documents[0], highlights: "not a list" }],
      }),
      RETRY_AFTER_MS,
      RUN_TIMEOUT_MS,
    );

    await useCase.execute();

    const [stored] = runs();
    expect(stored?.status).toBe("failed_permanent");
    expect(stored?.error).toContain("unusable graph documents");
    expect(stored?.documents).toEqual([]);
  });

  const unsafeImageUrls = [
    "http://images.example.test/article.jpg",
    "https://reader:secret@images.example.test/article.jpg",
    "https://",
    " https://images.example.test/article.jpg ",
  ];

  for (const sourceImageUrl of unsafeImageUrls) {
    test(`an unsafe source image URL is rejected: ${sourceImageUrl}`, async () => {
      const { store, runs } = inMemoryInquiryRunStore([run()]);
      const place = SUCCESS_BODY.places[0];
      const claim = place.claims[0];
      const useCase = new ExecuteInquiryRunUseCase(
        store,
        answering({
          ...SUCCESS_BODY,
          places: [
            {
              ...place,
              claims: [{ ...claim, sourceImageUrl }, place.claims[1]],
            },
          ],
        }),
        RETRY_AFTER_MS,
        RUN_TIMEOUT_MS,
      );

      await useCase.execute();

      const [stored] = runs();
      expect(stored?.status).toBe("failed_permanent");
      expect(stored?.error).toContain("unusable graph places");
    });
  }

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
    expect(stored?.failure).toBe("abandoned");
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
    expect(stored?.failure).toBe("transport");
    expect(stored?.error).toContain("did not answer within 5ms");
    expect(stored?.completedAt).not.toBeNull();
  });

  test("a graph answering with an unreadable body blames the answer, not Atlas", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
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
    const { store, runs } = inMemoryInquiryRunStore([run()]);
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
    const retried = run({
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
    const target = run({ id: makeInquiryRunId("run-wanted") });
    const newer = run({
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
    const held = run({ status: "running", startedAt: CREATED_AT });
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
    const queued = run();
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
      const { store } = inMemoryInquiryRunStore([run()]);
      const observed: (InquiryRun | null)[] = [];
      const useCase = new ExecuteInquiryRunUseCase(
        store,
        streaming(async function* () {
          yield RETRIEVED;
          yield MAPPED;
          observed.push(await store.findInquiryRunById(makeInquiryRunId("run-1")));
          yield terminal(SUCCESS_BODY, 3);
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
      const useCase = new ExecuteInquiryRunUseCase(store, stalling([RETRIEVED]), RETRY_AFTER_MS, 5);

      const result = await useCase.execute();

      const [stored] = runs();
      expect(result.status).toBe("failed_retryable");
      expect(stored?.completion).toBeNull();
      expect(stored?.documents).toEqual(SUCCESS_BODY.documents);
    });

    test("a retry that dies before its own map keeps the map an earlier attempt paid for", async () => {
      const mapped = run({
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
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
      const { store } = inMemoryInquiryRunStore([run()]);
      const observed: (InquiryRun | null)[] = [];
      const useCase = new ExecuteInquiryRunUseCase(
        store,
        streaming(async function* () {
          yield milestone("map_ready", 1, { places: "not a map" });
          observed.push(await store.findInquiryRunById(makeInquiryRunId("run-1")));
          yield terminal(SUCCESS_BODY, 2);
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
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
      const { store, runs } = inMemoryInquiryRunStore([run()]);
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
});
