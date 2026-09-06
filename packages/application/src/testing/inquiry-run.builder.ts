import type { InquiryRun } from "@atlas/domain";
import { makeInquiryRunId, makeUserId, queuedInquiryProgress } from "@atlas/domain";

export const RETRY_AFTER_MS = 11 * 60 * 1000;
export const RUN_TIMEOUT_MS = 60 * 1000;
export const CREATED_AT = new Date();
export const LONG_AGO = new Date(CREATED_AT.getTime() - 48 * 60 * 60 * 1000);

export function inquiryRun(overrides: Partial<InquiryRun> = {}): InquiryRun {
  const createdAt = overrides.createdAt ?? CREATED_AT;
  return {
    id: makeInquiryRunId("run-1"),
    ownerId: makeUserId("user-1"),
    question: "who is covering the Sudan famine",
    questionKey: "who-is-covering-the-sudan-famine",
    day: "2026-08-16",
    window: "1w",
    places: [],
    documents: [],
    claimCount: 0,
    unplacedClaims: 0,
    costUsd: 0,
    synthesis: null,
    status: "queued",
    failure: null,
    error: null,
    attempts: 0,
    progress: queuedInquiryProgress(createdAt),
    completion: null,
    degradations: [],
    createdAt,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

export const SUCCESS_BODY = {
  status: "succeeded",
  error: null,
  places: [
    {
      place: "Khartoum",
      country: "Sudan",
      latitude: 15.5,
      longitude: 32.56,
      claimCount: 2,
      read: {
        text: "Reports describe displacement and disrupted aid routes.",
        sourceUrls: ["https://example.test/article"],
      },
      claims: [
        {
          text: "clashes displaced 7,800 people",
          confidence: 0.8,
          sourceUrl: "https://example.test/article",
          sourceTitle: "a headline",
          publishedDate: "2026-08-20T00:00:00.000Z",
          sourceImageUrl: "https://images.example.test/article.jpg",
        },
        {
          text: "aid routes were disrupted",
          confidence: 0.7,
          sourceUrl: "https://example.test/article-2",
          sourceTitle: "another headline",
          publishedDate: "2026-08-20T00:00:00.000Z",
          sourceImageUrl: null,
        },
      ],
    },
  ],
  documents: [
    {
      url: "https://example.test/article",
      title: "a headline",
      publishedDate: "2026-08-20T00:00:00.000Z",
      text: "the article body",
      highlights: ["a highlighted passage"],
    },
  ],
  claimCount: 3,
  unplacedClaims: 1,
  costUsd: 0.045,
  synthesis: "Reported activity concentrates on Khartoum.",
};
