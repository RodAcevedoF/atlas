import type { ListWorldSnapshotsInput } from "@atlas/application";
import { type RawQuery, parseLimit, parseRegion, parseSince } from "../../core/parsing.ts";

export function parseWorldSnapshotsQuery(query: RawQuery): ListWorldSnapshotsInput {
  return {
    region: parseRegion(query.region),
    since: parseSince(query.since),
    limit: parseLimit(query.limit),
  };
}
