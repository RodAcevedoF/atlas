import type {
  CountryAwarenessRecord,
  ResearchRunRecord,
  ResearchRunSummaryRecord,
} from "../repositories/research-repository.ts";

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

export function buildResearchRun(overrides: Partial<ResearchRunRecord> = {}): ResearchRunRecord {
  return {
    id: "run-latest",
    question: "Where is the Sudan conflict being covered?",
    day: "2026-08-18",
    executedQuery: '"sudan" OR "soudan"',
    window: "last 7 days",
    distribution: [buildCountryAwareness()],
    exemplars: [],
    synthesis: null,
    status: "succeeded",
    createdAt: "2026-08-18T09:00:00.000Z",
    startedAt: "2026-08-18T09:00:01.000Z",
    completedAt: "2026-08-18T09:00:30.000Z",
    ...overrides,
  };
}

export function buildResearchRunSummary(
  overrides: Partial<ResearchRunSummaryRecord> = {},
): ResearchRunSummaryRecord {
  const { id, question, day, window, distribution, status, createdAt, startedAt, completedAt } =
    buildResearchRun();
  return {
    id,
    question,
    day,
    window,
    measuredCountries: distribution
      .filter((country) => country.confidence !== "artifact")
      .map((country) => country.country),
    status,
    createdAt,
    startedAt,
    completedAt,
    ...overrides,
  };
}
