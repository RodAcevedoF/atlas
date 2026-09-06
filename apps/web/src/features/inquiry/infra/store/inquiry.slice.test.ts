import { describe, expect, test } from "bun:test";
import type { UnknownAction } from "@reduxjs/toolkit";
import { buildInquiryRun, buildInquiryRunSummary } from "../../testing/inquiry-builder.ts";
import {
  askInquiryQuestion,
  inquiryAttachmentSubmitted,
  inquiryRunRequested,
  inquiryRunSnapshotReceived,
  inquiryRunWatchLost,
  interpretInquiryAttachment,
  loadInquiryRun,
  loadRecentInquiryRuns,
  uploadInquiryAttachment,
} from "./inquiry.commands.ts";
import { type InquiryState, askErrorDismissed, inquiryReducer } from "./inquiry.slice.ts";

const REQUEST_ID = "req-1";
const REFRESH = { question: "where is lithium mining expanding", refresh: true };
const ASK = { ...REFRESH, refresh: false };

const OUTCOME = {
  status: "succeeded" as const,
  deduped: false,
  settled: true,
};

function runningSnapshot(revision: number, overrides: Parameters<typeof buildInquiryRun>[0] = {}) {
  return buildInquiryRun({
    id: "run-1",
    status: "running",
    progress: { stage: "map_ready", revision, updatedAt: "2026-08-18T09:00:10.000Z" },
    ...overrides,
  });
}

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

test("a completed ask keeps the run identity and status for app-level completion feedback", () => {
  const pending = inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, ASK));
  const requested = inquiryReducer(pending, inquiryRunRequested("run-1"));

  const completed = inquiryReducer(
    requested,
    inquiryRunSnapshotReceived(buildInquiryRun({ id: "run-1", status: "succeeded" })),
  );

  expect(completed.ask.startedRunId).toBeNull();
  expect(completed.ask.isAsking).toBe(false);
  expect(completed.ask.completion).toEqual({ runId: "run-1", status: "succeeded" });
});

test("mid-run snapshots surface the live status and stage while the ask stays open", () => {
  const pending = inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, ASK));
  const requested = inquiryReducer(pending, inquiryRunRequested("run-1"));

  const progressed = inquiryReducer(requested, inquiryRunSnapshotReceived(runningSnapshot(2)));

  expect(progressed.ask.isAsking).toBe(true);
  expect(progressed.ask.watchedStatus).toBe("running");
  expect(progressed.ask.watchedStage).toBe("map_ready");
});

test("a snapshot of someone else's run leaves the ask alone", () => {
  const pending = inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, ASK));
  const requested = inquiryReducer(pending, inquiryRunRequested("run-1"));

  const unrelated = inquiryReducer(
    requested,
    inquiryRunSnapshotReceived(buildInquiryRun({ id: "run-2", status: "succeeded" })),
  );

  expect(unrelated.ask.isAsking).toBe(true);
  expect(unrelated.ask.completion).toBeNull();
});

test("a settled fulfilment cannot resurrect an ask its snapshot already completed", () => {
  const pending = inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, ASK));
  const requested = inquiryReducer(pending, inquiryRunRequested("run-1"));
  const completed = inquiryReducer(
    requested,
    inquiryRunSnapshotReceived(buildInquiryRun({ id: "run-1", status: "succeeded" })),
  );

  const fulfilled = inquiryReducer(
    completed,
    askInquiryQuestion.fulfilled({ ...OUTCOME, settled: false, status: "queued" }, REQUEST_ID, ASK),
  );

  expect(fulfilled.ask.isAsking).toBe(false);
  expect(fulfilled.ask.watchedStatus).toBeNull();
});

test("a lost watch reports the run as still running instead of hanging the ask", () => {
  const pending = inquiryReducer(undefined, askInquiryQuestion.pending(REQUEST_ID, ASK));
  const requested = inquiryReducer(pending, inquiryRunRequested("run-1"));

  const lost = inquiryReducer(requested, inquiryRunWatchLost("run-1"));

  expect(lost.ask.isAsking).toBe(false);
  expect(lost.ask.isStillRunning).toBe(true);
});

