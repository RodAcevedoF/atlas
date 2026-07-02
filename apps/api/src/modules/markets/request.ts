import type {
  ListEventsInput,
  ListMarketsInput,
  ListRegionSummariesInput,
} from "@atlas/application";
import {
  type RawQuery,
  parseCategory,
  parseLimit,
  parseRegion,
  parseStatus,
} from "../../core/parsing.ts";

export function parseListMarketsQuery(query: RawQuery): ListMarketsInput {
  return {
    status: parseStatus(query.status),
    category: parseCategory(query.category),
    limit: parseLimit(query.limit),
  };
}

export function parseListEventsQuery(query: RawQuery): ListEventsInput {
  return {
    limit: parseLimit(query.limit),
  };
}

export function parseRegionSummariesQuery(query: RawQuery): ListRegionSummariesInput {
  return {
    status: parseStatus(query.status),
    category: parseCategory(query.category),
    limit: parseLimit(query.limit),
    region: parseRegion(query.region),
  };
}
