import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import {
  loadDashboard,
  syncMarketSnapshot,
  syncNewsSnapshot,
} from "../infra/store/dashboard.commands.ts";
import {
  type SourceFilter,
  type TopicFilter,
  toLoadMarketDashboardInput,
} from "../infra/store/dashboard.filters.ts";
import {
  selectDashboard,
  setCategory,
  setSource,
  setStatus,
  setTopic,
} from "../infra/store/dashboard.slice.ts";
import type { MarketCategory, MarketStatus } from "../repositories/market-repository.ts";
import type { MarketDashboardData } from "../use-cases/load-market-dashboard.ts";

export type { SourceFilter, TopicFilter };

export interface UseMarketDashboardResult {
  category: MarketCategory | "";
  setCategory: (value: MarketCategory | "") => void;
  status: MarketStatus | "";
  setStatus: (value: MarketStatus | "") => void;
  source: SourceFilter;
  setSource: (value: SourceFilter) => void;
  topic: TopicFilter;
  setTopic: (value: TopicFilter) => void;
  dashboard: MarketDashboardData | null;
  isLoading: boolean;
  isSyncing: boolean;
  isSyncingNews: boolean;
  error: string | null;
  syncMessage: string | null;
  handleSync: () => Promise<void>;
  handleSyncNews: () => Promise<void>;
}

export function useMarketDashboard(): UseMarketDashboardResult {
  const dispatch = useAppDispatch();
  const { filters, data, isLoading, isSyncing, isSyncingNews, error, syncMessage } =
    useAppSelector(selectDashboard);

  useEffect(() => {
    void dispatch(loadDashboard(toLoadMarketDashboardInput(filters)));
  }, [dispatch, filters]);

  return {
    category: filters.category,
    setCategory: (value) => {
      dispatch(setCategory(value));
    },
    status: filters.status,
    setStatus: (value) => {
      dispatch(setStatus(value));
    },
    source: filters.source,
    setSource: (value) => {
      dispatch(setSource(value));
    },
    topic: filters.topic,
    setTopic: (value) => {
      dispatch(setTopic(value));
    },
    dashboard: data,
    isLoading,
    isSyncing,
    isSyncingNews,
    error,
    syncMessage,
    handleSync: async () => {
      await dispatch(syncMarketSnapshot());
    },
    handleSyncNews: async () => {
      await dispatch(syncNewsSnapshot());
    },
  };
}
