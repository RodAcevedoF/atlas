import { describe, expect, test } from "bun:test";
import { buildInquiryRunSummary } from "../../../../inquiry/testing/inquiry-builder.ts";
import { selectAwarenessRun } from "./awareness-run.ts";

const UNPLOTTABLE_LATEST_RUNS = [
  { name: "below_floor", status: "below_floor" as const, placeCount: 0 },
  { name: "no_coverage", status: "no_coverage" as const, placeCount: 0 },
  { name: "running", status: "running" as const, placeCount: 0 },
  {
    name: "succeeded but every claim failed to place",
    status: "succeeded" as const,
    placeCount: 0,
  },
];

describe("selectAwarenessRun", () => {
  test("paints the newest run when it has coverage, and calls it no fallback", () => {
    const runs = [
      buildInquiryRunSummary({ id: "run-new" }),
      buildInquiryRunSummary({ id: "run-old", question: "An older question" }),
    ];

    const selection = selectAwarenessRun(runs, null);

    expect(selection.run?.id).toBe("run-new");
    expect(selection.isFallback).toBe(false);
  });

  for (const { name, ...latest } of UNPLOTTABLE_LATEST_RUNS) {
    test(`falls back to the last run with coverage when the newest is ${name}`, () => {
      const runs = [
        buildInquiryRunSummary({ id: "run-new", ...latest }),
        buildInquiryRunSummary({ id: "run-old", question: "An older question" }),
      ];

      const selection = selectAwarenessRun(runs, null);

      expect(selection.run?.id).toBe("run-old");
      expect(selection.isFallback).toBe(true);
    });
  }

  test("keeps the newest run as the one the notice speaks about, not the one it painted", () => {
    const runs = [
      buildInquiryRunSummary({ id: "run-new", status: "below_floor", placeCount: 0 }),
      buildInquiryRunSummary({ id: "run-old" }),
    ];

    const selection = selectAwarenessRun(runs, null);

    expect(selection.latest?.id).toBe("run-new");
    expect(selection.latest?.status).toBe("below_floor");
  });

  test("walks past every empty run rather than stopping at the first miss", () => {
    const runs = [
      buildInquiryRunSummary({ id: "run-3", placeCount: 0 }),
      buildInquiryRunSummary({ id: "run-2", placeCount: 0 }),
      buildInquiryRunSummary({ id: "run-1" }),
    ];

    const selection = selectAwarenessRun(runs, null);

    expect(selection.run?.id).toBe("run-1");
  });

  test("reports nothing paintable when no run in the window has coverage", () => {
    const runs = [
      buildInquiryRunSummary({ id: "run-2", placeCount: 0 }),
      buildInquiryRunSummary({ id: "run-1", placeCount: 0 }),
    ];

    const selection = selectAwarenessRun(runs, null);

    expect(selection.latest?.id).toBe("run-2");
    expect(selection.run).toBeNull();
    expect(selection.isFallback).toBe(false);
  });

  test("paints the run the caller asked for, and does not call that a fallback", () => {
    const runs = [
      buildInquiryRunSummary({ id: "run-new" }),
      buildInquiryRunSummary({ id: "run-old", question: "An older question" }),
    ];

    const selection = selectAwarenessRun(runs, "run-old");

    expect(selection.run?.id).toBe("run-old");
    expect(selection.isFallback).toBe(false);
    expect(selection.requestMiss).toBeNull();
    expect(selection.latest?.id).toBe("run-new");
  });

  const MISSED_REQUESTS = [
    {
      name: "the asked-for run was measured but plots nowhere — we know that about it",
      runs: [
        buildInquiryRunSummary({ id: "run-new" }),
        buildInquiryRunSummary({ id: "run-old", placeCount: 0 }),
      ],
      requested: "run-old",
      miss: "unpaintable",
    },
    {
      name: "the asked-for run aged out of the window — we know nothing about what it measured",
      runs: [buildInquiryRunSummary({ id: "run-new" })],
      requested: "run-gone",
      miss: "unknown",
    },
  ] as const;

  for (const { name, runs, requested, miss } of MISSED_REQUESTS) {
    test(`tells the two misses apart when ${name}`, () => {
      const selection = selectAwarenessRun([...runs], requested);

      expect(selection.run?.id).toBe("run-new");
      expect(selection.requestMiss).toBe(miss);
      expect(selection.isFallback).toBe(false);
    });
  }

  test("reports nothing at all when the user has never run a question", () => {
    const selection = selectAwarenessRun([], null);

    expect(selection.latest).toBeNull();
    expect(selection.run).toBeNull();
  });
});
