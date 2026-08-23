import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { syncNewsSnapshot } from "../infra/store/dashboard.commands.ts";
import { selectDashboard } from "../infra/store/dashboard.slice.ts";

export interface UseWorldDashboardResult {
  isSyncing: boolean;
  error: string | null;
  handleSync: () => Promise<void>;
}

export function useWorldDashboard(): UseWorldDashboardResult {
  const dispatch = useAppDispatch();
  const { isSyncing, error } = useAppSelector(selectDashboard);

  return {
    isSyncing,
    error,
    handleSync: async () => {
      await dispatch(syncNewsSnapshot());
    },
  };
}
