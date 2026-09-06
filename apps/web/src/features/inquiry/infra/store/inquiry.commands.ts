import type { AppThunkExtra, RootState } from "@/store/index.ts";
import type { InquiryRunStatus } from "@atlas/domain";
import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  AttachmentInterpretationRecord,
  InquiryAttachmentRecord,
  InquiryBudgetRecord,
  InquiryRunListRecord,
  InquiryRunRecord,
  InquiryRunRequestInput,
} from "../../repositories/inquiry-repository.ts";
import { makeDeleteInquiryRun } from "../../use-cases/delete-inquiry-run.ts";
import {
  makeDeleteInquiryAttachment,
  makeInterpretInquiryAttachment,
  makeUploadInquiryAttachment,
} from "../../use-cases/inquiry-attachment.ts";
import { makeLoadInquiryBudget } from "../../use-cases/load-inquiry-budget.ts";
import { makeLoadInquiryRun } from "../../use-cases/load-inquiry-run.ts";
import { makeLoadRecentInquiryRuns } from "../../use-cases/load-recent-inquiry-runs.ts";
import { makeRequestInquiryRun } from "../../use-cases/request-inquiry-run.ts";
import { isInquiryRunSettled } from "../../use-cases/watch-inquiry-run.ts";

export const inquiryRunSnapshotReceived = createAction<InquiryRunRecord>("inquiry/snapshot");
export const inquiryRunWatchLost = createAction<string>("inquiry/watchLost");
export const inquiryRunRequested = createAction<string>("inquiry/requested");
export const inquiryAttachmentSubmitted = createAction("inquiry/attachmentSubmitted");

export interface AskInquiryQuestionOutcome {
  deduped: boolean;
  status: InquiryRunStatus;
  settled: boolean;
}

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadRecentInquiryRuns = createAsyncThunk<InquiryRunListRecord, void, CommandConfig>(
  "inquiry/loadRecent",
  (_input, { extra }) => makeLoadRecentInquiryRuns(extra)(),
);

export const loadInquiryBudget = createAsyncThunk<InquiryBudgetRecord, void, CommandConfig>(
  "inquiry/loadBudget",
  (_input, { extra }) => makeLoadInquiryBudget(extra)(),
);

export const loadInquiryRun = createAsyncThunk<InquiryRunRecord, string, CommandConfig>(
  "inquiry/loadRun",
  (runId, { extra }) => makeLoadInquiryRun(extra)(runId),
);

export const deleteInquiryRun = createAsyncThunk<void, string, CommandConfig>(
  "inquiry/delete",
  async (runId, { extra, dispatch }) => {
    await makeDeleteInquiryRun(extra)(runId);
    await dispatch(loadRecentInquiryRuns());
  },
);

export const uploadInquiryAttachment = createAsyncThunk<
  InquiryAttachmentRecord,
  File,
  CommandConfig
>("inquiry/uploadAttachment", (file, { extra }) => makeUploadInquiryAttachment(extra)(file));

export const interpretInquiryAttachment = createAsyncThunk<
  AttachmentInterpretationRecord,
  { id: string; question: string },
  CommandConfig
>("inquiry/interpretAttachment", (input, { extra }) =>
  makeInterpretInquiryAttachment(extra)(input.id, input.question),
);

export const deleteInquiryAttachment = createAsyncThunk<void, string, CommandConfig>(
  "inquiry/deleteAttachment",
  (id, { extra }) => makeDeleteInquiryAttachment(extra)(id),
);

export const askInquiryQuestion = createAsyncThunk<
  AskInquiryQuestionOutcome,
  InquiryRunRequestInput,
  CommandConfig
>("inquiry/ask", async (request, { extra, dispatch }) => {
  const requested = await makeRequestInquiryRun(extra)(request);
  if (request.attachmentId) dispatch(inquiryAttachmentSubmitted());
  const budgetLoaded = dispatch(loadInquiryBudget());
  await dispatch(loadRecentInquiryRuns());
  dispatch(inquiryRunRequested(requested.runId));
  await budgetLoaded;
  return {
    deduped: requested.deduped,
    status: requested.status,
    settled: isInquiryRunSettled(requested.status),
  };
});
