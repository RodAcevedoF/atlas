import type { InquiryRunId } from "@atlas/domain";

export interface InquiryRunSubscription {
  close(): Promise<void>;
}

/** pub/sub is a signal that the store moved, never a history to replay, so a notification carries nothing but its own arrival */
export interface InquiryRunSubscriptionsPort {
  subscribe(runId: InquiryRunId, onChange: () => void): Promise<InquiryRunSubscription>;
}
