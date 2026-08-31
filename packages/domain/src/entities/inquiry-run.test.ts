import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "./inquiry-run.ts";
import { isLowConfidenceClaim, makeInquiryRunId, toPublicInquiryRun } from "./inquiry-run.ts";
import { makeUserId } from "./user.ts";

function succeededRun(overrides: Partial<InquiryRun> = {}): InquiryRun {
  return {
    id: makeInquiryRunId("run-1"),
    ownerId: makeUserId("user-1"),
    question: "where is lithium mining expanding",
    questionKey: "where-is-lithium-mining-expanding",
    day: "2026-08-23",
    window: "1w",
    places: [],
    documents: [],
    claimCount: 12,
    unplacedClaims: 3,
    costUsd: 0.047,
    synthesis: "Lithium extraction is expanding.",
    status: "succeeded",
    error: null,
    attempts: 1,
    createdAt: new Date("2026-08-23T12:00:00Z"),
    startedAt: new Date("2026-08-23T12:00:01Z"),
    completedAt: new Date("2026-08-23T12:01:11Z"),
    ...overrides,
  };
}

describe("the public run carries what a reader is charged for", () => {
  test("the retrieval cost reaches the wire, so the UI is not left inventing it", () => {
    const publicRun = toPublicInquiryRun(succeededRun());

    expect(publicRun.retrievalCostUsd).toBe(0.047);
  });

  test("a failed run reports no retrieval cost rather than omitting the field", () => {
    const publicRun = toPublicInquiryRun(
      succeededRun({ status: "failed_permanent", costUsd: 0, error: "no timeline" }),
    );

    expect(publicRun.retrievalCostUsd).toBe(0);
  });

  test("questionKey stays server-side — it is a dedupe key, not something a reader asked for", () => {
    const publicRun = toPublicInquiryRun(succeededRun());

    expect(publicRun).not.toHaveProperty("questionKey");
  });

  test("source bodies stay server-side while a derived place read remains traceable in public", () => {
    const sourceUrl = "https://example.test/article";
    const publicRun = toPublicInquiryRun(
      succeededRun({
        places: [
          {
            place: "Khartoum",
            country: "Sudan",
            latitude: 15.5,
            longitude: 32.56,
            claimCount: 2,
            read: { text: "Reports describe disrupted aid routes.", sourceUrls: [sourceUrl] },
            claims: [
              {
                text: "families were displaced",
                confidence: 0.8,
                sourceUrl,
                sourceTitle: "a headline",
                publishedDate: "2026-08-20T00:00:00.000Z",
                sourceImageUrl: null,
              },
              {
                text: "aid routes were disrupted",
                confidence: 0.7,
                sourceUrl,
                sourceTitle: "a headline",
                publishedDate: "2026-08-20T00:00:00.000Z",
                sourceImageUrl: null,
              },
            ],
          },
        ],
        documents: [
          {
            url: sourceUrl,
            title: "a headline",
            publishedDate: "2026-08-20T00:00:00.000Z",
            text: "the complete article body",
            highlights: ["a highlighted passage"],
          },
        ],
      }),
    );

    expect(publicRun.places[0]?.read?.sourceUrls).toEqual([sourceUrl]);
    expect(publicRun).not.toHaveProperty("documents");
  });
});

describe("one threshold decides what every surface calls a weak claim", () => {
  const cases = [
    {
      name: "a claim just under the ceiling is weak, so the reader is warned rather than misled",
      confidence: 0.49,
      isLow: true,
    },
    {
      name: "a claim exactly at the ceiling is trusted, so the boundary cannot drift between surfaces",
      confidence: 0.5,
      isLow: false,
    },
    {
      name: "a confident claim carries no warning, so the warning keeps its meaning",
      confidence: 0.8,
      isLow: false,
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, () => {
      expect(isLowConfidenceClaim({ confidence: testCase.confidence })).toBe(testCase.isLow);
    });
  }
});
