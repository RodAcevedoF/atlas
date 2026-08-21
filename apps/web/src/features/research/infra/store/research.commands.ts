import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAction, createAsyncThunk } from "@reduxjs/toolkit";
import type {
  ResearchRunRecord,
  ResearchRunStatus,
} from "../../repositories/research-repository.ts";
import { makeLoadRecentResearchRuns } from "../../use-cases/load-recent-research-runs.ts";
import { RESEARCH_POLL_SCHEDULE, makePollResearchRun } from "../../use-cases/poll-research-run.ts";
import { makeRequestResearchRun } from "../../use-cases/request-research-run.ts";
import type { WatchResearchRunOutcome } from "../../use-cases/watch-research-run.ts";

export const researchRunProgressed = createAction<ResearchRunStatus>("research/progressed");

export interface AskResearchQuestionOutcome extends WatchResearchRunOutcome {
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

export const loadRecentResearchRuns = createAsyncThunk<ResearchRunRecord[], void, CommandConfig>(
  "research/loadRecent",
  (_input, { extra }) => makeLoadRecentResearchRuns(extra)(),
);

export const askResearchQuestion = createAsyncThunk<
  AskResearchQuestionOutcome,
  string,
  CommandConfig
>("research/ask", async (question, { extra, dispatch }) => {
  const requested = await makeRequestResearchRun(extra)(question);
  const watchResearchRun = makePollResearchRun(extra, RESEARCH_POLL_SCHEDULE);

  try {
    const outcome = await watchResearchRun(requested, (status) =>
      dispatch(researchRunProgressed(status)),
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
    await dispatch(loadRecentResearchRuns());
  }
});
