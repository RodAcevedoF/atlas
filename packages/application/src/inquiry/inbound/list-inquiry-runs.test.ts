import { describe, expect, test } from "bun:test";
import type { InquiryPlace, InquiryRun, InquiryRunId } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { inMemoryInquiryRunStore } from "../../testing/inquiry-run-store.fake.ts";
import { ListInquiryRunsUseCase } from "./list-inquiry-runs.ts";

const SEEDED = 130;

function run(index: number): InquiryRun {
  return {
    id: makeInquiryRunId(`run-${index}`),
    question: `question ${index}`,
    questionKey: `question ${index}`,
    day: "2026-08-17",

    window: "1w",
    places: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: new Date(2026, 7, 17, 0, 0, index),
    startedAt: null,
    completedAt: null,
  };
}

function place(name: string): InquiryPlace {
  return {
    place: name,
    country: "Sudan",
    latitude: 15.5,
    longitude: 32.56,
    claimCount: 1,
    claims: [
      {
        text: `something happened in ${name}`,
        confidence: 0.8,
        sourceUrl: "https://example.test/article",
        sourceTitle: null,
        publishedDate: null,
      },
    ],
  };
}

function useCaseOverSeeded(pinnedRunId: InquiryRunId | null = null): ListInquiryRunsUseCase {
  const { store } = inMemoryInquiryRunStore(
    Array.from({ length: SEEDED }, (_unused, index) => run(index)),
  );
  return new ListInquiryRunsUseCase(store, pinnedRunId);
}

describe("ListInquiryRunsUseCase", () => {
  const cases = [
    { name: "an unbounded limit cannot pull the whole collection", asked: 100_000, expected: 100 },
    { name: "no limit serves one page", asked: undefined, expected: 20 },
    { name: "a zero limit is a page size, never the whole collection", asked: 0, expected: 20 },
    { name: "a limit under the cap is the caller's to choose", asked: 5, expected: 5 },
  ];

  for (const { name, asked, expected } of cases) {
    test(name, async () => {
      const useCase = useCaseOverSeeded();

      const { runs } = await useCase.execute({ limit: asked });

      expect(runs).toHaveLength(expected);
    });
  }

  test("a listed run carries how many places it would paint, never the claims behind them", async () => {
    const measured = run(0);
    measured.synthesis = "a long synthesis the list has no use for";
    measured.places = [place("Khartoum"), place("El Fasher")];
    const { store } = inMemoryInquiryRunStore([measured]);
    const useCase = new ListInquiryRunsUseCase(store, null);

    const {
      runs: [listed],
    } = await useCase.execute();

    expect(listed).toEqual({
      id: makeInquiryRunId("run-0"),
      question: "question 0",
      day: "2026-08-17",
      window: "1w",
      placeCount: 2,
      status: "succeeded",
      createdAt: measured.createdAt,
      startedAt: null,
      completedAt: null,
    });
  });

  test("the newest run is served first", async () => {
    const useCase = useCaseOverSeeded();

    const { runs } = await useCase.execute({ limit: 3 });

    expect(runs.map((entry) => entry.id)).toEqual([
      makeInquiryRunId("run-129"),
      makeInquiryRunId("run-128"),
      makeInquiryRunId("run-127"),
    ]);
  });
});

describe("the pinned run the map opens on", () => {
  test("is named on the list so the map can prefer it over the newest run", async () => {
    const useCase = useCaseOverSeeded(makeInquiryRunId("run-129"));

    const { pinnedRunId } = await useCase.execute({ limit: 3 });

    expect(pinnedRunId).toBe(makeInquiryRunId("run-129"));
  });

  test("rides along when it aged out of the page, or the map could never select it", async () => {
    const useCase = useCaseOverSeeded(makeInquiryRunId("run-0"));

    const { runs, pinnedRunId } = await useCase.execute({ limit: 3 });

    expect(runs.map((entry) => entry.id)).toEqual([
      makeInquiryRunId("run-129"),
      makeInquiryRunId("run-128"),
      makeInquiryRunId("run-127"),
      makeInquiryRunId("run-0"),
    ]);
    expect(pinnedRunId).toBe(makeInquiryRunId("run-0"));
  });

  test("is reported as unpinned when the configured run does not exist", async () => {
    const useCase = useCaseOverSeeded(makeInquiryRunId("run-gone"));

    const { runs, pinnedRunId } = await useCase.execute({ limit: 3 });

    expect(runs).toHaveLength(3);
    expect(pinnedRunId).toBeNull();
  });

  test("is absent when nothing is pinned", async () => {
    const useCase = useCaseOverSeeded();

    const { pinnedRunId } = await useCase.execute({ limit: 3 });

    expect(pinnedRunId).toBeNull();
  });
});
