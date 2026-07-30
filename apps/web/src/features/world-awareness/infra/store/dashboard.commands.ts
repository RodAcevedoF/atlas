import type { AppThunkExtra, RootState } from "@/store/index.ts";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  IngestMarketsResult,
  IngestNewsResult,
} from "../../repositories/market-repository.ts";
import {
  type LoadMarketDashboardInput,
  type MarketDashboardData,
  makeLoadMarketDashboard,
} from "../../use-cases/load-market-dashboard.ts";
import { makeSyncMarketSnapshot } from "../../use-cases/sync-market-snapshot.ts";
import { makeSyncNewsSnapshot } from "../../use-cases/sync-news-snapshot.ts";
import { toLoadMarketDashboardInput } from "./dashboard.filters.ts";

interface CommandConfig {
  state: RootState;
  extra: AppThunkExtra;
}

export const loadDashboard = createAsyncThunk<
  MarketDashboardData,
  LoadMarketDashboardInput,
  CommandConfig
>("worldAwarenessDashboard/load", (input, { extra }) => makeLoadMarketDashboard(extra)(input));

export const syncMarketSnapshot = createAsyncThunk<IngestMarketsResult, void, CommandConfig>(
  "worldAwarenessDashboard/syncMarket",
  async (_input, { extra, getState, dispatch }) => {
    const { filters } = getState().worldAwarenessDashboard;
    const result = await makeSyncMarketSnapshot(extra)({
      categories: filters.category ? [filters.category] : undefined,
      maxMarkets: 100,
    });
    void dispatch(loadDashboard(toLoadMarketDashboardInput(filters)));
    return result;
  },
);

export const syncNewsSnapshot = createAsyncThunk<IngestNewsResult, void, CommandConfig>(
  "worldAwarenessDashboard/syncNews",
  async (_input, { extra, getState, dispatch }) => {
    const result = await makeSyncNewsSnapshot(extra)({ limit: 75 });
    const { filters } = getState().worldAwarenessDashboard;
    void dispatch(loadDashboard(toLoadMarketDashboardInput(filters)));
    return result;
  },
);
