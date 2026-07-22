import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import { useSavedReportsRepository } from "@/providers.tsx";
import { useToast } from "@atlas/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface UseSavedReportsResult {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  isSaved: (reportId: string) => boolean;
  toggle: (reportId: string) => Promise<void>;
  pendingId: string | null;
}

export function useSavedReports(): UseSavedReportsResult {
  const repository = useSavedReportsRepository();
  const { toast } = useToast();

  const [reports, setReports] = useState<WorldScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  // The saved set is exactly the ids the server returns — no need to track it separately.
  const savedIds = useMemo(() => new Set(reports.map((item) => item.id)), [reports]);

  const load = useCallback(
    async (token?: { cancelled: boolean }): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await repository.list();
        if (!token?.cancelled) setReports(result);
      } catch (loadError) {
        if (!token?.cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load saved reports");
        }
      } finally {
        if (!token?.cancelled) setIsLoading(false);
      }
    },
    [repository],
  );

  useEffect(() => {
    const token = { cancelled: false };
    void load(token);
    return () => {
      token.cancelled = true;
    };
  }, [load]);

  const isSaved = useCallback((reportId: string) => savedIds.has(reportId), [savedIds]);

  const toggle = useCallback(
    async (reportId: string) => {
      setPendingId(reportId);
      try {
        if (savedIds.has(reportId)) await repository.unsave(reportId);
        else await repository.save(reportId);
        await load();
      } catch (toggleError) {
        toast(
          toggleError instanceof Error ? toggleError.message : "Failed to update saved reports",
          "error",
        );
      } finally {
        setPendingId(null);
      }
    },
    [savedIds, repository, load, toast],
  );

  return { reports, isLoading, error, isSaved, toggle, pendingId };
}
