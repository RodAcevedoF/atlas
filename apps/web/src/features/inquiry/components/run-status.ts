import type { InquiryFailureKind, InquiryRunStatus } from "@atlas/domain";
import { isFailedInquiryStatus } from "@atlas/domain";

export const RUN_STATUS_LABEL: Record<InquiryRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Measured",
  no_coverage: "No coverage",
  below_floor: "Below floor",
  failed_retryable: "Failed · retrying",
  failed_permanent: "Failed",
};

export const RUN_FAILURE_MESSAGE: Record<InquiryFailureKind, string> = {
  transport: "A source this run depends on did not answer.",
  unusable_result: "The research came back in a shape Atlas could not read.",
  abandoned: "The run was interrupted too many times and was given up on.",
  internal: "Something inside Atlas broke while measuring this run.",
};

export function runStatusClass(status: InquiryRunStatus): string {
  return isFailedInquiryStatus(status) ? "text-destructive" : "text-muted-foreground";
}
