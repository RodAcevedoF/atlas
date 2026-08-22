import type { InquiryRunStatus } from "../repositories/inquiry-repository.ts";

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

export function runStatusClass(status: InquiryRunStatus): string {
  return FAILED_STATUSES.includes(status) ? "text-destructive" : "text-muted-foreground";
}
