import type {
  ListWorldEventsInput,
  ListWorldSnapshotsInput,
  ListWorldTopicsInput,
} from "@atlas/application";
import {
  type RawQuery,
  parseLimit,
  parseRegion,
  parseSince,
  parseSource,
  parseTopic,
} from "../../core/parsing.ts";

export function parseWorldTopicsQuery(query: RawQuery): ListWorldTopicsInput {
  return {
    source: parseSource(query.source),
    topic: parseTopic(query.topic),
    region: parseRegion(query.region),
    since: parseSince(query.since),
    limit: parseLimit(query.limit),
  };
}

export function parseWorldEventsQuery(query: RawQuery): ListWorldEventsInput {
  return {
    source: parseSource(query.source),
    topic: parseTopic(query.topic),
    region: parseRegion(query.region),
    since: parseSince(query.since),
    limit: parseLimit(query.limit),
  };
}

export function parseWorldSnapshotsQuery(query: RawQuery): ListWorldSnapshotsInput {
  return {
    region: parseRegion(query.region),
    since: parseSince(query.since),
    limit: parseLimit(query.limit),
  };
}
