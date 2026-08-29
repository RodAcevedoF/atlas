import { describe, expect, test } from "bun:test";
import type { InquiryRun, UserRole } from "@atlas/domain";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { GetInquiryBudgetUseCase } from "./get-inquiry-budget.ts";

const DAILY_CAP = 5;
const OWNER = makeUserId("user-1");
const QUESTION = "who is covering the Sudan famine";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function run(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId("run-1"),
    ownerId: OWNER,
    question: QUESTION,
    questionKey: QUESTION.toLowerCase(),
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

describe("GetInquiryBudgetUseCase", () => {
  test("a user with no answered questions has the full day left", async () => {
    const { store } = inMemoryInquiryRunStore();
    const useCase = new GetInquiryBudgetUseCase(store, DAILY_CAP);

    const budget = await useCase.execute({ ownerId: OWNER, role: "user" });

    expect(budget).toEqual({ used: 0, cap: DAILY_CAP, remaining: DAILY_CAP });
  });

  test("each succeeded question spends one slot", async () => {
    const seed = [1, 2].map((index) =>
      run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
    );
    const { store } = inMemoryInquiryRunStore(seed);
    const useCase = new GetInquiryBudgetUseCase(store, DAILY_CAP);

    const budget = await useCase.execute({ ownerId: OWNER, role: "user" });

    expect(budget).toEqual({ used: 2, cap: DAILY_CAP, remaining: 3 });
  });

  test("a refresh of the same question does not spend a second slot", async () => {
    const original = run({ id: makeInquiryRunId("run-1") });
    const refreshed = run({ id: makeInquiryRunId("run-2"), createdAt: new Date() });
    const { store } = inMemoryInquiryRunStore([original, refreshed]);
    const useCase = new GetInquiryBudgetUseCase(store, DAILY_CAP);

    const budget = await useCase.execute({ ownerId: OWNER, role: "user" });

    expect(budget.used).toBe(1);
    expect(budget.remaining).toBe(4);
  });

  test("another user's answers do not spend this user's budget", async () => {
    const stranger = run({ ownerId: makeUserId("user-2") });
    const { store } = inMemoryInquiryRunStore([stranger]);
    const useCase = new GetInquiryBudgetUseCase(store, DAILY_CAP);

    const budget = await useCase.execute({ ownerId: OWNER, role: "user" });

    expect(budget.used).toBe(0);
  });

  const unlimited: { name: string; role: UserRole }[] = [
    { name: "an admin has no cap", role: "admin" },
    { name: "a super admin has no cap", role: "super_admin" },
  ];

  for (const { name, role } of unlimited) {
    test(name, async () => {
      const seed = [1, 2, 3, 4, 5].map((index) =>
        run({ id: makeInquiryRunId(`run-${index}`), questionKey: `question ${index}` }),
      );
      const { store } = inMemoryInquiryRunStore(seed);
      const useCase = new GetInquiryBudgetUseCase(store, DAILY_CAP);

      const budget = await useCase.execute({ ownerId: OWNER, role });

      expect(budget).toEqual({ used: 0, cap: null, remaining: null });
    });
  }
});
