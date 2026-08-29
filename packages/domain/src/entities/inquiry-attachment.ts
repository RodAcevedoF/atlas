import type { InquiryRunId } from "./inquiry-run.ts";
import type { UserId } from "./user.ts";

export type InquiryAttachmentId = string & { readonly _brand: "InquiryAttachmentId" };

export function makeInquiryAttachmentId(value: string): InquiryAttachmentId {
  return value as InquiryAttachmentId;
}

export const INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;
export const INQUIRY_IMAGE_ATTACHMENT_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const INQUIRY_ATTACHMENT_MEDIA_TYPES = [
  ...INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES,
  ...INQUIRY_IMAGE_ATTACHMENT_MEDIA_TYPES,
] as const;
export type InquiryAttachmentMediaType = (typeof INQUIRY_ATTACHMENT_MEDIA_TYPES)[number];
export type InquiryTabularAttachmentMediaType =
  (typeof INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES)[number];
export type InquiryImageAttachmentMediaType = (typeof INQUIRY_IMAGE_ATTACHMENT_MEDIA_TYPES)[number];

export type TableCell = string | number | boolean | null;
export type TableColumnType = "string" | "number" | "boolean" | "date" | "mixed" | "empty";

export interface TableColumnProfile {
  name: string;
  type: TableColumnType;
}

export interface TableSheetProfile {
  name: string;
  rowCount: number;
  columnCount: number;
  columns: TableColumnProfile[];
  representativeRows: TableCell[][];
  columnsTruncated: boolean;
  rowsSampled: number;
}

export interface TableProfile {
  sheetCount: number;
  sheets: TableSheetProfile[];
  sheetsTruncated: boolean;
}

export interface AttachmentInterpretation {
  summary: string;
  facts: string[];
  entities: string[];
  proposedQuestion: string;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface InquiryAttachment {
  id: InquiryAttachmentId;
  ownerId: UserId;
  filename: string;
  mediaType: InquiryAttachmentMediaType;
  profile: TableProfile | null;
  interpretation: AttachmentInterpretation | null;
  interpretationCount: number;
  runId: InquiryRunId | null;
  createdAt: Date;
  expiresAt: Date | null;
}
