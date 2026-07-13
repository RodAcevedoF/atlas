import type { ProfileUpdateInput } from "@atlas/application";
import { GEO_REGIONS, TOPICS } from "@atlas/domain";

function parseEnumArray<T extends string>(allowed: readonly T[], value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  const selected = new Set<T>();
  for (const item of value) {
    const match = allowed.find((candidate) => candidate === item);
    if (match) selected.add(match);
  }
  return [...selected];
}

export function parseProfileUpdate(body: Record<string, unknown> | undefined): ProfileUpdateInput {
  const source = body ?? {};
  return {
    preferredRegions: parseEnumArray(GEO_REGIONS, source.preferredRegions),
    preferredTopics: parseEnumArray(TOPICS, source.preferredTopics),
  };
}
