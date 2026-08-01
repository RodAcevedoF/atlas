import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useToast } from "@atlas/ui";
import { useCallback, useEffect, useMemo } from "react";
import { loadSavedReports, toggleSavedReport } from "../infra/store/saved-reports.commands.ts";
import { selectSavedReports } from "../infra/store/saved-reports.slice.ts";

export interface UseSavedReportsResult {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  isSaved: (reportId: string) => boolean;
  toggle: (reportId: string) => Promise<void>;
  pendingId: string | null;
}

export function useSavedReports(): UseSavedReportsResult {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const { reports, isLoading, error, pendingId } = useAppSelector(selectSavedReports);

  useEffect(() => {
    void dispatch(loadSavedReports());
  }, [dispatch]);

  // The saved set is exactly the ids the server returns — no need to track it separately.
  const savedIds = useMemo(() => new Set(reports.map((item) => item.id)), [reports]);
  const isSaved = useCallback((reportId: string) => savedIds.has(reportId), [savedIds]);

  const toggle = useCallback(
    async (reportId: string) => {
      const resultAction = await dispatch(toggleSavedReport(reportId));
      if (toggleSavedReport.rejected.match(resultAction)) {
        toast(resultAction.error.message ?? "Failed to update saved reports", "error");
      }
    },
    [dispatch, toast],
  );

  return { reports, isLoading, error, isSaved, toggle, pendingId };
}
