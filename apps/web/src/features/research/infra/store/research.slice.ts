import type { RootState } from "@/store/index.ts";
import { createSlice } from "@reduxjs/toolkit";
import type {
  ResearchRunRecord,
  ResearchRunStatus,
} from "../../repositories/research-repository.ts";
import {
  askResearchQuestion,
  loadRecentResearchRuns,
  researchRunProgressed,
} from "./research.commands.ts";

export interface ResearchAskState {
  isAsking: boolean;
  watchedStatus: ResearchRunStatus | null;
  isStillRunning: boolean;
  wasDeduped: boolean;
  error: string | null;
}

export interface ResearchState {
  runs: ResearchRunRecord[];
  isLoading: boolean;
  error: string | null;
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
  ask: idleAsk,
};

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
      })
      .addCase(loadRecentResearchRuns.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Failed to load your recent research runs";
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
export const selectResearchAsk = (state: RootState): ResearchAskState => state.research.ask;
