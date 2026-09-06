import type { RootState } from "@/store/index.ts";
import type { InquiryProgressStage, InquiryRunStatus } from "@atlas/domain";
import { createSlice } from "@reduxjs/toolkit";
import type {
  AttachmentInterpretationRecord,
  InquiryBudgetRecord,
  InquiryRunRecord,
  InquiryRunSummaryRecord,
} from "../../repositories/inquiry-repository.ts";
import {
  askInquiryQuestion,
  deleteInquiryAttachment,
  deleteInquiryRun,
  inquiryAttachmentSubmitted,
  inquiryRunRequested,
  inquiryRunSnapshotReceived,
  inquiryRunWatchLost,
  interpretInquiryAttachment,
  loadInquiryBudget,
  loadInquiryRun,
  loadRecentInquiryRuns,
  uploadInquiryAttachment,
} from "./inquiry.commands.ts";

export interface InquiryAskState {
  startedRunId: string | null;
  completion: InquiryRunCompletion | null;
  isAsking: boolean;
  isRefresh: boolean;
  watchedStatus: InquiryRunStatus | null;
  watchedStage: InquiryProgressStage | null;
  isStillRunning: boolean;
  wasDeduped: boolean;
  error: string | null;
}

export interface InquiryRunCompletion {
  runId: string;
  status: InquiryRunStatus;
}

export interface InquiryDetailFailure {
  runId: string;
  message: string;
}

export interface InquiryDetailState {
  byId: Record<string, InquiryRunRecord>;
  loadingId: string | null;
  failure: InquiryDetailFailure | null;
}

export interface InquiryState {
  runs: InquiryRunSummaryRecord[];
  pinnedRunId: string | null;
  isLoading: boolean;
  error: string | null;
  detail: InquiryDetailState;
  ask: InquiryAskState;
  budget: InquiryBudgetRecord | null;
  attachment: InquiryAttachmentState;
}

export type InquiryAttachmentStatus = "idle" | "uploading" | "ready" | "interpreting";

export interface InquiryAttachmentState {
  id: string | null;
  filename: string | null;
  status: InquiryAttachmentStatus;
  interpretation: AttachmentInterpretationRecord | null;
  interpretationCount: number;
  error: string | null;
}

const idleAttachment: InquiryAttachmentState = {
  id: null,
  filename: null,
  status: "idle",
  interpretation: null,
  interpretationCount: 0,
  error: null,
};

const idleAsk: InquiryAskState = {
  startedRunId: null,
  completion: null,
  isAsking: false,
  isRefresh: false,
  watchedStatus: null,
  watchedStage: null,
  isStillRunning: false,
  wasDeduped: false,
  error: null,
};

const initialState: InquiryState = {
  runs: [],
  pinnedRunId: null,
  isLoading: true,
  error: null,
  detail: { byId: {}, loadingId: null, failure: null },
  ask: idleAsk,
  budget: null,
  attachment: idleAttachment,
};

function isNewerSnapshot(
  current: InquiryRunRecord | undefined,
  incoming: InquiryRunRecord,
): boolean {
  return !current || incoming.progress.revision > current.progress.revision;
}