test("a stale snapshot cannot regress a newer checkpoint", () => {
  const enriched = runningSnapshot(3, { synthesis: "the global read" });
  const withNewer = inquiryReducer(undefined, inquiryRunSnapshotReceived(enriched));

  const afterStale = inquiryReducer(
    withNewer,
    inquiryRunSnapshotReceived(runningSnapshot(2, { synthesis: null })),
  );

  expect(afterStale.detail.byId["run-1"]?.synthesis).toBe("the global read");
});

test("a refetched detail cannot overwrite a newer streamed one", () => {
  const streamed = runningSnapshot(3, { synthesis: "the global read" });
  const withStream = inquiryReducer(undefined, inquiryRunSnapshotReceived(streamed));

  const afterFetch = inquiryReducer(
    withStream,
    loadInquiryRun.fulfilled(runningSnapshot(1, { synthesis: null }), REQUEST_ID, "run-1"),
  );

  expect(afterFetch.detail.byId["run-1"]?.synthesis).toBe("the global read");
});

test("a stale list response cannot regress a streamed row or evict its newer detail", () => {
  const staleList = loadRecentInquiryRuns.fulfilled(
    {
      runs: [
        buildInquiryRunSummary({ id: "run-1", status: "running", placeCount: 0, revision: 1 }),
      ],
      pinnedRunId: null,
    },
    REQUEST_ID,
    undefined,
  );
  const loaded = inquiryReducer(undefined, staleList);
  const finished = inquiryReducer(
    loaded,
    inquiryRunSnapshotReceived(buildInquiryRun({ id: "run-1", status: "succeeded" })),
  );

  const afterStaleList = inquiryReducer(finished, staleList);

  expect(afterStaleList.runs[0]?.status).toBe("succeeded");
  expect(afterStaleList.detail.byId["run-1"]?.status).toBe("succeeded");
});

test("a list response newer than a cached detail evicts it, so the viewer refetches", () => {
  const held = inquiryReducer(undefined, inquiryRunSnapshotReceived(runningSnapshot(2)));
  const advancedList = loadRecentInquiryRuns.fulfilled(
    {
      runs: [buildInquiryRunSummary({ id: "run-1", status: "running", revision: 5 })],
      pinnedRunId: null,
    },
    REQUEST_ID,
    undefined,
  );

  const afterList = inquiryReducer(held, advancedList);

  expect(afterList.detail.byId["run-1"]).toBeUndefined();
  expect(afterList.runs[0]?.revision).toBe(5);
});

test("a stale snapshot cannot regress the run's newer row", () => {
  const listed = buildInquiryRunSummary({ id: "run-1", status: "succeeded" });
  const loaded = inquiryReducer(
    undefined,
    loadRecentInquiryRuns.fulfilled({ runs: [listed], pinnedRunId: null }, REQUEST_ID, undefined),
  );

  const afterStale = inquiryReducer(loaded, inquiryRunSnapshotReceived(runningSnapshot(2)));

  expect(afterStale.runs[0]?.status).toBe("succeeded");
});

test("a live snapshot refreshes the run's row in the recent list", () => {
  const listed = buildInquiryRunSummary({
    id: "run-1",
    status: "running",
    placeCount: 0,
    revision: 1,
  });
  const loaded = inquiryReducer(
    undefined,
    loadRecentInquiryRuns.fulfilled({ runs: [listed], pinnedRunId: null }, REQUEST_ID, undefined),
  );

  const painted = inquiryReducer(loaded, inquiryRunSnapshotReceived(runningSnapshot(2)));

  expect(painted.runs[0]?.status).toBe("running");
  expect(painted.runs[0]?.placeCount).toBe(1);
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
