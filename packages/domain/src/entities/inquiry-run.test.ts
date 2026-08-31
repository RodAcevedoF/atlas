import { describe, expect, test } from "bun:test";
import type { InquiryRun } from "./inquiry-run.ts";
import { makeInquiryRunId, toPublicInquiryRun } from "./inquiry-run.ts";
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

  test("source bodies stay server-side until a bounded presentation contract exists", () => {
    const publicRun = toPublicInquiryRun(
      succeededRun({
        documents: [
          {
            url: "https://example.test/article",
            title: "a headline",
            publishedDate: "2026-08-20T00:00:00.000Z",
            text: "the complete article body",
            highlights: ["a highlighted passage"],
          },
        ],
      }),
    );

    expect(publicRun).not.toHaveProperty("documents");
  });
});
