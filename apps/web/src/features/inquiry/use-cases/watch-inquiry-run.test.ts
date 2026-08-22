import { describe, expect, test } from "bun:test";
import type { InquiryRunStatus } from "../repositories/inquiry-repository.ts";
import { buildInquiryRunSummary } from "../testing/inquiry-builder.ts";
import { hasRunInFlight } from "./watch-inquiry-run.ts";

const SETTLED_STATUSES: InquiryRunStatus[] = [
  "succeeded",
  "no_coverage",
  "below_floor",
  "failed_retryable",
  "failed_permanent",
];

describe("hasRunInFlight", () => {
  for (const status of ["queued", "running"] as const) {
    test(`keeps watching a list holding a ${status} run, whose row still has a status to gain`, () => {
      const runs = [buildInquiryRunSummary({ status })];

      expect(hasRunInFlight(runs)).toBe(true);
    });
  }

  for (const status of SETTLED_STATUSES) {
    test(`stops watching a list whose only run is ${status}, so a finished history costs nothing`, () => {
      const runs = [buildInquiryRunSummary({ status })];

      expect(hasRunInFlight(runs)).toBe(false);
    });
  }

  test("keeps watching when a single queued run sits among settled ones", () => {
    const runs = [
      buildInquiryRunSummary({ id: "run-done", status: "succeeded" }),
      buildInquiryRunSummary({ id: "run-waiting", status: "queued" }),
      buildInquiryRunSummary({ id: "run-failed", status: "failed_permanent" }),
    ];

    expect(hasRunInFlight(runs)).toBe(true);
  });

  test("stops watching an empty history rather than polling for runs that do not exist", () => {
    expect(hasRunInFlight([])).toBe(false);
  });
});
