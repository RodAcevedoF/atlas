import type { RootState } from "@/store/index.ts";
import { createSlice } from "@reduxjs/toolkit";
import type {
  ResearchRunRecord,
  ResearchRunStatus,
  ResearchRunSummaryRecord,
} from "../../repositories/research-repository.ts";
import {
  askResearchQuestion,
  loadRecentResearchRuns,
  loadResearchRun,
  researchRunProgressed,
} from "./research.commands.ts";

export interface ResearchAskState {
  isAsking: boolean;
  watchedStatus: ResearchRunStatus | null;
  isStillRunning: boolean;
  wasDeduped: boolean;
  error: string | null;
}

export interface ResearchDetailFailure {
  runId: string;
  message: string;
}

export interface ResearchDetailState {
  byId: Record<string, ResearchRunRecord>;
  loadingId: string | null;
  failure: ResearchDetailFailure | null;
}

export interface ResearchState {
  runs: ResearchRunSummaryRecord[];
  isLoading: boolean;
  error: string | null;
  detail: ResearchDetailState;
  ask: ResearchAskState;
}

const idleAsk: ResearchAskState = {
  isAsking: false,
  watchedStatus: null,
  isStillRunning: false,
  wasDeduped: false,
  error: null,
};

const initialState: ResearchState = {
  runs: [],
  isLoading: true,
  error: null,
  detail: { byId: {}, loadingId: null, failure: null },
  ask: idleAsk,
};

function keepFreshDetails(
  byId: Record<string, ResearchRunRecord>,
  summaries: ResearchRunSummaryRecord[],
): Record<string, ResearchRunRecord> {
  const statuses = new Map(summaries.map((summary) => [summary.id, summary.status]));
  return Object.fromEntries(
    Object.entries(byId).filter(([runId, run]) => statuses.get(runId) === run.status),
  );
}

const researchSlice = createSlice({
  name: "research",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadRecentResearchRuns.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadRecentResearchRuns.fulfilled, (state, action) => {
        state.runs = action.payload;
        state.isLoading = false;
        state.detail.byId = keepFreshDetails(state.detail.byId, action.payload);
      })
      .addCase(loadRecentResearchRuns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Failed to load your recent research runs";
      })
      .addCase(loadResearchRun.pending, (state, action) => {
        state.detail.loadingId = action.meta.arg;
        state.detail.failure = null;
      })
      .addCase(loadResearchRun.fulfilled, (state, action) => {
        state.detail.byId[action.payload.id] = action.payload;
        state.detail.loadingId = null;
      })
      .addCase(loadResearchRun.rejected, (state, action) => {
        state.detail.loadingId = null;
        state.detail.failure = {
          runId: action.meta.arg,
          message: action.error.message ?? "Failed to load that research run",
        };
      })
      .addCase(askResearchQuestion.pending, (state) => {
        state.ask = { ...idleAsk, isAsking: true };
      })
      .addCase(researchRunProgressed, (state, action) => {
        state.ask.watchedStatus = action.payload;
      })
      .addCase(askResearchQuestion.fulfilled, (state, action) => {
        state.ask = {
          ...idleAsk,
          isStillRunning: action.payload.isStillRunning,
          wasDeduped: action.payload.deduped,
          error: action.payload.watchError,
        };
      })
      .addCase(askResearchQuestion.rejected, (state, action) => {
        state.ask = {
          ...idleAsk,
          error: action.error.message ?? "Failed to start your research run",
        };
      });
  },
});

export const researchReducer = researchSlice.reducer;

export const selectResearch = (state: RootState): ResearchState => state.research;
export const selectResearchDetail = (state: RootState): ResearchDetailState =>
  state.research.detail;
export const selectResearchAsk = (state: RootState): ResearchAskState => state.research.ask;
