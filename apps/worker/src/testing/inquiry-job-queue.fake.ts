import type { InquiryJob, InquiryJobQueuePort } from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";
import { NotImplementedError } from "@atlas/shared";

export class InMemoryInquiryJobQueue implements InquiryJobQueuePort {
  private readonly waiting: InquiryJob[] = [];
  private readonly inFlight = new Map<string, InquiryJob>();
  private readonly dead: { job: InquiryJob; reason: string }[] = [];
  private nextDeliveryId = 1;
  private acknowledgeFails = false;
  private reclaimFails = false;

  failAcknowledge(): void {
    this.acknowledgeFails = true;
  }

  failReclaim(): void {
    this.reclaimFails = true;
  }

  deadLettered(): { job: InquiryJob; reason: string }[] {
    return [...this.dead];
  }

  publish(runId: InquiryRunId): Promise<void> {
    this.waiting.push({ runId, deliveryId: String(this.nextDeliveryId++) });
    return Promise.resolve();
  }

  reserve(limit: number): Promise<InquiryJob[]> {
    const taken = this.waiting.splice(0, limit);
    for (const job of taken) this.inFlight.set(job.deliveryId, job);
    return Promise.resolve(taken);
  }

  refreshOwnership(): Promise<void> {
    throw new NotImplementedError("refreshOwnership");
  }

  acknowledge(deliveryId: string): Promise<void> {
    if (this.acknowledgeFails) return Promise.reject(new Error("redis unavailable"));
    this.inFlight.delete(deliveryId);
    return Promise.resolve();
  }

  deadLetter(job: InquiryJob, reason: string): Promise<void> {
    this.dead.push({ job, reason });
    this.inFlight.delete(job.deliveryId);
    return Promise.resolve();
  }

  reclaimStale(_idleMs: number, limit: number): Promise<InquiryJob[]> {
    if (this.reclaimFails) return Promise.reject(new Error("redis unavailable"));
    return Promise.resolve([...this.inFlight.values()].slice(0, limit));
  }
}
