import type { GeoRegion, MarketCategory, MarketStatus, SignalSource, Topic } from "@atlas/domain";
import {
  GEO_REGIONS,
  MARKET_CATEGORIES,
  MARKET_STATUSES,
  SIGNAL_SOURCES,
  TOPICS,
} from "@atlas/domain";

export type RawQuery = Record<string, unknown>;

export function parseLimit(value: unknown): number | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

export function parseEnum<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  if (typeof value !== "string") return undefined;
  return allowed.find((candidate) => candidate === value);
}

export function parseStatus(value: unknown): MarketStatus | undefined {
  return parseEnum(MARKET_STATUSES, value);
}

export function parseCategory(value: unknown): MarketCategory | undefined {
  return parseEnum(MARKET_CATEGORIES, value);
}

export function parseRegion(value: unknown): GeoRegion | undefined {
  return parseEnum(GEO_REGIONS, value);
}

export function parseSource(value: unknown): SignalSource | undefined {
  return parseEnum(SIGNAL_SOURCES, value);
}

export function parseTopic(value: unknown): Topic | undefined {
  return parseEnum(TOPICS, value);
}
