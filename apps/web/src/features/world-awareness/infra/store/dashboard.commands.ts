import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { IngestNewsResult } from "../../repositories/world-repository.ts";
import {
  type LoadWorldDashboardInput,
  type WorldDashboardData,
  makeLoadWorldDashboard,
} from "../../use-cases/load-world-dashboard.ts";
import { makeSyncNewsSnapshot } from "../../use-cases/sync-news-snapshot.ts";
import { toLoadWorldDashboardInput } from "./dashboard.filters.ts";

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadDashboard = createAsyncThunk<
  WorldDashboardData,
  LoadWorldDashboardInput,
  CommandConfig
>("worldAwarenessDashboard/load", (input, { extra }) => makeLoadWorldDashboard(extra)(input));

export const syncNewsSnapshot = createAsyncThunk<IngestNewsResult, void, CommandConfig>(
  "worldAwarenessDashboard/syncNews",
  async (_input, { extra, getState, dispatch }) => {
    const result = await makeSyncNewsSnapshot(extra)({ limit: 75 });
    const { topic } = getState().worldAwarenessDashboard;
    void dispatch(loadDashboard(toLoadWorldDashboardInput(topic)));
    return result;
  },
);
