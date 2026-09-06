import type {
  InquiryRepository,
  InquiryRunSummaryRecord,
} from "../repositories/inquiry-repository.ts";
import { buildInquiryRun } from "./inquiry-builder.ts";

export interface AskInquiryRepositorySeed {
  runs: InquiryRunSummaryRecord[];
  requested?: InquiryRunSummaryRecord;
  deduped?: boolean;
}

function outsideAskPath(method: string): never {
  throw new Error(`inquiry-repository.fake: ${method} is outside the ask path`);
}

export function inMemoryAskInquiryRepository({
  runs,
  requested,
  deduped = false,
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
      if (!listed.some((run) => run.id === requested.id)) listed.unshift(requested);
      return Promise.resolve({ runId: requested.id, status: requested.status, deduped });
    },
    deleteRun: () => outsideAskPath("deleteRun"),
    budget: () => Promise.resolve({ used: 0, cap: 5, remaining: 5 }),
    uploadAttachment: () => outsideAskPath("uploadAttachment"),
    interpretAttachment: () => outsideAskPath("interpretAttachment"),
    deleteAttachment: () => outsideAskPath("deleteAttachment"),
  };
}

export interface DeleteInquiryRepositorySeed {
  runs: InquiryRunSummaryRecord[];
}

function outsideDeletePath(method: string): never {
  throw new Error(`inquiry-repository.fake: ${method} is outside the delete path`);
}

export function inMemoryDeleteInquiryRepository({
  runs,
}: DeleteInquiryRepositorySeed): InquiryRepository {
  let listed = [...runs];

  return {
    recentRuns: () => Promise.resolve({ runs: [...listed], pinnedRunId: null }),
    runById: () => outsideDeletePath("runById"),
    requestRun: () => outsideDeletePath("requestRun"),
    deleteRun: (runId) => {
      listed = listed.filter((run) => run.id !== runId);
      return Promise.resolve();
    },
    budget: () => outsideDeletePath("budget"),
    uploadAttachment: () => outsideDeletePath("uploadAttachment"),
    interpretAttachment: () => outsideDeletePath("interpretAttachment"),
    deleteAttachment: () => outsideDeletePath("deleteAttachment"),
  };
}
