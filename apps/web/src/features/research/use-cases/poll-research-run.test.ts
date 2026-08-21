import { describe, expect, test } from "bun:test";
import type {
  ResearchRunRequestRecord,
  ResearchRunStatus,
} from "../repositories/research-repository.ts";
import { inMemoryResearchRepository } from "../testing/research-repository.fake.ts";
import { type PollSchedule, makePollResearchRun } from "./poll-research-run.ts";

const FAST: PollSchedule = { intervalMs: 1, limitMs: 200 };

function requested(status: ResearchRunStatus): ResearchRunRequestRecord {
  return { runId: "run-1", status, deduped: false };
}

describe("pollResearchRun", () => {
  test("stops before the first poll when the requested run is already settled, so a deduped ask costs nothing", async () => {
    const researchRepository = inMemoryResearchRepository({ statuses: [] });
    const reported: ResearchRunStatus[] = [];

    const outcome = await makePollResearchRun({ researchRepository }, FAST)(
      requested("succeeded"),
      (status) => reported.push(status),
    );

    expect(outcome).toEqual({ status: "succeeded", isStillRunning: false });
    expect(reported).toEqual([]);
  });

  test("reports every status it walks through, so the wait is never a blind spinner", async () => {
    const researchRepository = inMemoryResearchRepository({ statuses: ["running", "succeeded"] });
    const reported: ResearchRunStatus[] = [];

    const outcome = await makePollResearchRun({ researchRepository }, FAST)(
      requested("queued"),
      (status) => reported.push(status),
    );

    expect(outcome).toEqual({ status: "succeeded", isStillRunning: false });
    expect(reported).toEqual(["queued", "running", "succeeded"]);
  });

  const settlingCases: { name: string; status: ResearchRunStatus }[] = [
    { name: "no_coverage is an answer, not a reason to keep waiting", status: "no_coverage" },
    { name: "below_floor is an answer, not a reason to keep waiting", status: "below_floor" },
    {
      name: "failed_retryable ends the watch — the worker's retry is minutes away, not seconds",
      status: "failed_retryable",
    },
    { name: "failed_permanent ends the watch", status: "failed_permanent" },
  ];

  for (const settlingCase of settlingCases) {
    test(settlingCase.name, async () => {
      const researchRepository = inMemoryResearchRepository({ statuses: [settlingCase.status] });

      const outcome = await makePollResearchRun({ researchRepository }, FAST)(
        requested("queued"),
        () => {},
      );

      expect(outcome).toEqual({ status: settlingCase.status, isStillRunning: false });
    });
  }

  test("gives up at the watch limit and says the run is still going, rather than polling forever", async () => {
    const researchRepository = inMemoryResearchRepository({ statuses: ["running"] });

    const outcome = await makePollResearchRun({ researchRepository }, FAST)(
      requested("queued"),
      () => {},
    );

    expect(outcome).toEqual({ status: "running", isStillRunning: true });
  });
});
