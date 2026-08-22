import { describe, expect, test } from "bun:test";
import type { ResearchRunStatus } from "../repositories/research-repository.ts";
import { buildResearchRunSummary } from "../testing/research-builder.ts";
import { hasRunInFlight } from "./watch-research-run.ts";

const SETTLED_STATUSES: ResearchRunStatus[] = [
  "succeeded",
  "no_coverage",
  "below_floor",
  "failed_retryable",
  "failed_permanent",
];

describe("hasRunInFlight", () => {
  for (const status of ["queued", "running"] as const) {
    test(`keeps watching a list holding a ${status} run, whose row still has a status to gain`, () => {
      const runs = [buildResearchRunSummary({ status })];

      expect(hasRunInFlight(runs)).toBe(true);
    });
  }

  for (const status of SETTLED_STATUSES) {
    test(`stops watching a list whose only run is ${status}, so a finished history costs nothing`, () => {
      const runs = [buildResearchRunSummary({ status })];

      expect(hasRunInFlight(runs)).toBe(false);
    });
  }

  test("keeps watching when a single queued run sits among settled ones", () => {
    const runs = [
      buildResearchRunSummary({ id: "run-done", status: "succeeded" }),
      buildResearchRunSummary({ id: "run-waiting", status: "queued" }),
      buildResearchRunSummary({ id: "run-failed", status: "failed_permanent" }),
    ];

    expect(hasRunInFlight(runs)).toBe(true);
  });

  test("stops watching an empty history rather than polling for runs that do not exist", () => {
    expect(hasRunInFlight([])).toBe(false);
  });
});
