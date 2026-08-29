import { describe, expect, test } from "bun:test";
import type { UnknownAction } from "@reduxjs/toolkit";
import {
  askInquiryQuestion,
  inquiryAttachmentSubmitted,
  interpretInquiryAttachment,
  uploadInquiryAttachment,
} from "./inquiry.commands.ts";
import { type InquiryState, askErrorDismissed, inquiryReducer } from "./inquiry.slice.ts";

const REQUEST_ID = "req-1";
const REFRESH = { question: "where is lithium mining expanding", refresh: true };
const ASK = { ...REFRESH, refresh: false };

const OUTCOME = {
  status: "succeeded" as const,
  isStillRunning: false,
  deduped: false,
  watchError: null,
};

function askStateAfter(request: typeof REFRESH, settled: UnknownAction): InquiryState["ask"] {
  const started = inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, request));

  return inquiryReducer(started, settled).ask;
}

describe("a refresh keeps its ask state marked as a refresh", () => {
  test("after it succeeds — so the outcome renders on the refresh control, not the ask box", () => {
    const settled = askInquiryQuestion.fulfilled(OUTCOME, REQUEST_ID, REFRESH);

    const ask = askStateAfter(REFRESH, settled);

    expect(ask.isRefresh).toBe(true);
    expect(ask.isAsking).toBe(false);
  });

  test("after it fails — an unmarked failure would surface in the ask box instead", () => {
    const settled = askInquiryQuestion.rejected(
      new Error("Exa is unreachable"),
      REQUEST_ID,
      REFRESH,
    );

    const ask = askStateAfter(REFRESH, settled);

    expect(ask.isRefresh).toBe(true);
    expect(ask.error).toBe("Exa is unreachable");
  });

  test("a plain ask stays unmarked, so its outcome still belongs to the ask box", () => {
    const settled = askInquiryQuestion.fulfilled(OUTCOME, REQUEST_ID, ASK);

    const ask = askStateAfter(ASK, settled);

    expect(ask.isRefresh).toBe(false);
  });
});

test("dismissing clears the error, so a failed refresh does not pin its pill in the navbar", () => {
  const failed = askInquiryQuestion.rejected(new Error("Exa is unreachable"), REQUEST_ID, REFRESH);
  const settled = inquiryReducer(
    inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, REFRESH)),
    failed,
  );

  const ask = inquiryReducer(settled, askErrorDismissed()).ask;

  expect(ask.error).toBeNull();
});

test("an interpreted draft stays beside the Ask box until its normal run accepts it", () => {
  const uploaded = inquiryReducer(
    undefined,
    uploadInquiryAttachment.fulfilled(
      { id: "attachment-1", filename: "companies.csv" },
      REQUEST_ID,
      new File(["company\nAtlas"], "companies.csv", { type: "text/csv" }),
    ),
  );
  const interpreted = inquiryReducer(
    uploaded,
    interpretInquiryAttachment.fulfilled(
      {
        summary: "A company list",
        facts: [],
        entities: ["Atlas"],
        proposedQuestion: "What is Atlas announcing?",
        needsClarification: false,
        clarificationQuestion: null,
      },
      REQUEST_ID,
      { id: "attachment-1", question: "" },
    ),
  );

  expect(interpreted.attachment.interpretation?.proposedQuestion).toBe("What is Atlas announcing?");
  expect(inquiryReducer(interpreted, inquiryAttachmentSubmitted()).attachment.id).toBeNull();
});
