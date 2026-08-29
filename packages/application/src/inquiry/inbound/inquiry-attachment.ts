import type {
  AttachmentInterpretation,
  InquiryAttachment,
  InquiryAttachmentId,
  InquiryAttachmentMediaType,
  InquiryImageAttachmentMediaType,
  InquiryTabularAttachmentMediaType,
  UserId,
} from "@atlas/domain";
import {
  INQUIRY_ATTACHMENT_MEDIA_TYPES,
  INQUIRY_IMAGE_ATTACHMENT_MEDIA_TYPES,
  INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES,
  makeInquiryAttachmentId,
} from "@atlas/domain";
import type { OrchestrationPort } from "../../world/outbound/orchestration.ts";
import type { InquiryAttachmentStorePort } from "../outbound/inquiry-attachment-store.ts";
import type { TabularParserPort } from "../outbound/tabular-parser.ts";

export const INQUIRY_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const INQUIRY_ATTACHMENT_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
export const INQUIRY_ATTACHMENT_DAILY_INTERPRETATION_CAP = 10;
export const INQUIRY_ATTACHMENT_DAILY_UPLOAD_CAP = 20;
const GRAPH_NAME = "attachment-interpretation";
const MAX_FILENAME_CHARS = 180;
const MAX_ATTACHMENT_CONTEXT_CHARS = 1_200;
const MAX_INTERPRETATION_TEXT_CHARS = 1_000;
const MAX_INTERPRETATION_ITEMS = 20;

export class InvalidInquiryAttachmentError extends Error {
  constructor(message = "Choose a CSV, XLSX, JPEG, PNG, or WebP file") {
    super(message);
    this.name = "InvalidInquiryAttachmentError";
  }
}

export class InquiryAttachmentTooLargeError extends Error {
  constructor() {
    super("Attachment must be 5 MB or smaller");
    this.name = "InquiryAttachmentTooLargeError";
  }
}

export class InquiryAttachmentNotFoundError extends Error {
  constructor() {
    super("Attachment not found");
    this.name = "InquiryAttachmentNotFoundError";
  }
}

export class InquiryAttachmentInterpretationCapError extends Error {
  constructor() {
    super("Attachment interpretation limit reached — try again tomorrow");
    this.name = "InquiryAttachmentInterpretationCapError";
  }
}

export class InquiryAttachmentUploadCapError extends Error {
  constructor() {
    super("Attachment upload limit reached — try again tomorrow");
    this.name = "InquiryAttachmentUploadCapError";
  }
}

export interface UploadInquiryAttachmentInput {
  ownerId: UserId;
  filename: string;
  mediaType: string;
  bytes: Uint8Array;
}

export interface UploadInquiryAttachmentOutput {
  id: InquiryAttachmentId;
  filename: string;
  profile: InquiryAttachment["profile"];
}

export interface UploadInquiryAttachment {
  execute(input: UploadInquiryAttachmentInput): Promise<UploadInquiryAttachmentOutput>;
}

export interface InterpretInquiryAttachmentInput {
  id: InquiryAttachmentId;
  ownerId: UserId;
  question: string;
}

export interface InterpretInquiryAttachment {
  execute(input: InterpretInquiryAttachmentInput): Promise<AttachmentInterpretation>;
}

export interface DeleteInquiryAttachment {
  execute(id: InquiryAttachmentId, ownerId: UserId): Promise<void>;
}

function isMediaType(value: string): value is InquiryAttachmentMediaType {
  return INQUIRY_ATTACHMENT_MEDIA_TYPES.some((mediaType) => mediaType === value);
}

function isTabularMediaType(
  value: InquiryAttachmentMediaType,
): value is InquiryTabularAttachmentMediaType {
  return INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES.some((mediaType) => mediaType === value);
}

function isImageMediaType(
  value: InquiryAttachmentMediaType,
): value is InquiryImageAttachmentMediaType {
  return INQUIRY_IMAGE_ATTACHMENT_MEDIA_TYPES.some((mediaType) => mediaType === value);
}

