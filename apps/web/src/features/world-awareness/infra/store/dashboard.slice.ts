import type { RootState } from "@/store/index.ts";
import { type PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { WorldDashboardData } from "../../use-cases/load-world-dashboard.ts";
import { loadDashboard, syncNewsSnapshot } from "./dashboard.commands.ts";
import { INITIAL_TOPIC, type TopicFilter } from "./dashboard.filters.ts";

export interface DashboardState {
  topic: TopicFilter;
  data: WorldDashboardData | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  topic: INITIAL_TOPIC,
  data: null,
  isLoading: true,
  isSyncing: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: "worldAwarenessDashboard",
  initialState,
  reducers: {
    setTopic(state, action: PayloadAction<TopicFilter>) {
      state.topic = action.payload;
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
      .addCase(syncNewsSnapshot.pending, (state) => {
        state.isSyncing = true;
        state.error = null;
      })
      .addCase(syncNewsSnapshot.fulfilled, (state) => {
        state.isSyncing = false;
      })
      .addCase(syncNewsSnapshot.rejected, (state, action) => {
        state.isSyncing = false;
        state.error = action.error.message ?? "Failed to sync news snapshot";
      });
  },
});

export const { setTopic } = dashboardSlice.actions;
export const dashboardReducer = dashboardSlice.reducer;

export const selectDashboard = (state: RootState): DashboardState => state.worldAwarenessDashboard;
