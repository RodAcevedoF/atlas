import type { InquiryRunId } from "@atlas/domain";

export interface InquiryRunNotification {
  runId: InquiryRunId;
  revision: number;
}

export interface InquiryRunNotifierPort {
  publish(notification: InquiryRunNotification): Promise<boolean>;
}