function normalizedFilename(value: string): string {
  const filename = value.trim();
  if (!filename || filename.length > MAX_FILENAME_CHARS || filename.includes("\0")) {
    throw new InvalidInquiryAttachmentError("Attachment filename is invalid");
  }
  return filename;
}

function hasExpectedExtension(filename: string, mediaType: InquiryAttachmentMediaType): boolean {
  const lower = filename.toLowerCase();
  if (mediaType === "text/csv") return lower.endsWith(".csv");
  if (mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return lower.endsWith(".xlsx");
  }
  if (mediaType === "image/jpeg") return lower.endsWith(".jpg") || lower.endsWith(".jpeg");
  if (mediaType === "image/png") return lower.endsWith(".png");
  return lower.endsWith(".webp");
}

function hasExpectedSignature(bytes: Uint8Array, mediaType: InquiryAttachmentMediaType): boolean {
  if (mediaType === "text/csv") {
    if (bytes.some((byte) => byte === 0)) return false;
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return true;
    } catch {
      return false;
    }
  }
  if (mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b;
  }
  if (mediaType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mediaType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    );
  }
  return (
    [0x52, 0x49, 0x46, 0x46].every((value, index) => bytes[index] === value) &&
    [0x57, 0x45, 0x42, 0x50].every((value, index) => bytes[index + 8] === value)
  );
}

export class UploadInquiryAttachmentUseCase implements UploadInquiryAttachment {
  constructor(
    private readonly attachments: InquiryAttachmentStorePort,
    private readonly parser: TabularParserPort,
  ) {}

  async execute(input: UploadInquiryAttachmentInput): Promise<UploadInquiryAttachmentOutput> {
    if (input.bytes.byteLength === 0)
      throw new InvalidInquiryAttachmentError("Attachment is empty");
    if (input.bytes.byteLength > INQUIRY_ATTACHMENT_MAX_BYTES) {
      throw new InquiryAttachmentTooLargeError();
    }
    if (!isMediaType(input.mediaType)) throw new InvalidInquiryAttachmentError();

    const filename = normalizedFilename(input.filename);
    if (!hasExpectedExtension(filename, input.mediaType)) throw new InvalidInquiryAttachmentError();
    if (!hasExpectedSignature(input.bytes, input.mediaType)) {
      throw new InvalidInquiryAttachmentError("Attachment contents do not match its file type");
    }

    const now = new Date();
    await this.attachments.deleteExpiredInquiryAttachments(now);
    const reserved = await this.attachments.reserveInquiryAttachmentUpload(
      input.ownerId,
      now.toISOString().slice(0, 10),
      INQUIRY_ATTACHMENT_DAILY_UPLOAD_CAP,
    );
    if (!reserved) throw new InquiryAttachmentUploadCapError();
    const profile = isTabularMediaType(input.mediaType)
      ? await this.parser.parse({
          filename,
          mediaType: input.mediaType,
          bytes: input.bytes,
        })
      : null;
    const id = makeInquiryAttachmentId(crypto.randomUUID());
    await this.attachments.saveInquiryAttachment({
      attachment: {
        id,
        ownerId: input.ownerId,
        filename,
        mediaType: input.mediaType,
        profile,
        interpretation: null,
        interpretationCount: 0,
        runId: null,
        createdAt: now,
        expiresAt: new Date(now.getTime() + INQUIRY_ATTACHMENT_DRAFT_TTL_MS),
      },
      bytes: input.bytes,
    });
    return { id, filename, profile };
  }
}

function textArray(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length > MAX_INTERPRETATION_ITEMS ||
    !value.every((item) => typeof item === "string" && item.length <= MAX_INTERPRETATION_TEXT_CHARS)
  ) {
    return null;
  }
  return value;
}

