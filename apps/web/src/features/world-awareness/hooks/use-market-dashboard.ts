import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import {
  loadDashboard,
  syncMarketSnapshot,
  syncNewsSnapshot,
} from "../infra/store/dashboard.commands.ts";
import { type TopicFilter, toLoadMarketDashboardInput } from "../infra/store/dashboard.filters.ts";
import {
  selectDashboard,
  setCategory,
  setStatus,
  setTopic,
} from "../infra/store/dashboard.slice.ts";
import type { MarketCategory, MarketStatus } from "../repositories/market-repository.ts";
import type { MarketDashboardData } from "../use-cases/load-market-dashboard.ts";

export type { TopicFilter };

export interface UseMarketDashboardResult {
  category: MarketCategory | "";
  setCategory: (value: MarketCategory | "") => void;
  status: MarketStatus | "";
  setStatus: (value: MarketStatus | "") => void;
  topic: TopicFilter;
  setTopic: (value: TopicFilter) => void;
  dashboard: MarketDashboardData | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  handleSync: () => Promise<void>;
}

export function useMarketDashboard(): UseMarketDashboardResult {
  const dispatch = useAppDispatch();
  const { filters, data, isLoading, isSyncing, isSyncingNews, error } =
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
    topic: filters.topic,
    setTopic: (value) => {
      dispatch(setTopic(value));
    },
    dashboard: data,
    isLoading,
    isSyncing: isSyncing || isSyncingNews,
    error,
    handleSync: async () => {
      await Promise.all([dispatch(syncMarketSnapshot()), dispatch(syncNewsSnapshot())]);
    },
  };
}
