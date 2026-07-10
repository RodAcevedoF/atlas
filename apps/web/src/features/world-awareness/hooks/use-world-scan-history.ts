import { useMarketRepository } from "@/providers.tsx";
import { useCallback, useState } from "react";
import type {
  WorldScanHistoryFilter,
  WorldScanHistoryItem,
} from "../repositories/market-repository.ts";
import { listWorldScanReports } from "../use-cases/list-world-scan-reports.ts";

export interface UseWorldScanHistoryResult {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  load: (filter?: WorldScanHistoryFilter) => Promise<void>;
}

export function useWorldScanHistory(): UseWorldScanHistoryResult {
  const repository = useMarketRepository();
  const [reports, setReports] = useState<WorldScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (filter: WorldScanHistoryFilter = {}): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listWorldScanReports(repository, filter);
        setReports(result);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    },
    [repository],
  );

  return { reports, isLoading, error, load };
}
