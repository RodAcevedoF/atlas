import type {
  AttachmentInterpretation,
  InquiryAttachment,
  InquiryAttachmentId,
  InquiryRunId,
  UserId,
} from "@atlas/domain";
import type {
  InquiryAttachmentStorePort,
  SaveInquiryAttachmentInput,
} from "../inquiry/outbound/inquiry-attachment-store.ts";

export class InMemoryInquiryAttachmentStore implements InquiryAttachmentStorePort {
  private readonly attachments = new Map<InquiryAttachmentId, InquiryAttachment>();
  private readonly bytes = new Map<InquiryAttachmentId, Uint8Array>();
  private readonly dailyUploads = new Map<string, number>();
  private readonly dailyInterpretations = new Map<string, number>();

  constructor(seed: InquiryAttachment[] = []) {
    for (const attachment of seed) {
      this.attachments.set(attachment.id, attachment);
      this.bytes.set(attachment.id, new Uint8Array([1, 2, 3]));
    }
  }

  saveInquiryAttachment(input: SaveInquiryAttachmentInput): Promise<void> {
    this.attachments.set(input.attachment.id, input.attachment);
    this.bytes.set(input.attachment.id, input.bytes);
    return Promise.resolve();
  }

  findInquiryAttachmentById(id: InquiryAttachmentId): Promise<InquiryAttachment | null> {
    return Promise.resolve(this.attachments.get(id) ?? null);
  }

  findInquiryAttachmentBytes(id: InquiryAttachmentId): Promise<Uint8Array | null> {
    return Promise.resolve(this.bytes.get(id) ?? null);
  }

  reserveInquiryAttachmentUpload(ownerId: UserId, day: string, cap: number): Promise<boolean> {
    return Promise.resolve(reserve(this.dailyUploads, `${ownerId}:${day}`, cap));
  }

  reserveAttachmentInterpretation(ownerId: UserId, day: string, cap: number): Promise<boolean> {
    const key = `${ownerId}:${day}`;
    const metadataCount = [...this.attachments.values()]
      .filter(
        (attachment) =>
          attachment.ownerId === ownerId && attachment.createdAt.toISOString().slice(0, 10) === day,
      )
      .reduce((total, attachment) => total + attachment.interpretationCount, 0);
    const used = this.dailyInterpretations.get(key) ?? metadataCount;
    if (used >= cap) return Promise.resolve(false);
    this.dailyInterpretations.set(key, used + 1);
    return Promise.resolve(true);
  }

  saveAttachmentInterpretation(
    id: InquiryAttachmentId,
    interpretation: AttachmentInterpretation,
  ): Promise<void> {
    const attachment = this.attachments.get(id);
    if (!attachment) return Promise.resolve();
    this.attachments.set(id, {
      ...attachment,
      interpretation,
      interpretationCount: attachment.interpretationCount + 1,
    });
    return Promise.resolve();
  }

  attachInquiryAttachment(id: InquiryAttachmentId, runId: InquiryRunId): Promise<void> {
    const attachment = this.attachments.get(id);
    if (!attachment) return Promise.resolve();
    this.attachments.set(id, { ...attachment, runId, expiresAt: null });
    return Promise.resolve();
  }

  deleteInquiryAttachment(id: InquiryAttachmentId): Promise<void> {
    this.attachments.delete(id);
    this.bytes.delete(id);
    return Promise.resolve();
  }

  async deleteInquiryAttachmentsByRunId(runId: InquiryRunId): Promise<void> {
    for (const attachment of this.attachments.values()) {
      if (attachment.runId !== runId) continue;
      this.attachments.delete(attachment.id);
      this.bytes.delete(attachment.id);
    }
  }

  async deleteExpiredInquiryAttachments(now: Date): Promise<void> {
    for (const attachment of this.attachments.values()) {
      if (attachment.runId === null && attachment.expiresAt && attachment.expiresAt <= now) {
        this.attachments.delete(attachment.id);
        this.bytes.delete(attachment.id);
      }
    }
  }
}

function reserve(usage: Map<string, number>, key: string, cap: number): boolean {
  const used = usage.get(key) ?? 0;
  if (used >= cap) return false;
  usage.set(key, used + 1);
  return true;
}
