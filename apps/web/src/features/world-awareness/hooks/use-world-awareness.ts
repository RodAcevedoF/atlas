import { isInquiryRunSettled, useInquiryAsk, useRecentInquiryRuns } from "@/features/inquiry";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { type AwarenessLayer, useAwarenessLayer } from "./use-awareness-layer.ts";

export interface UseWorldAwarenessResult {
  awareness: AwarenessLayer;
  error: string | null;
  canRefresh: boolean;
  isRefreshing: boolean;
  refreshRun: () => void;
  clearRequestedRun: () => void;
}

export function useWorldAwareness(): UseWorldAwarenessResult {
  const { runs, error } = useRecentInquiryRuns();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get("run");
  const awareness = useAwarenessLayer(runs, requestedRunId);
  const { refresh, isAsking, isRefreshing } = useInquiryAsk();

  const clearRequestedRun = useCallback(() => {
    if (!requestedRunId) return;
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.delete("run");
        return params;
      },
      { replace: true },
    );
  }, [requestedRunId, setSearchParams]);

  const shownRun = awareness.run;
  const refreshRun = useCallback(() => {
    if (!shownRun) return;
    clearRequestedRun();
    refresh(shownRun.question);
  }, [clearRequestedRun, refresh, shownRun]);

  const hasRunInFlight = awareness.latest !== null && !isInquiryRunSettled(awareness.latest.status);

  return {
    awareness,
    error: error ?? awareness.error,
    canRefresh: shownRun !== null && !isAsking && !hasRunInFlight,
    isRefreshing,
    refreshRun,
    clearRequestedRun,
  };
}
