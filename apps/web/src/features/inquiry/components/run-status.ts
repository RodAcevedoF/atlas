import type { InquiryRunStatus } from "@atlas/domain";

export const RUN_STATUS_LABEL: Record<InquiryRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Measured",
  no_coverage: "No coverage",
  below_floor: "Below floor",
  failed_retryable: "Failed · retrying",
  failed_permanent: "Failed",
};

const FAILED_STATUSES: InquiryRunStatus[] = ["failed_retryable", "failed_permanent"];

export function isFailedRun(status: InquiryRunStatus): boolean {
  return FAILED_STATUSES.includes(status);
}

export function runStatusClass(status: InquiryRunStatus): string {
  return isFailedRun(status) ? "text-destructive" : "text-muted-foreground";
}
