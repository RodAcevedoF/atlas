import type { InquiryRunFilter, RequestInquiryRunInput } from "@atlas/application";
import type { ResearchRunId } from "@atlas/domain";
import { makeResearchRunId } from "@atlas/domain";
import { InvalidInputError } from "../../core/errors.ts";
import { type RawQuery, parseLimit } from "../../core/parsing.ts";

export function parseInquiryRunBody(
  body: Record<string, unknown> | undefined,
): RequestInquiryRunInput {
  const source = body ?? {};
  return { question: typeof source.question === "string" ? source.question : "" };
}

export function parseInquiryRunId(value: unknown): ResearchRunId {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidInputError("An inquiry run id is required");
  }
  return makeResearchRunId(value);
}

export function parseInquiryRunsQuery(query: RawQuery): InquiryRunFilter {
  return { limit: parseLimit(query.limit) };
}
