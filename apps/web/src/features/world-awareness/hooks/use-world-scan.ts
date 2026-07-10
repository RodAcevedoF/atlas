import { useMarketRepository } from "@/providers.tsx";
import { useCallback, useState } from "react";
import type { WorldScanInput, WorldScanReportRecord } from "../repositories/market-repository.ts";
import { runWorldScan } from "../use-cases/run-world-scan.ts";

export interface UseWorldScanResult {
  report: WorldScanReportRecord | null;
  isScanning: boolean;
  error: string | null;
  runScan: (scope?: WorldScanInput) => Promise<void>;
}

export function useWorldScan(): UseWorldScanResult {
  const repository = useMarketRepository();
  const [report, setReport] = useState<WorldScanReportRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runScan = useCallback(
    async (scope: WorldScanInput = {}): Promise<void> => {
      setIsScanning(true);
      setError(null);
      try {
        const result = await runWorldScan(repository, scope);
        setReport(result);
      } catch (scanError) {
        setError(scanError instanceof Error ? scanError.message : "Failed to run scan");
      } finally {
        setIsScanning(false);
      }
    },
    [repository],
  );

  return { report, isScanning, error, runScan };
}
