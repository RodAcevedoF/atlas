import type { InquiryRunId } from "@atlas/domain";

export interface InquiryJob {
  runId: InquiryRunId;
  deliveryId: string;
}

export interface InquiryJobPublisherPort {
  publish(runId: InquiryRunId): Promise<void>;
}

export interface InquiryJobQueuePort extends InquiryJobPublisherPort {
  reserve(limit: number): Promise<InquiryJob[]>;
  refreshOwnership(deliveryId: string): Promise<void>;
  acknowledge(deliveryId: string): Promise<void>;
  deadLetter(job: InquiryJob, reason: string): Promise<void>;
  reclaimStale(idleMs: number, limit: number): Promise<InquiryJob[]>;
}
