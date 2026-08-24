import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { DeleteInquiryRunUseCase } from "./delete-inquiry-run.ts";

const HELD_ID = makeInquiryRunId("run-held");
const PINNED_ID = makeInquiryRunId("run-pinned");

function heldRun(id: InquiryRun["id"]): InquiryRun {
  return {
    id,
    question: "where are wildfires burning right now",
    questionKey: "where are wildfires burning right now",
    day: "2026-08-25",
    window: "1w",
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: new Date(2026, 7, 25, 9, 0, 0),
    startedAt: new Date(2026, 7, 25, 9, 0, 1),
    completedAt: new Date(2026, 7, 25, 9, 0, 30),
  };
}

describe("DeleteInquiryRunUseCase", () => {
  test("a deleted run is gone from the store", async () => {
    const { store, runs } = inMemoryInquiryRunStore([heldRun(HELD_ID)]);
    const useCase = new DeleteInquiryRunUseCase(store, null);

    const outcome = await useCase.execute(HELD_ID);

    expect(outcome).toBe("deleted");
    expect(runs()).toEqual([]);
  });

  test("an unknown run is not found", async () => {
    const { store } = inMemoryInquiryRunStore([]);
    const useCase = new DeleteInquiryRunUseCase(store, null);

    const outcome = await useCase.execute(HELD_ID);

    expect(outcome).toBe("not_found");
  });

  test("the pinned run is refused and survives — it is the map's fallback backdrop", async () => {
    const { store, runs } = inMemoryInquiryRunStore([heldRun(PINNED_ID)]);
    const useCase = new DeleteInquiryRunUseCase(store, PINNED_ID);

    const outcome = await useCase.execute(PINNED_ID);

    expect(outcome).toBe("pinned");
    expect(runs().map((run) => run.id)).toEqual([PINNED_ID]);
  });
});
