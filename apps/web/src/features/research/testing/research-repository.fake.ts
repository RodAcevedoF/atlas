import type { ResearchRepository, ResearchRunStatus } from "../repositories/research-repository.ts";
import { buildResearchRun } from "./research-builder.ts";

export interface ResearchRepositorySeed {
  statuses: ResearchRunStatus[];
}

function outsideWatchPath(method: string): never {
  throw new Error(`research-repository.fake: ${method} is outside the run watch path`);
}

export function inMemoryResearchRepository({
  statuses,
}: ResearchRepositorySeed): ResearchRepository {
  let reads = 0;

  return {
    runById(runId) {
      if (statuses.length === 0) outsideWatchPath("runById");
      const status = statuses[Math.min(reads, statuses.length - 1)];
      reads += 1;
      return Promise.resolve(buildResearchRun({ id: runId, status }));
    },
    recentRuns: () => outsideWatchPath("recentRuns"),
    requestRun: () => outsideWatchPath("requestRun"),
  };
}
