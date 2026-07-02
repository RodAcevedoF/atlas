import type { ListWorldEventsInput, ListWorldTopicsInput } from "@atlas/application";
import {
  type RawQuery,
  parseLimit,
  parseRegion,
  parseSource,
  parseTopic,
} from "../../core/parsing.ts";

export function parseWorldTopicsQuery(query: RawQuery): ListWorldTopicsInput {
  return {
    source: parseSource(query.source),
    topic: parseTopic(query.topic),
    region: parseRegion(query.region),
    limit: parseLimit(query.limit),
  };
}

export function parseWorldEventsQuery(query: RawQuery): ListWorldEventsInput {
  return {
    source: parseSource(query.source),
    topic: parseTopic(query.topic),
    region: parseRegion(query.region),
    limit: parseLimit(query.limit),
  };
}
