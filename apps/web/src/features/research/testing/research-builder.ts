import type { CountryAwarenessRecord } from "../repositories/research-repository.ts";

export function buildCountryAwareness(
  overrides: Partial<CountryAwarenessRecord> = {},
): CountryAwarenessRecord {
  return {
    country: "Sudan",
    awareness: 13.14,
    peak: 100,
    coveredBuckets: 120,
    totalBuckets: 167,
    confidence: "measured",
    ...overrides,
  };
}
