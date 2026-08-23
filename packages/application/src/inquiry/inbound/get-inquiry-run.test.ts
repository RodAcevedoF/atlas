import { describe, expect, test } from "bun:test";
import type { InquiryRun, InquiryRunStatus } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { GetInquiryRunUseCase } from "./get-inquiry-run.ts";

const FAILED_ID = makeInquiryRunId("run-failed");

function failedRun(status: InquiryRunStatus, error: string | null, attempts: number): InquiryRun {
  return {
    id: FAILED_ID,
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

      const served = await useCase.execute(FAILED_ID);

      expect(served?.error).toBe(testCase.error);
      expect(served?.attempts).toBe(testCase.attempts);
    });
  }

  test("an unknown run is not found", async () => {
    const useCase = useCaseOver([]);

    const served = await useCase.execute(FAILED_ID);

    expect(served).toBeNull();
  });
});
