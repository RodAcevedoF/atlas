import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useCallback } from "react";
import { loadScanHistory } from "../infra/store/intelligence.commands.ts";
import { selectIntelligence } from "../infra/store/intelligence.slice.ts";
import type {
  WorldScanHistoryFilter,
  WorldScanHistoryItem,
} from "../repositories/market-repository.ts";

export interface UseWorldScanHistoryResult {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  load: (filter?: WorldScanHistoryFilter) => Promise<void>;
}

export function useWorldScanHistory(): UseWorldScanHistoryResult {
  const dispatch = useAppDispatch();
  const { history, historyLoading, historyError } = useAppSelector(selectIntelligence);

  const load = useCallback(
    async (filter: WorldScanHistoryFilter = {}): Promise<void> => {
      await dispatch(loadScanHistory(filter));
    },
    [dispatch],
  );

  return { reports: history, isLoading: historyLoading, error: historyError, load };
}
