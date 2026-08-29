import type { InquiryRunFilter, RequestInquiryRunInput } from "@atlas/application";
import type { InquiryAttachmentId, InquiryRunId } from "@atlas/domain";
import { makeInquiryAttachmentId, makeInquiryRunId } from "@atlas/domain";
import { InvalidInputError } from "../../core/errors.ts";
import { type RawQuery, parseLimit } from "../../core/parsing.ts";

export function parseInquiryRunBody(
  body: Record<string, unknown> | undefined,
): Omit<RequestInquiryRunInput, "ownerId" | "role"> {
  const source = body ?? {};
  return {
    question: typeof source.question === "string" ? source.question : "",
    refresh: source.refresh === true,
    attachmentId:
      typeof source.attachmentId === "string"
        ? makeInquiryAttachmentId(source.attachmentId)
        : undefined,
  };
}

export function parseInquiryAttachmentId(value: unknown): InquiryAttachmentId {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidInputError("An attachment id is required");
  }
  return makeInquiryAttachmentId(value);
}

export function parseAttachmentFilename(value: unknown): string {
  if (typeof value !== "string") throw new InvalidInputError("An attachment filename is required");
  try {
    return decodeURIComponent(value);
  } catch {
    throw new InvalidInputError("Attachment filename is invalid");
  }
}

export function parseAttachmentInterpretationBody(
  body: Record<string, unknown> | undefined,
): string {
  return typeof body?.question === "string" ? body.question : "";
}

export function parseInquiryRunId(value: unknown): InquiryRunId {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidInputError("An inquiry run id is required");
  }
  return makeInquiryRunId(value);
}

export function parseInquiryRunsQuery(query: RawQuery): InquiryRunFilter {
  return { limit: parseLimit(query.limit) };
}
