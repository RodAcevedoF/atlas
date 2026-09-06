import { describe, expect, test } from "bun:test";
import type { InquiryPlace, InquiryRunStatus } from "@atlas/domain";
import { normalizeStoredPlaces, normalizeStoredProgress } from "./inquiry-run-store.ts";

test("a historical stored claim without an image URL deserializes with an explicit null", () => {
  const historicalPlaces = [
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
  ];

  const places: InquiryPlace[] = normalizeStoredPlaces(historicalPlaces);

  expect(places[0]?.claims[0]?.sourceImageUrl).toBeNull();
  expect(places[0]?.read).toBeNull();
});

describe("runs stored before progress existed still report a stage", () => {
  const CREATED_AT = new Date("2026-08-23T12:00:00Z");
  const STARTED_AT = new Date("2026-08-23T12:00:01Z");
  const COMPLETED_AT = new Date("2026-08-23T12:01:11Z");

  function historicalRun(
    status: InquiryRunStatus,
    startedAt: Date | null,
    completedAt: Date | null,
  ) {
    return { status, createdAt: CREATED_AT, startedAt, completedAt };
  }

  const REACHED = [
    { status: "queued", stage: "queued" },
    { status: "running", stage: "queued" },
    { status: "succeeded", stage: "terminal" },
    { status: "no_coverage", stage: "terminal" },
    { status: "below_floor", stage: "terminal" },
    { status: "failed_retryable", stage: "terminal" },
    { status: "failed_permanent", stage: "terminal" },
  ] as const satisfies readonly { status: InquiryRunStatus; stage: string }[];

  for (const { status, stage } of REACHED) {
    test(`a historical ${status} run reads back at the ${stage} stage rather than an invented one`, () => {
      const progress = normalizeStoredProgress(historicalRun(status, STARTED_AT, COMPLETED_AT));

      expect(progress.stage).toBe(stage);
      expect(progress.revision).toBe(0);
    });
  }

  test("a persisted checkpoint survives the read instead of being flattened to a derived stage", () => {
    const stored = {
      ...historicalRun("running", STARTED_AT, null),
      progress: { stage: "map_ready", revision: 4, updatedAt: COMPLETED_AT },
    } as const;

    const progress = normalizeStoredProgress(stored);

    expect(progress).toEqual({ stage: "map_ready", revision: 4, updatedAt: COMPLETED_AT });
  });

  test("a historical run dates its progress from the newest timestamp it actually has", () => {
    const neverStarted = normalizeStoredProgress(historicalRun("queued", null, null));
    const started = normalizeStoredProgress(historicalRun("running", STARTED_AT, null));

    expect(neverStarted.updatedAt).toEqual(CREATED_AT);
    expect(started.updatedAt).toEqual(STARTED_AT);
  });
});
