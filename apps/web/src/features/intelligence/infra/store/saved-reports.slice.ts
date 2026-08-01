import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import type { RootState } from "@/store/index.ts";
import { createSlice } from "@reduxjs/toolkit";
import { loadSavedReports, toggleSavedReport } from "./saved-reports.commands.ts";

export interface SavedReportsState {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  pendingId: string | null;
}

const initialState: SavedReportsState = {
  reports: [],
  isLoading: true,
  error: null,
  pendingId: null,
};

const savedReportsSlice = createSlice({
  name: "intelligenceSavedReports",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadSavedReports.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadSavedReports.fulfilled, (state, action) => {
        state.reports = action.payload;
        state.isLoading = false;
      })
      .addCase(loadSavedReports.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Failed to load saved reports";
      })
      .addCase(toggleSavedReport.pending, (state, action) => {
        state.pendingId = action.meta.arg;
      })
      .addCase(toggleSavedReport.fulfilled, (state) => {
        state.pendingId = null;
      })
      .addCase(toggleSavedReport.rejected, (state) => {
        state.pendingId = null;
      });
  },
});

export const savedReportsReducer = savedReportsSlice.reducer;

export const selectSavedReports = (state: RootState): SavedReportsState =>
  state.intelligenceSavedReports;
