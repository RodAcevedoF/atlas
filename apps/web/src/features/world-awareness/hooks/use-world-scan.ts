import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useCallback } from "react";
import { runWorldScan } from "../infra/store/intelligence.commands.ts";
import { selectIntelligence } from "../infra/store/intelligence.slice.ts";
import type { WorldScanInput, WorldScanReportRecord } from "../repositories/market-repository.ts";

export interface UseWorldScanResult {
  report: WorldScanReportRecord | null;
  isScanning: boolean;
  error: string | null;
  runScan: (scope?: WorldScanInput) => Promise<void>;
}

export function useWorldScan(): UseWorldScanResult {
  const dispatch = useAppDispatch();
  const { report, isScanning, scanError } = useAppSelector(selectIntelligence);

  const runScan = useCallback(
    async (scope: WorldScanInput = {}): Promise<void> => {
      await dispatch(runWorldScan(scope));
    },
    [dispatch],
  );

  return { report, isScanning, error: scanError, runScan };
}
