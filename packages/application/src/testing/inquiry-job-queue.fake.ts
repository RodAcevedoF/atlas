import type { InquiryRunId } from "@atlas/domain";
import { NotImplementedError } from "@atlas/shared";
import type { InquiryJob, InquiryJobQueuePort } from "../inquiry/outbound/inquiry-job-queue.ts";

export class InMemoryInquiryJobQueue implements InquiryJobQueuePort {
  private readonly pending: InquiryJob[] = [];
  private readonly acknowledged: string[] = [];
  private readonly dead: { job: InquiryJob; reason: string }[] = [];
  private nextDeliveryId = 1;
  private publishFails = false;

  failPublish(): void {
    this.publishFails = true;
  }

  published(): InquiryRunId[] {
    return this.pending.map((job) => job.runId);
  }

  deadLettered(): { job: InquiryJob; reason: string }[] {
    return [...this.dead];
  }

  acknowledgements(): string[] {
    return [...this.acknowledged];
  }

  publish(runId: InquiryRunId): Promise<void> {
    if (this.publishFails) return Promise.reject(new Error("redis unavailable"));
    this.pending.push({ runId, deliveryId: String(this.nextDeliveryId++) });
    return Promise.resolve();
  }

  reserve(limit: number): Promise<InquiryJob[]> {
    return Promise.resolve(this.pending.splice(0, limit));
  }

  refreshOwnership(): Promise<void> {
    throw new NotImplementedError("refreshOwnership");
  }

  acknowledge(deliveryId: string): Promise<void> {
    this.acknowledged.push(deliveryId);
    return Promise.resolve();
  }

  deadLetter(job: InquiryJob, reason: string): Promise<void> {
    this.dead.push({ job, reason });
    this.acknowledged.push(job.deliveryId);
    return Promise.resolve();
  }

  reclaimStale(): Promise<InquiryJob[]> {
    throw new NotImplementedError("reclaimStale");
  }
}
