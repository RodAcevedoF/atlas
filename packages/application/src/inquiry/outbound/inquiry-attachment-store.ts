import type {
  AttachmentInterpretation,
  InquiryAttachment,
  InquiryAttachmentId,
  InquiryRunId,
  UserId,
} from "@atlas/domain";

export interface SaveInquiryAttachmentInput {
  attachment: InquiryAttachment;
  bytes: Uint8Array;
}

export interface InterpretationLease {
  id: string;
  expiresAt: Date;
}

export interface InquiryAttachmentStorePort {
  saveInquiryAttachment(input: SaveInquiryAttachmentInput): Promise<void>;
  findInquiryAttachmentById(id: InquiryAttachmentId): Promise<InquiryAttachment | null>;
  findInquiryAttachmentBytes(id: InquiryAttachmentId): Promise<Uint8Array | null>;
  reserveInquiryAttachmentUpload(ownerId: UserId, day: string, cap: number): Promise<boolean>;
  reserveAttachmentInterpretation(ownerId: UserId, day: string, cap: number): Promise<boolean>;
  reserveSharedInterpretation(
    day: string,
    cap: number,
    concurrency: number,
    leaseMs: number,
  ): Promise<InterpretationLease | null>;
  releaseSharedInterpretation(id: string): Promise<void>;
  saveAttachmentInterpretation(
    id: InquiryAttachmentId,
    interpretation: AttachmentInterpretation,
  ): Promise<void>;
  attachInquiryAttachment(id: InquiryAttachmentId, runId: InquiryRunId): Promise<void>;
  deleteInquiryAttachment(id: InquiryAttachmentId): Promise<void>;
  deleteInquiryAttachmentsByRunId(runId: InquiryRunId): Promise<void>;
  deleteExpiredInquiryAttachments(now: Date): Promise<void>;
}
