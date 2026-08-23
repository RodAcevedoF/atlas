import type {
  InquiryClaimRecord,
  InquiryPlaceRecord,
  InquiryRunRecord,
  InquiryRunSummaryRecord,
} from "../repositories/inquiry-repository.ts";

export function buildInquiryClaim(overrides: Partial<InquiryClaimRecord> = {}): InquiryClaimRecord {
  return {
    text: "clashes in and near Geissan displaced 7,800 people",
    confidence: 0.8,
    sourceUrl: "https://example.test/article",
    sourceTitle: "a headline",
    publishedDate: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

export function buildInquiryPlace(overrides: Partial<InquiryPlaceRecord> = {}): InquiryPlaceRecord {
  return {
    place: "Khartoum",
    country: "Sudan",
    latitude: 15.5,
    longitude: 32.56,
    claimCount: 1,
    claims: [buildInquiryClaim()],
    ...overrides,
  };
}

export function buildInquiryRun(overrides: Partial<InquiryRunRecord> = {}): InquiryRunRecord {
  return {
    id: "run-latest",
    question: "What is happening in Sudan?",
    day: "2026-08-18",
    window: "last 7 days",
    places: [buildInquiryPlace()],
    claimCount: 1,
    unplacedClaims: 0,
    retrievalCostUsd: 0.047,
    synthesis: null,
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: "2026-08-18T09:00:00.000Z",
    startedAt: "2026-08-18T09:00:01.000Z",
    completedAt: "2026-08-18T09:00:30.000Z",
    ...overrides,
  };
}

export function buildInquiryRunSummary(
  overrides: Partial<InquiryRunSummaryRecord> = {},
): InquiryRunSummaryRecord {
  const { id, question, day, window, places, status, createdAt, startedAt, completedAt } =
    buildInquiryRun();
  return {
    id,
    question,
    day,
    window,
    placeCount: places.length,
    status,
    createdAt,
    startedAt,
    completedAt,
    ...overrides,
  };
}
