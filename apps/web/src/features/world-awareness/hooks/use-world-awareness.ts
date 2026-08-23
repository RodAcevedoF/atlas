import {
  type InquiryRunSummaryRecord,
  isInquiryRunSettled,
  useInquiryAsk,
  useRecentInquiryRuns,
} from "@/features/inquiry";
import type { InquiryRunStatus } from "@atlas/domain";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { type AwarenessLayer, useAwarenessLayer } from "./use-awareness-layer.ts";

export interface WorldRefresh {
  canRefresh: boolean;
  isRefreshing: boolean;
  status: InquiryRunStatus | null;
  error: string | null;
  run: () => void;
  dismissError: () => void;
}

export interface UseWorldAwarenessResult {
  awareness: AwarenessLayer;
  runs: InquiryRunSummaryRecord[];
  error: string | null;
  selectRun: (runId: string) => void;
  refresh: WorldRefresh;
  clearRequestedRun: () => void;
}

export function useWorldAwareness(): UseWorldAwarenessResult {
  const { runs, error } = useRecentInquiryRuns();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get("run");
  const awareness = useAwarenessLayer(runs, requestedRunId);
  const {
    refresh,
    dismissError,
    isAsking,
    isRefresh,
    watchedStatus,
    error: askError,
  } = useInquiryAsk();

  const setRequestedRun = useCallback(
    (runId: string | null) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          if (runId) params.set("run", runId);
          else params.delete("run");
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const clearRequestedRun = useCallback(() => {
    if (!requestedRunId) return;
    setRequestedRun(null);
  }, [requestedRunId, setRequestedRun]);

  const shownRun = awareness.run;
  const refreshRun = useCallback(() => {
    if (!shownRun) return;
    clearRequestedRun();
    refresh(shownRun.question);
  }, [clearRequestedRun, refresh, shownRun]);

  const hasRunInFlight = awareness.latest !== null && !isInquiryRunSettled(awareness.latest.status);

  return {
    awareness,
    runs,
    error: error ?? awareness.error,
    selectRun: setRequestedRun,
    refresh: {
      canRefresh: shownRun !== null && !isAsking && !hasRunInFlight,
      isRefreshing: isRefresh && isAsking,
      status: isRefresh ? watchedStatus : null,
      error: isRefresh ? askError : null,
      run: refreshRun,
      dismissError,
    },
    clearRequestedRun,
  };
}