function interpretationFrom(body: Record<string, unknown>): AttachmentInterpretation {
  const facts = textArray(body.facts);
  const entities = textArray(body.entities);
  const clarification = body.clarificationQuestion;
  const proposedQuestion = body.proposedQuestion;
  const proposedQuestionIsUsable =
    typeof proposedQuestion === "string" &&
    proposedQuestion.length > 0 &&
    proposedQuestion.length <= 500;
  const clarificationIsUsable =
    clarification === null ||
    (typeof clarification === "string" && clarification.length > 0 && clarification.length <= 500);
  if (
    typeof body.summary !== "string" ||
    body.summary.length > MAX_INTERPRETATION_TEXT_CHARS ||
    facts === null ||
    entities === null ||
    !proposedQuestionIsUsable ||
    typeof body.needsClarification !== "boolean" ||
    !clarificationIsUsable ||
    (body.needsClarification && clarification === null)
  ) {
    throw new Error("Attachment interpreter returned an unusable result");
  }
  return {
    summary: body.summary,
    facts,
    entities,
    proposedQuestion,
    needsClarification: body.needsClarification,
    clarificationQuestion: clarification,
  };
}

export class InterpretInquiryAttachmentUseCase implements InterpretInquiryAttachment {
  constructor(
    private readonly attachments: InquiryAttachmentStorePort,
    private readonly orchestration: OrchestrationPort,
  ) {}

  async execute(input: InterpretInquiryAttachmentInput): Promise<AttachmentInterpretation> {
    const attachment = await this.attachments.findInquiryAttachmentById(input.id);
    if (!attachment || attachment.ownerId !== input.ownerId || attachment.runId !== null) {
      throw new InquiryAttachmentNotFoundError();
    }

    const now = new Date();
    if (attachment.expiresAt === null || attachment.expiresAt <= now) {
      await this.attachments.deleteInquiryAttachment(attachment.id);
      throw new InquiryAttachmentNotFoundError();
    }

    const question = input.question.trim();
    if (question.length > MAX_ATTACHMENT_CONTEXT_CHARS) {
      throw new InvalidInquiryAttachmentError(
        `Attachment context must be at most ${MAX_ATTACHMENT_CONTEXT_CHARS} characters`,
      );
    }

    const reserved = await this.attachments.reserveAttachmentInterpretation(
      input.ownerId,
      now.toISOString().slice(0, 10),
      INQUIRY_ATTACHMENT_DAILY_INTERPRETATION_CAP,
    );
    if (!reserved) {
      throw new InquiryAttachmentInterpretationCapError();
    }

    const graphInput = await this.graphInput(attachment, question);
    const body = await this.orchestration.run({
      graphName: GRAPH_NAME,
      input: graphInput,
    });
    const interpretation = interpretationFrom(body);
    await this.attachments.saveAttachmentInterpretation(attachment.id, interpretation);
    return interpretation;
  }

  private async graphInput(
    attachment: InquiryAttachment,
    question: string,
  ): Promise<Record<string, unknown>> {
    if (isTabularMediaType(attachment.mediaType) && attachment.profile) {
      return { kind: "tabular", profile: attachment.profile, userText: question };
    }
    if (!isImageMediaType(attachment.mediaType)) throw new InvalidInquiryAttachmentError();

    const bytes = await this.attachments.findInquiryAttachmentBytes(attachment.id);
    if (!bytes) throw new InquiryAttachmentNotFoundError();
    return {
      kind: "image",
      mediaType: attachment.mediaType,
      bytesBase64: bytesToBase64(bytes),
      userText: question,
    };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 32_768;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export class DeleteInquiryAttachmentUseCase implements DeleteInquiryAttachment {
  constructor(private readonly attachments: InquiryAttachmentStorePort) {}

  async execute(id: InquiryAttachmentId, ownerId: UserId): Promise<void> {
    const attachment = await this.attachments.findInquiryAttachmentById(id);
    if (!attachment || attachment.ownerId !== ownerId || attachment.runId !== null) {
      throw new InquiryAttachmentNotFoundError();
    }
    await this.attachments.deleteInquiryAttachment(id);
  }
}
