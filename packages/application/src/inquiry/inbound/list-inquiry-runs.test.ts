import { describe, expect, test } from "bun:test";
import type { CountryAwareness, InquiryRun } from "@atlas/domain";
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
    executedQuery: null,
    window: "1w",
    distribution: [],
    exemplars: [],
    synthesis: null,
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: new Date(2026, 7, 17, 0, 0, index),
    startedAt: null,
    completedAt: null,
  };
}

function country(name: string, confidence: CountryAwareness["confidence"]): CountryAwareness {
  return { country: name, awareness: 4.5, peak: 9, coveredBuckets: 3, totalBuckets: 4, confidence };
}

function useCaseOverSeeded(): ListInquiryRunsUseCase {
  const { store } = inMemoryInquiryRunStore(
    Array.from({ length: SEEDED }, (_unused, index) => run(index)),
  );
  return new ListInquiryRunsUseCase(store);
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

      const runs = await useCase.execute({ limit: asked });

      expect(runs).toHaveLength(expected);
    });
  }

  test("a listed run carries its measured country names, never the tables behind them", async () => {
    const measured = run(0);
    measured.executedQuery = "france OR spain";
    measured.synthesis = "a long synthesis the list has no use for";
    measured.distribution = [
      country("France", "measured"),
      country("Spain", "thin"),
      country("Chad", "artifact"),
    ];
    const { store } = inMemoryInquiryRunStore([measured]);
    const useCase = new ListInquiryRunsUseCase(store);

    const [listed] = await useCase.execute();

    expect(listed).toEqual({
      id: makeInquiryRunId("run-0"),
      question: "question 0",
      day: "2026-08-17",
      window: "1w",
      measuredCountries: ["France", "Spain"],
      status: "succeeded",
      createdAt: measured.createdAt,
      startedAt: null,
      completedAt: null,
    });
  });

  test("the newest run is served first", async () => {
    const useCase = useCaseOverSeeded();

    const runs = await useCase.execute({ limit: 3 });

    expect(runs.map((entry) => entry.id)).toEqual([
      makeInquiryRunId("run-129"),
      makeInquiryRunId("run-128"),
      makeInquiryRunId("run-127"),
    ]);
  });
});