function toSummaryRecord(run: InquiryRunRecord): InquiryRunSummaryRecord {
  return {
    id: run.id,
    ownerId: run.ownerId,
    question: run.question,
    day: run.day,
    window: run.window,
    placeCount: run.places.length,
    status: run.status,
    revision: run.progress.revision,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

function applySnapshotToAsk(ask: InquiryAskState, run: InquiryRunRecord): void {
  if (ask.startedRunId !== run.id) return;
  if (run.progress.stage !== "terminal") {
    ask.watchedStatus = run.status;
    ask.watchedStage = run.progress.stage;
    return;
  }
  ask.completion = { runId: run.id, status: run.status };
  ask.startedRunId = null;
  ask.isAsking = false;
  ask.watchedStatus = null;
  ask.watchedStage = null;
  ask.isStillRunning = false;
  ask.error = null;
}

function mergeSummaries(
  current: InquiryRunSummaryRecord[],
  incoming: InquiryRunSummaryRecord[],
): InquiryRunSummaryRecord[] {
  const held = new Map(current.map((summary) => [summary.id, summary]));
  return incoming.map((summary) => {
    const heldSummary = held.get(summary.id);
    return heldSummary && heldSummary.revision > summary.revision ? heldSummary : summary;
  });
}

function keepFreshDetails(
  byId: Record<string, InquiryRunRecord>,
  summaries: InquiryRunSummaryRecord[],
): Record<string, InquiryRunRecord> {
  const revisions = new Map(summaries.map((summary) => [summary.id, summary.revision]));
  return Object.fromEntries(
    Object.entries(byId).filter(([runId, run]) => {
      const listed = revisions.get(runId);
      return listed !== undefined && listed <= run.progress.revision;
    }),
  );
}

const inquirySlice = createSlice({
  name: "inquiry",
  initialState,
  reducers: {
    askErrorDismissed(state) {
      state.ask.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRecentInquiryRuns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadRecentInquiryRuns.fulfilled, (state, action) => {
        state.runs = mergeSummaries(state.runs, action.payload.runs);
        state.pinnedRunId = action.payload.pinnedRunId;
        state.isLoading = false;
        state.detail.byId = keepFreshDetails(state.detail.byId, state.runs);
      })
      .addCase(loadRecentInquiryRuns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Failed to load your recent inquiry runs";
      })
      .addCase(loadInquiryRun.pending, (state, action) => {
        state.detail.loadingId = action.meta.arg;
        state.detail.failure = null;
      })
      .addCase(loadInquiryRun.fulfilled, (state, action) => {
        if (isNewerSnapshot(state.detail.byId[action.payload.id], action.payload)) {
          state.detail.byId[action.payload.id] = action.payload;
        }
        state.detail.loadingId = null;
      })
      .addCase(inquiryRunSnapshotReceived, (state, action) => {
        const run = action.payload;
        if (!isNewerSnapshot(state.detail.byId[run.id], run)) return;
        state.detail.byId[run.id] = run;
        const row = state.runs.findIndex((candidate) => candidate.id === run.id);
        const listed = state.runs[row];
        if (listed && run.progress.revision > listed.revision) {
          state.runs[row] = toSummaryRecord(run);
        }
        applySnapshotToAsk(state.ask, run);
      })
      .addCase(inquiryRunWatchLost, (state, action) => {
        if (state.ask.startedRunId !== action.payload || !state.ask.isAsking) return;
        state.ask = {
          ...idleAsk,
          isRefresh: state.ask.isRefresh,
          wasDeduped: state.ask.wasDeduped,
          isStillRunning: true,
        };
      })
      .addCase(loadInquiryRun.rejected, (state, action) => {
        state.detail.loadingId = null;
        state.detail.failure = {
          runId: action.meta.arg,
          message: action.error.message ?? "Failed to load that inquiry run",
        };
      })
      .addCase(loadInquiryBudget.fulfilled, (state, action) => {
        state.budget = action.payload;
      })
      .addCase(deleteInquiryRun.rejected, (state, action) => {
        state.error = action.error.message ?? "Failed to delete that inquiry run";
      })
      .addCase(uploadInquiryAttachment.pending, (state, action) => {
        state.attachment = {
          ...idleAttachment,
          filename: action.meta.arg.name,
          status: "uploading",
        };
      })
      .addCase(uploadInquiryAttachment.fulfilled, (state, action) => {
        state.attachment.id = action.payload.id;
        state.attachment.filename = action.payload.filename;
        state.attachment.status = "ready";
      })
      .addCase(uploadInquiryAttachment.rejected, (state, action) => {
        state.attachment = {
          ...idleAttachment,
          error: action.error.message ?? "Could not attach that file",
        };
      })
      .addCase(interpretInquiryAttachment.pending, (state) => {
        state.attachment.status = "interpreting";
        state.attachment.error = null;
      })
      .addCase(interpretInquiryAttachment.fulfilled, (state, action) => {
        state.attachment.status = "ready";
        state.attachment.interpretation = action.payload;
        state.attachment.interpretationCount += 1;
      })
      .addCase(interpretInquiryAttachment.rejected, (state, action) => {
        state.attachment.status = "ready";
        state.attachment.error = action.error.message ?? "Could not interpret that file";
      })
      .addCase(deleteInquiryAttachment.fulfilled, (state) => {
        state.attachment = idleAttachment;
      })
      .addCase(deleteInquiryAttachment.rejected, (state, action) => {
        state.attachment.error = action.error.message ?? "Could not remove that file";
      })
      .addCase(inquiryAttachmentSubmitted, (state) => {
        state.attachment = idleAttachment;
      })
      .addCase(askInquiryQuestion.pending, (state, action) => {
        state.ask = { ...idleAsk, isAsking: true, isRefresh: action.meta.arg.refresh };
      })
      .addCase(inquiryRunRequested, (state, action) => {
        state.ask.startedRunId = action.payload;
      })
      .addCase(askInquiryQuestion.fulfilled, (state, action) => {
        if (!action.payload.settled) {
          if (!state.ask.isAsking) return;
          state.ask.wasDeduped = action.payload.deduped;
          state.ask.watchedStatus ??= action.payload.status;
          return;
        }
        state.ask = {
          ...idleAsk,
          completion: state.ask.startedRunId
            ? { runId: state.ask.startedRunId, status: action.payload.status }
            : null,
          isRefresh: state.ask.isRefresh,
          wasDeduped: action.payload.deduped,
        };
      })
      .addCase(askInquiryQuestion.rejected, (state, action) => {
        state.ask = {
          ...idleAsk,
          isRefresh: state.ask.isRefresh,
          error: action.error.message ?? "Failed to start your inquiry run",
        };
      });
  },
});

export const inquiryReducer = inquirySlice.reducer;
export const { askErrorDismissed } = inquirySlice.actions;

export const selectInquiry = (state: RootState): InquiryState => state.inquiry;
export const selectInquiryDetail = (state: RootState): InquiryDetailState => state.inquiry.detail;
export const selectInquiryAsk = (state: RootState): InquiryAskState => state.inquiry.ask;
export const selectInquiryBudget = (state: RootState): InquiryBudgetRecord | null =>
  state.inquiry.budget;
export const selectInquiryAttachment = (state: RootState): InquiryAttachmentState =>
  state.inquiry.attachment;
