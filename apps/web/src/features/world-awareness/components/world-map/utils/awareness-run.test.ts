import { describe, expect, test } from "bun:test";
import {
  buildCountryAwareness,
  buildResearchRun,
} from "../../../../research/testing/research-builder.ts";
import { selectAwarenessRun } from "./awareness-run.ts";

const UNPLOTTABLE_LATEST_RUNS = [
  { status: "below_floor" as const, distribution: [] },
  { status: "no_coverage" as const, distribution: [] },
  { status: "running" as const, distribution: [] },
  {
    status: "succeeded" as const,
    distribution: [buildCountryAwareness({ confidence: "artifact" })],
  },
  {
    status: "succeeded" as const,
    distribution: [buildCountryAwareness({ country: "Monaco" })],
  },
];

describe("selectAwarenessRun", () => {
  test("paints the newest run when it has coverage, and calls it no fallback", () => {
    const runs = [
      buildResearchRun({ id: "run-new" }),
      buildResearchRun({ id: "run-old", question: "An older question" }),
    ];

    const selection = selectAwarenessRun(runs);

    expect(selection.run?.id).toBe("run-new");
    expect(selection.isFallback).toBe(false);
  });

  for (const latest of UNPLOTTABLE_LATEST_RUNS) {
    test(`falls back to the last run with coverage when the newest is ${latest.status} with nothing to plot`, () => {
      const runs = [
        buildResearchRun({ id: "run-new", ...latest }),
        buildResearchRun({ id: "run-old", question: "An older question" }),
      ];

      const selection = selectAwarenessRun(runs);

      expect(selection.run?.id).toBe("run-old");
      expect(selection.isFallback).toBe(true);
      expect(selection.paint?.points.features).toHaveLength(1);
    });
  }

  test("keeps the newest run as the one the notice speaks about, not the one it painted", () => {
    const runs = [
      buildResearchRun({ id: "run-new", status: "below_floor", distribution: [] }),
      buildResearchRun({ id: "run-old" }),
    ];

    const selection = selectAwarenessRun(runs);

    expect(selection.latest?.id).toBe("run-new");
    expect(selection.latest?.status).toBe("below_floor");
  });

  test("walks past every empty run rather than stopping at the first miss", () => {
    const runs = [
      buildResearchRun({ id: "run-3", distribution: [] }),
      buildResearchRun({ id: "run-2", distribution: [] }),
      buildResearchRun({ id: "run-1" }),
    ];

    const selection = selectAwarenessRun(runs);

    expect(selection.run?.id).toBe("run-1");
  });

  test("reports nothing paintable when no run in the window has coverage", () => {
    const runs = [
      buildResearchRun({ id: "run-2", distribution: [] }),
      buildResearchRun({ id: "run-1", distribution: [] }),
    ];

    const selection = selectAwarenessRun(runs);

    expect(selection.latest?.id).toBe("run-2");
    expect(selection.run).toBeNull();
    expect(selection.paint).toBeNull();
    expect(selection.isFallback).toBe(false);
  });

  test("reports nothing at all when the user has never run a question", () => {
    const selection = selectAwarenessRun([]);

    expect(selection.latest).toBeNull();
    expect(selection.run).toBeNull();
  });
});
