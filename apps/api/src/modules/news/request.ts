import type { IngestNewsInput } from "@atlas/application";
import { type RawQuery, parseLimit } from "../../core/parsing.ts";

export function parseIngestNewsBody(body: RawQuery): IngestNewsInput {
  return {
    query: typeof body.query === "string" ? body.query : undefined,
    limit: parseLimit(body.limit),
  };
}
