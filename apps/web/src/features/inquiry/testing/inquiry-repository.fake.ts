import type { InquiryRunStatus } from "@atlas/domain";
import type {
  InquiryRepository,
  InquiryRunSummaryRecord,
} from "../repositories/inquiry-repository.ts";
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

export interface AskInquiryRepositorySeed {
  runs: InquiryRunSummaryRecord[];
  requested?: InquiryRunSummaryRecord;
}

function outsideAskPath(method: string): never {
  throw new Error(`inquiry-repository.fake: ${method} is outside the ask path`);
}

export function inMemoryAskInquiryRepository({
  runs,
  requested,
}: AskInquiryRepositorySeed): InquiryRepository {
  const listed = [...runs];

  return {
    recentRuns: () => Promise.resolve({ runs: [...listed], pinnedRunId: null }),
    runById: (runId) => {
      const listedRun = listed.find((candidate) => candidate.id === runId);
      if (!listedRun) return outsideAskPath(`runById(${runId})`);
      const { id, question, status } = listedRun;
      return Promise.resolve(buildInquiryRun({ id, question, status }));
    },
    requestRun: () => {
      if (!requested) return outsideAskPath("requestRun");
      listed.unshift(requested);
      return Promise.resolve({ runId: requested.id, status: requested.status, deduped: false });
    },
  };
}
