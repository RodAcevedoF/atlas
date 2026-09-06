import { describe, expect, test } from "bun:test";
import type { InquiryFailureKind, InquiryRun, InquiryRunActor } from "@atlas/domain";
import { makeInquiryRunId, makeUserId, queuedInquiryProgress } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { GetInquiryRunUseCase } from "./get-inquiry-run.ts";

const FAILED_ID = makeInquiryRunId("run-failed");
const OWNER_ID = makeUserId("user-1");
const owner: InquiryRunActor = { id: OWNER_ID, role: "user" };
const stranger: InquiryRunActor = { id: makeUserId("user-2"), role: "user" };
const admin: InquiryRunActor = { id: makeUserId("user-admin"), role: "admin" };
const superAdmin: InquiryRunActor = { id: makeUserId("user-super"), role: "super_admin" };

function failedRun(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: FAILED_ID,
    ownerId: OWNER_ID,
    question: "where are wildfires burning right now",
    questionKey: "where are wildfires burning right now",
    day: "2026-08-23",
    window: "1w",
    places: [],
    documents: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "failed_permanent",
    failure: null,
    error: null,
    attempts: 1,
    progress: queuedInquiryProgress(new Date(2026, 7, 23, 9, 0, 0)),
    completion: null,
    degradations: [],
    createdAt: new Date(2026, 7, 23, 9, 0, 0),
    startedAt: new Date(2026, 7, 23, 9, 0, 1),
    completedAt: new Date(2026, 7, 23, 9, 0, 30),
    ...overrides,
  };
}

function useCaseOver(seed: InquiryRun[]): GetInquiryRunUseCase {
  const { store } = inMemoryInquiryRunStore(seed);
  return new GetInquiryRunUseCase(store);
}

describe("GetInquiryRunUseCase", () => {
  const cases: { name: string; run: Partial<InquiryRun>; failure: InquiryFailureKind | null }[] = [
    {
      name: "a permanent failure reaches the reader as a class, or the UI can only say Failed",
      run: { status: "failed_permanent", failure: "transport", attempts: 3 },
      failure: "transport",
    },
    {
      name: "a retryable failure carries the attempt count, so a retry loop is visible",
      run: { status: "failed_retryable", failure: "transport", attempts: 1 },
      failure: "transport",
    },
    {
      name: "a failure with no recorded class serves null rather than dropping the key",
      run: { status: "failed_permanent", failure: null, attempts: 2 },
      failure: null,
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, async () => {
      const useCase = useCaseOver([failedRun(testCase.run)]);

      const served = await useCase.execute(FAILED_ID, owner);

      expect(served?.failure).toBe(testCase.failure);
      expect(served?.attempts).toBe(testCase.run.attempts);
    });
  }

  test("the raw upstream text never reaches the reader, only the class does", async () => {
    const useCase = useCaseOver([
      failedRun({ failure: "transport", error: "exa search returned 502 for key sk-live-abc" }),
    ]);

    const served = await useCase.execute(FAILED_ID, owner);

    expect(served?.failure).toBe("transport");
    expect(served).not.toHaveProperty("error");
  });

  test("an unknown run is not found", async () => {
    const useCase = useCaseOver([]);

    const served = await useCase.execute(FAILED_ID, owner);

    expect(served).toBeNull();
  });

  const hiddenCases = [
    { name: "another user cannot read the run", actor: stranger },
    { name: "an admin cannot read another user's run", actor: admin },
  ];

  for (const { name, actor } of hiddenCases) {
    test(name, async () => {
      const useCase = useCaseOver([failedRun({ status: "succeeded" })]);

      const served = await useCase.execute(FAILED_ID, actor);

      expect(served).toBeNull();
    });
  }

  test("a super admin can read another user's run", async () => {
    const useCase = useCaseOver([failedRun({ status: "succeeded" })]);

    const served = await useCase.execute(FAILED_ID, superAdmin);

    expect(served?.id).toBe(FAILED_ID);
  });
});
