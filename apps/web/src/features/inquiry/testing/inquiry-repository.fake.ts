import type { InquiryRepository, InquiryRunStatus } from "../repositories/inquiry-repository.ts";
import { buildInquiryRun } from "./inquiry-builder.ts";

export interface InquiryRepositorySeed {
  statuses: InquiryRunStatus[];
}

function outsideWatchPath(method: string): never {
  throw new Error(`inquiry-repository.fake: ${method} is outside the run watch path`);
}

export function inMemoryInquiryRepository({ statuses }: InquiryRepositorySeed): InquiryRepository {
  let reads = 0;

  return {
    runById(runId) {
      if (statuses.length === 0) outsideWatchPath("runById");
      const status = statuses[Math.min(reads, statuses.length - 1)];
      reads += 1;
      return Promise.resolve(buildInquiryRun({ id: runId, status }));
    },
    recentRuns: () => outsideWatchPath("recentRuns"),
    requestRun: () => outsideWatchPath("requestRun"),
  };
}
