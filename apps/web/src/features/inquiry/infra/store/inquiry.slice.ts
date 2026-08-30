import type { RootState } from "@/store/index.ts";
import type { InquiryRunStatus } from "@atlas/domain";
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
  inquiryRunProgressed,
  inquiryRunRequested,
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

function keepFreshDetails(
  byId: Record<string, InquiryRunRecord>,
  summaries: InquiryRunSummaryRecord[],
): Record<string, InquiryRunRecord> {
  const statuses = new Map(summaries.map((summary) => [summary.id, summary.status]));
  return Object.fromEntries(
    Object.entries(byId).filter(([runId, run]) => statuses.get(runId) === run.status),
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
        state.runs = action.payload.runs;
        state.pinnedRunId = action.payload.pinnedRunId;
        state.isLoading = false;
        state.detail.byId = keepFreshDetails(state.detail.byId, action.payload.runs);
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
        state.detail.byId[action.payload.id] = action.payload;
        state.detail.loadingId = null;
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
      .addCase(inquiryRunProgressed, (state, action) => {
        state.ask.watchedStatus = action.payload;
      })
      .addCase(askInquiryQuestion.fulfilled, (state, action) => {
        state.ask = {
          ...idleAsk,
          completion: state.ask.startedRunId
            ? { runId: state.ask.startedRunId, status: action.payload.status }
            : null,
          isRefresh: state.ask.isRefresh,
          isStillRunning: action.payload.isStillRunning,
          wasDeduped: action.payload.deduped,
          error: action.payload.watchError,
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
