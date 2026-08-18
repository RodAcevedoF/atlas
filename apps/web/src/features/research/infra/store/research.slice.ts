import type { RootState } from "@/store/index.ts";
import { createSlice } from "@reduxjs/toolkit";
import type { ResearchRunRecord } from "../../repositories/research-repository.ts";
import { loadRecentResearchRuns } from "./research.commands.ts";

export interface ResearchState {
  runs: ResearchRunRecord[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ResearchState = {
  runs: [],
  isLoading: true,
  error: null,
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
      });
  },
});

export const researchReducer = researchSlice.reducer;

export const selectResearch = (state: RootState): ResearchState => state.research;
