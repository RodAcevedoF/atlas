import type { InquiryRunFilter, RequestInquiryRunInput } from "@atlas/application";
import type { InquiryRunId } from "@atlas/domain";
import { makeInquiryRunId } from "@atlas/domain";
import { InvalidInputError } from "../../core/errors.ts";
import { type RawQuery, parseLimit } from "../../core/parsing.ts";

export function parseInquiryRunBody(
  body: Record<string, unknown> | undefined,
): Omit<RequestInquiryRunInput, "ownerId" | "role"> {
  const source = body ?? {};
  return {
    question: typeof source.question === "string" ? source.question : "",
    refresh: source.refresh === true,
  };
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
