import { describe, expect, test } from "bun:test";
import type { InquiryAttachment, InquiryRun, InquiryRunStatus } from "@atlas/domain";
import { makeInquiryAttachmentId, makeInquiryRunId, makeUserId } from "@atlas/domain";
import { InMemoryInquiryAttachmentStore } from "../../testing/inquiry-attachment-store.fake.ts";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import {
  InquiryDailyCapReachedError,
  InvalidInquiryQuestionError,
  RequestInquiryRunUseCase,
} from "./request-inquiry-run.ts";

const DAILY_CAP = 3;
const QUESTION = "who is covering the Sudan famine";
const QUESTION_KEY = "who is covering the sudan famine";
const OWNER = makeUserId("user-1");

function interpretedAttachment(): InquiryAttachment {
  return {
    id: makeInquiryAttachmentId("attachment-1"),
    ownerId: OWNER,
    filename: "companies.csv",
    mediaType: "text/csv",
    profile: { sheetCount: 1, sheets: [], sheetsTruncated: false },
    interpretation: {
      summary: "Companies",
      facts: [],
      entities: [],
      proposedQuestion: QUESTION,
      needsClarification: false,
      clarificationQuestion: null,
    },
    interpretationCount: 1,
    runId: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function run(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId("run-1"),
    ownerId: OWNER,
    question: QUESTION,
    questionKey: QUESTION_KEY,
    day: today(),

    window: "1w",
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
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

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

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

  test("an interpreted attachment is linked to the normal run that spends the search", async () => {
    const { store } = inMemoryInquiryRunStore();
    const draft = interpretedAttachment();
    const attachments = new InMemoryInquiryAttachmentStore([draft]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP, attachments);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
      attachmentId: draft.id,
    });
    const submitted = await attachments.findInquiryAttachmentById(draft.id);

    expect(submitted?.runId).toBe(result.runId);
    expect(submitted?.expiresAt).toBeNull();
  });

  test("an expired draft cannot be revived by attaching it to a new run", async () => {
    const { store, runs } = inMemoryInquiryRunStore();
    const draft = { ...interpretedAttachment(), expiresAt: new Date(0) };
    const attachments = new InMemoryInquiryAttachmentStore([draft]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP, attachments);

    const request = useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
      attachmentId: draft.id,
    });

    await expect(request).rejects.toBeInstanceOf(InvalidInquiryQuestionError);
    expect(runs()).toHaveLength(0);
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

      const result = await useCase.execute({
        ownerId: OWNER,
        role: "user",
        question: QUESTION,
        refresh: false,
      });

      expect(result).toEqual({ runId: makeInquiryRunId("run-1"), status, deduped: true });
      expect(runs()).toHaveLength(1);
    });
  }

  test("another user asking the same question today gets their own run to own", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run({ status: "succeeded" })]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: makeUserId("user-2"),
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    expect(result.deduped).toBe(false);
    expect(runs()).toHaveLength(2);
    expect(runs().map((stored) => stored.ownerId)).toContain(makeUserId("user-2"));
  });

  test("a permanently failed question can be asked again, because it never answered", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run({ status: "failed_permanent" })]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

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

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    expect(result.runId).toBe(makeInquiryRunId("run-new"));
    expect(result.deduped).toBe(true);
  });

  test("a differently typed repeat of the same question is the same question", async () => {
    const { store, runs } = inMemoryInquiryRunStore([run()]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: "  Who is COVERING   the Sudan\nfamine  ",
      refresh: false,
    });

    expect(result.deduped).toBe(true);
    expect(runs()).toHaveLength(1);
  });

  test("yesterday's answer does not satisfy today's question", async () => {
    const stale = run({ day: "2020-01-01" });
    const { store, runs } = inMemoryInquiryRunStore([stale]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    expect(result.deduped).toBe(false);
    expect(runs()).toHaveLength(2);
  });

  test("the day's cap rejects a new question honestly", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
    );
    const { store, runs } = inMemoryInquiryRunStore(seed);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const request = useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    await expect(request).rejects.toBeInstanceOf(InquiryDailyCapReachedError);
    expect(runs()).toHaveLength(DAILY_CAP);
  });

  test("a repeat is served past the cap, so the cheapest path is never the punished one", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
    );
    const { store } = inMemoryInquiryRunStore([...seed, run({ id: makeInquiryRunId("run-4") })]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

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

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    expect(result.status).toBe("queued");
  });

  test("a refresh re-asks today's answered question rather than replaying it", async () => {
    const answered = run();
    const { store, runs } = inMemoryInquiryRunStore([answered]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: true,
    });

    expect(result.deduped).toBe(false);
    expect(result.status).toBe("queued");
    expect(result.runId).not.toBe(answered.id);
    expect(runs()).toHaveLength(2);
    expect(runs().find((stored) => stored.id === answered.id)).toEqual(answered);
  });

  const inFlight: { name: string; status: InquiryRunStatus }[] = [
    { name: "a refresh waits for the run the worker is holding", status: "running" },
    { name: "a refresh does not queue a second run behind one already queued", status: "queued" },
  ];

  for (const { name, status } of inFlight) {
    test(name, async () => {
      const { store, runs } = inMemoryInquiryRunStore([run({ status })]);
      const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

      const result = await useCase.execute({
        ownerId: OWNER,
        role: "user",
        question: QUESTION,
        refresh: true,
      });

      expect(result).toEqual({ runId: makeInquiryRunId("run-1"), status, deduped: true });
      expect(runs()).toHaveLength(1);
    });
  }

  test("a refresh past the cap still re-asks, because a refresh does not spend", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
    );
    const { store, runs } = inMemoryInquiryRunStore([
      ...seed,
      run({ id: makeInquiryRunId("run-4") }),
    ]);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: true,
    });

    expect(result.deduped).toBe(false);
    expect(result.status).toBe("queued");
    expect(runs()).toHaveLength(5);
  });

  test("another user's answers do not spend this user's cap", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({
        id: makeInquiryRunId(`run-${index}`),
        ownerId: makeUserId("user-2"),
        questionKey: `question ${index}`,
      }),
    );
    const { store } = inMemoryInquiryRunStore(seed);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    expect(result.status).toBe("queued");
  });

  test("a failed run does not spend the cap, so a new question is still accepted", async () => {
    const seed = [1, 2, 3].map((index) =>
      run({
        id: makeInquiryRunId(`run-${index}`),
        questionKey: `question ${index}`,
        status: "failed_permanent",
      }),
    );
    const { store } = inMemoryInquiryRunStore(seed);
    const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

    const result = await useCase.execute({
      ownerId: OWNER,
      role: "user",
      question: QUESTION,
      refresh: false,
    });

    expect(result.status).toBe("queued");
  });

  const unlimited: { name: string; role: "admin" | "super_admin" }[] = [
    { name: "an admin is not capped", role: "admin" },
    { name: "a super admin is not capped", role: "super_admin" },
  ];

  for (const { name, role } of unlimited) {
    test(name, async () => {
      const seed = [1, 2, 3].map((index) =>
        run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
      );
      const { store } = inMemoryInquiryRunStore(seed);
      const useCase = new RequestInquiryRunUseCase(store, DAILY_CAP);

      const result = await useCase.execute({
        ownerId: OWNER,
        role,
        question: QUESTION,
        refresh: false,
      });

      expect(result.status).toBe("queued");
    });
  }

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

      const request = useCase.execute({
        ownerId: OWNER,
        role: "user",
        question,
        refresh: false,
      });

      await expect(request).rejects.toBeInstanceOf(InvalidInquiryQuestionError);
      expect(runs()).toHaveLength(0);
    });
  }
});
