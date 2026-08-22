import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadDashboard, syncNewsSnapshot } from "../infra/store/dashboard.commands.ts";
import { type TopicFilter, toLoadWorldDashboardInput } from "../infra/store/dashboard.filters.ts";
import { selectDashboard, setTopic } from "../infra/store/dashboard.slice.ts";
import type { WorldDashboardData } from "../use-cases/load-world-dashboard.ts";

export type { TopicFilter };

export interface UseWorldDashboardResult {
  topic: TopicFilter;
  setTopic: (value: TopicFilter) => void;
  dashboard: WorldDashboardData | null;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  handleSync: () => Promise<void>;
}

export function useWorldDashboard(): UseWorldDashboardResult {
  const dispatch = useAppDispatch();
  const { topic, data, isLoading, isSyncing, error } = useAppSelector(selectDashboard);

  useEffect(() => {
    void dispatch(loadDashboard(toLoadWorldDashboardInput(topic)));
  }, [dispatch, topic]);

  return {
    topic,
    setTopic: (value) => {
      dispatch(setTopic(value));
    },
    dashboard: data,
    isLoading,
    isSyncing,
    error,
    handleSync: async () => {
      await dispatch(syncNewsSnapshot());
    },
  };
}
