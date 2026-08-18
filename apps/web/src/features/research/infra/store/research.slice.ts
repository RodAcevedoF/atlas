import type { RootState } from "@/store/index.ts";
import { createSlice } from "@reduxjs/toolkit";
import type { ResearchRunRecord } from "../../repositories/research-repository.ts";
import { loadLatestResearchRun } from "./research.commands.ts";

export interface ResearchState {
  latestRun: ResearchRunRecord | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ResearchState = {
  latestRun: null,
  isLoading: true,
  error: null,
};

const researchSlice = createSlice({
  name: "research",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadLatestResearchRun.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadLatestResearchRun.fulfilled, (state, action) => {
        state.latestRun = action.payload;
        state.isLoading = false;
      })
      .addCase(loadLatestResearchRun.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Failed to load the latest research run";
      });
  },
});

export const researchReducer = researchSlice.reducer;

export const selectResearch = (state: RootState): ResearchState => state.research;
