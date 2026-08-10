import type { RootState } from "@/store/index.ts";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { MarketCategory, MarketStatus } from "../../repositories/market-repository.ts";
import type { MarketDashboardData } from "../../use-cases/load-market-dashboard.ts";
import { loadDashboard, syncMarketSnapshot, syncNewsSnapshot } from "./dashboard.commands.ts";
import {
  type DashboardFilters,
  type TopicFilter,
  initialDashboardFilters,
} from "./dashboard.filters.ts";

export interface DashboardState {
  filters: DashboardFilters;
  data: MarketDashboardData | null;
  isLoading: boolean;
  isSyncing: boolean;
  isSyncingNews: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  filters: initialDashboardFilters,
  data: null,
  isLoading: true,
  isSyncing: false,
  isSyncingNews: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "worldAwarenessDashboard",
  initialState,
  reducers: {
    setCategory(state, action: PayloadAction<MarketCategory | "">) {
      state.filters.category = action.payload;
    },
    setStatus(state, action: PayloadAction<MarketStatus | "">) {
      state.filters.status = action.payload;
    },
    setTopic(state, action: PayloadAction<TopicFilter>) {
      state.filters.topic = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        state.data = action.payload;
        state.isLoading = false;
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? "Failed to load dashboard";
      })
      .addCase(syncMarketSnapshot.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(syncMarketSnapshot.fulfilled, (state) => {
        state.isSyncing = false;
      })
      .addCase(syncMarketSnapshot.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.error.message ?? "Failed to sync market snapshot";
      })
      .addCase(syncNewsSnapshot.pending, (state) => {
        state.isSyncingNews = true;
        state.error = null;
      })
      .addCase(syncNewsSnapshot.fulfilled, (state) => {
        state.isSyncingNews = false;
      })
      .addCase(syncNewsSnapshot.rejected, (state, action) => {
        state.isSyncingNews = false;
        state.error = action.error.message ?? "Failed to sync news snapshot";
      });
  },
});

export const { setCategory, setStatus, setTopic } = dashboardSlice.actions;
export const dashboardReducer = dashboardSlice.reducer;

export const selectDashboard = (state: RootState): DashboardState => state.worldAwarenessDashboard;
