import type { InquiryRunStatus } from "@atlas/domain";
import type {
  InquiryRunRequestRecord,
  InquiryRunSummaryRecord,
} from "../repositories/inquiry-repository.ts";

const IN_FLIGHT_STATUSES: readonly InquiryRunStatus[] = ["queued", "running"];

export function isInquiryRunSettled(status: InquiryRunStatus): boolean {
  return !IN_FLIGHT_STATUSES.includes(status);
}

export function hasRunInFlight(runs: readonly InquiryRunSummaryRecord[]): boolean {
  return runs.some((run) => !isInquiryRunSettled(run.status));
}

export interface WatchInquiryRunOutcome {
  status: InquiryRunStatus;
  isStillRunning: boolean;
}

export type InquiryRunProgress = (status: InquiryRunStatus) => void;

export type WatchInquiryRun = (
  requested: InquiryRunRequestRecord,
  onProgress: InquiryRunProgress,
) => Promise<WatchInquiryRunOutcome>;
