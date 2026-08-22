import { describe, expect, test } from "bun:test";
import type { InquiryRun, InquiryRunStatus } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import {
  InquiryDailyCapReachedError,
  InvalidInquiryQuestionError,
  RequestInquiryRunUseCase,
} from "./request-inquiry-run.ts";

const DAILY_CAP = 3;
const QUESTION = "who is covering the Sudan famine";
const QUESTION_KEY = "who is covering the sudan famine";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function run(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId("run-1"),
    question: QUESTION,
    questionKey: QUESTION_KEY,
    day: today(),
    executedQuery: null,
    window: "1w",
    distribution: [],
    exemplars: [],
    synthesis: null,
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("RequestInquiryRunUseCase", () => {
  test("a new question is queued for the worker", async () => {
    const { store, runs } = inMemoryInquiryRunStore();
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: QUESTION });

    expect(result.status).toBe("queued");
    expect(result.deduped).toBe(false);
    const [stored] = runs();
    expect(stored?.id).toBe(result.runId);
    expect(stored?.question).toBe(QUESTION);
    expect(stored?.questionKey).toBe(QUESTION_KEY);
    expect(stored?.day).toBe(today());
    expect(stored?.attempts).toBe(0);
    expect(stored?.window).toBe("1w");
  });

  const reused: { name: string; status: InquiryRunStatus }[] = [
    { name: "an answer already paid for is served, not re-measured", status: "succeeded" },
    { name: "an honest empty answer is still an answer", status: "no_coverage" },
    { name: "a run already waiting for the worker is not queued twice", status: "queued" },
    {
      name: "a run the worker holds is not fanned out into a second GDELT call",
      status: "running",
    },
    { name: "a pending retry is served rather than jumped ahead of", status: "failed_retryable" },
  ];

  for (const { name, status } of reused) {
    test(name, async () => {
      const { store, runs } = inMemoryInquiryRunStore([run({ status })]);
      const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

      const result = await useCase.execute({ question: QUESTION });

      expect(result).toEqual({ runId: makeInquiryRunId("run-1"), status, deduped: true });
      expect(runs()).toHaveLength(1);
    });
  }

  test("a permanently failed question can be asked again, because it never answered", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run({ status: "failed_permanent" })]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: QUESTION });

    expect(result.deduped).toBe(false);
    expect(result.status).toBe("queued");
    expect(runs()).toHaveLength(2);
  });

  test("the newest run of the day decides, so a re-ask after a failure serves the retry", async () => {
    const failed = run({
      id: makeInquiryRunId("run-old"),
      status: "failed_permanent",
      createdAt: new Date(Date.now() - 60_000),
    });
    const retried = run({ id: makeInquiryRunId("run-new"), status: "queued" });
    const { store } = inMemoryInquiryRunStore([failed, retried]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: QUESTION });

    expect(result.runId).toBe(makeInquiryRunId("run-new"));
    expect(result.deduped).toBe(true);
  });

  test("a differently typed repeat of the same question is the same question", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: "  Who is COVERING   the Sudan\nfamine  " });

    expect(result.deduped).toBe(true);
    expect(runs()).toHaveLength(1);
  });

  test("yesterday's answer does not satisfy today's question", async () => {
    const stale = run({ day: "2020-01-01" });
    const { store, runs } = inMemoryInquiryRunStore([stale]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: QUESTION });

    expect(result.deduped).toBe(false);
    expect(runs()).toHaveLength(2);
  });

  test("the day's cap rejects a new question honestly", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
    );
    const { store, runs } = inMemoryInquiryRunStore(seed);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const request = useCase.execute({ question: QUESTION });

    await expect(request).rejects.toBeInstanceOf(InquiryDailyCapReachedError);
    expect(runs()).toHaveLength(DAILY_CAP);
  });

  test("a repeat is served past the cap, so the cheapest path is never the punished one", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
    );
    const { store } = inMemoryInquiryRunStore([...seed, run({ id: makeInquiryRunId("run-4") })]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: QUESTION });

    expect(result).toEqual({
      runId: makeInquiryRunId("run-4"),
      status: "succeeded",
      deduped: true,
    });
  });

  test("yesterday's runs do not spend today's cap", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({
        id: makeInquiryRunId(`run-${index}`),
        questionKey: `question ${index}`,
        day: "2020-01-01",
      }),
    );
    const { store } = inMemoryInquiryRunStore(seed);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({ question: QUESTION });

    expect(result.status).toBe("queued");
  });

  const rejected = [
    { name: "a blank question is refused before it becomes a key", question: "   \n " },
    {
      name: "an unbounded question is refused before it becomes a prompt",
      question: "x".repeat(501),
    },
  ];

  for (const { name, question } of rejected) {
    test(name, async () => {
      const { store, runs } = inMemoryInquiryRunStore();
      const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

      const request = useCase.execute({ question });

      await expect(request).rejects.toBeInstanceOf(InvalidInquiryQuestionError);
      expect(runs()).toHaveLength(0);
    });
  }
});
