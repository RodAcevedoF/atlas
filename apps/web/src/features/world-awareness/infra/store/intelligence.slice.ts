import type { RootState } from "@/store/index.ts";
import { createSlice } from "@reduxjs/toolkit";
import type {
  TopicSnapshotRecord,
  WorldScanHistoryItem,
  WorldScanReportRecord,
} from "../../repositories/market-repository.ts";
import { loadScanHistory, loadTopicSnapshots, runWorldScan } from "./intelligence.commands.ts";

export interface IntelligenceState {
  snapshots: TopicSnapshotRecord[];
  snapshotsLoading: boolean;
  snapshotsError: string | null;
  report: WorldScanReportRecord | null;
  isScanning: boolean;
  scanError: string | null;
  history: WorldScanHistoryItem[];
  historyLoading: boolean;
  historyError: string | null;
}

const initialState: IntelligenceState = {
  snapshots: [],
  snapshotsLoading: true,
  snapshotsError: null,
  report: null,
  isScanning: false,
  scanError: null,
  history: [],
  historyLoading: false,
  historyError: null,
};

const intelligenceSlice = createSlice({
  name: "worldAwarenessIntelligence",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadTopicSnapshots.pending, (state) => {
        state.snapshotsLoading = true;
        state.snapshotsError = null;
      })
      .addCase(loadTopicSnapshots.fulfilled, (state, action) => {
        state.snapshots = action.payload;
        state.snapshotsLoading = false;
      })
      .addCase(loadTopicSnapshots.rejected, (state, action) => {
        state.snapshotsLoading = false;
        state.snapshotsError = action.error.message ?? "Failed to load snapshots";
      })
      .addCase(runWorldScan.pending, (state) => {
        state.isScanning = true;
        state.scanError = null;
      })
      .addCase(runWorldScan.fulfilled, (state, action) => {
        state.report = action.payload;
        state.isScanning = false;
      })
      .addCase(runWorldScan.rejected, (state, action) => {
        state.isScanning = false;
        state.scanError = action.error.message ?? "Failed to run scan";
      })
      .addCase(loadScanHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(loadScanHistory.fulfilled, (state, action) => {
        state.history = action.payload;
        state.historyLoading = false;
        // History arrives newest first => the most recent scan rehydrates the view,
        // but never over a scan already in flight (both fire on mount).
        const [latest] = action.payload;
        if (latest && state.report === null && !state.isScanning) state.report = latest.report;
      })
      .addCase(loadScanHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.historyError = action.error.message ?? "Failed to load history";
      });
  },
});

export const intelligenceReducer = intelligenceSlice.reducer;

export const selectIntelligence = (state: RootState): IntelligenceState =>
  state.worldAwarenessIntelligence;
