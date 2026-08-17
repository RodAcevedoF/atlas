import { describe, expect, test } from "bun:test";
import type { ResearchRun } from "@atlas/domain";
import { makeResearchRunId } from "@atlas/domain";
import { inMemoryResearchRunStore } from "../../testing/research-run-store.fake.ts";
import { ListResearchRunsUseCase } from "./list-research-runs.ts";

const SEEDED = 130;

function run(index: number): ResearchRun {
  return {
    id: makeResearchRunId(`run-${index}`),
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

function useCaseOverSeeded(): ListResearchRunsUseCase {
  const { store } = inMemoryResearchRunStore(
    Array.from({ length: SEEDED }, (_unused, index) => run(index)),
  );
  return new ListResearchRunsUseCase(store);
}

describe("ListResearchRunsUseCase", () => {
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

  test("the newest run is served first", async () => {
    const useCase = useCaseOverSeeded();

    const runs = await useCase.execute({ limit: 3 });

    expect(runs.map((entry) => entry.id)).toEqual([
      makeResearchRunId("run-129"),
      makeResearchRunId("run-128"),
      makeResearchRunId("run-127"),
    ]);
  });
});
