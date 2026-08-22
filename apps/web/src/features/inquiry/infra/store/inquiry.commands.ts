import type { AppThunkExtra, RootState } from "@/store/index.ts";
import type { InquiryRunStatus } from "@atlas/domain";
import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  InquiryRunRecord,
  InquiryRunSummaryRecord,
} from "../../repositories/inquiry-repository.ts";
import { makeLoadInquiryRun } from "../../use-cases/load-inquiry-run.ts";
import { makeLoadRecentInquiryRuns } from "../../use-cases/load-recent-inquiry-runs.ts";
import { INQUIRY_POLL_SCHEDULE, makePollInquiryRun } from "../../use-cases/poll-inquiry-run.ts";
import { makeRequestInquiryRun } from "../../use-cases/request-inquiry-run.ts";
import type { WatchInquiryRunOutcome } from "../../use-cases/watch-inquiry-run.ts";

export const inquiryRunProgressed = createAction<InquiryRunStatus>("inquiry/progressed");

export interface AskInquiryQuestionOutcome extends WatchInquiryRunOutcome {
  deduped: boolean;
  watchError: string | null;
}

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

function reasonFor(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export const loadRecentInquiryRuns = createAsyncThunk<
  InquiryRunSummaryRecord[],
  void,
  CommandConfig
>("inquiry/loadRecent", (_input, { extra }) => makeLoadRecentInquiryRuns(extra)());

export const loadInquiryRun = createAsyncThunk<InquiryRunRecord, string, CommandConfig>(
  "inquiry/loadRun",
  (runId, { extra }) => makeLoadInquiryRun(extra)(runId),
);

export const askInquiryQuestion = createAsyncThunk<
  AskInquiryQuestionOutcome,
  string,
  CommandConfig
>("inquiry/ask", async (question, { extra, dispatch }) => {
  const requested = await makeRequestInquiryRun(extra)(question);
  const watchInquiryRun = makePollInquiryRun(extra, INQUIRY_POLL_SCHEDULE);

  try {
    const outcome = await watchInquiryRun(requested, (status) =>
      dispatch(inquiryRunProgressed(status)),
    );
    return { ...outcome, deduped: requested.deduped, watchError: null };
  } catch (cause) {
    return {
      status: requested.status,
      isStillRunning: true,
      deduped: requested.deduped,
      watchError: reasonFor(cause),
    };
  } finally {
    await dispatch(loadRecentInquiryRuns());
  }
});
