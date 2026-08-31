import { describe, expect, test } from "bun:test";
import type { InquiryRun, InquiryRunActor, InquiryRunStatus } from "@atlas/domain";
import { makeInquiryRunId, makeUserId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { GetInquiryRunUseCase } from "./get-inquiry-run.ts";

const FAILED_ID = makeInquiryRunId("run-failed");
const OWNER_ID = makeUserId("user-1");
const owner: InquiryRunActor = { id: OWNER_ID, role: "user" };
const stranger: InquiryRunActor = { id: makeUserId("user-2"), role: "user" };
const admin: InquiryRunActor = { id: makeUserId("user-admin"), role: "admin" };
const superAdmin: InquiryRunActor = { id: makeUserId("user-super"), role: "super_admin" };

function failedRun(status: InquiryRunStatus, error: string | null, attempts: number): InquiryRun {
  return {
    id: FAILED_ID,
    ownerId: OWNER_ID,
    question: "where are wildfires burning right now",
    questionKey: "where are wildfires burning right now",
    day: "2026-08-23",
    window: "1w",
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status,
    error,
    attempts,
    createdAt: new Date(2026, 7, 23, 9, 0, 0),
    startedAt: new Date(2026, 7, 23, 9, 0, 1),
    completedAt: new Date(2026, 7, 23, 9, 0, 30),
  };
}

function useCaseOver(seed: InquiryRun[]): GetInquiryRunUseCase {
  const { store } = inMemoryInquiryRunStore(seed);
  return new GetInquiryRunUseCase(store);
}

describe("GetInquiryRunUseCase", () => {
  const cases = [
    {
      name: "a permanent failure reaches the reader with its reason, or the UI can only say Failed",
      status: "failed_permanent" as InquiryRunStatus,
      error: "exa search returned 502",
      attempts: 3,
    },
    {
      name: "a retryable failure carries the attempt count, so a retry loop is visible",
      status: "failed_retryable" as InquiryRunStatus,
      error: "extraction timed out",
      attempts: 1,
    },
    {
      name: "a failure with no recorded reason serves null rather than dropping the key",
      status: "failed_permanent" as InquiryRunStatus,
      error: null,
      attempts: 2,
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, async () => {
      const useCase = useCaseOver([failedRun(testCase.status, testCase.error, testCase.attempts)]);

      const served = await useCase.execute(FAILED_ID, owner);

      expect(served?.error).toBe(testCase.error);
      expect(served?.attempts).toBe(testCase.attempts);
    });
  }

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
      const useCase = useCaseOver([failedRun("succeeded", null, 1)]);

      const served = await useCase.execute(FAILED_ID, actor);

      expect(served).toBeNull();
    });
  }

  test("a super admin can read another user's run", async () => {
    const useCase = useCaseOver([failedRun("succeeded", null, 1)]);

    const served = await useCase.execute(FAILED_ID, superAdmin);

    expect(served?.id).toBe(FAILED_ID);
  });
});
