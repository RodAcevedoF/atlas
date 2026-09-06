import type { InquiryRunStatus } from "@atlas/domain";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";

const IN_FLIGHT_STATUSES: readonly InquiryRunStatus[] = ["queued", "running"];

const WATCHABLE_STATUSES: readonly InquiryRunStatus[] = ["queued", "running", "failed_retryable"];

export function isInquiryRunSettled(status: InquiryRunStatus): boolean {
  return !IN_FLIGHT_STATUSES.includes(status);
}

export function isInquiryRunWatchable(status: InquiryRunStatus): boolean {
  return WATCHABLE_STATUSES.includes(status);
}

export function hasRunInFlight(runs: readonly InquiryRunSummaryRecord[]): boolean {
  return runs.some((run) => !isInquiryRunSettled(run.status));
}
