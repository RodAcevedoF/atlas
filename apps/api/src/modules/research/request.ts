import type { RequestResearchRunInput, ResearchRunFilter } from "@atlas/application";
import type { ResearchRunId } from "@atlas/domain";
import { makeResearchRunId } from "@atlas/domain";
import { InvalidInputError } from "../../core/errors.ts";
import { type RawQuery, parseLimit } from "../../core/parsing.ts";

export function parseResearchRunBody(
  body: Record<string, unknown> | undefined,
): RequestResearchRunInput {
  const source = body ?? {};
  return { question: typeof source.question === "string" ? source.question : "" };
}

export function parseResearchRunId(value: unknown): ResearchRunId {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidInputError("A research run id is required");
  }
  return makeResearchRunId(value);
}

export function parseResearchRunsQuery(query: RawQuery): ResearchRunFilter {
  return { limit: parseLimit(query.limit) };
}
