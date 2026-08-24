import type { GeoRegion } from "@atlas/domain";
import { GEO_REGIONS } from "@atlas/domain";

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

export function parseRegion(value: unknown): GeoRegion | undefined {
  return parseEnum(GEO_REGIONS, value);
}

export function parseSince(value: unknown): Date | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const epoch = Number(value);
  const date = Number.isFinite(epoch) ? new Date(epoch) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}
