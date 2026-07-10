import type {
  ListWorldEventsInput,
  ListWorldTopicsInput,
  WorldScanInput,
  WorldScanReportFilter,
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

export function parseWorldScanBody(body: Record<string, unknown> | undefined): WorldScanInput {
  const source = body ?? {};
  return {
    topic: parseTopic(source.topic),
    region: parseRegion(source.region),
    since: parseSince(source.since),
  };
}

export function parseWorldScanHistoryQuery(query: RawQuery): WorldScanReportFilter {
  return {
    topic: parseTopic(query.topic),
    region: parseRegion(query.region),
    limit: parseLimit(query.limit),
  };
}
