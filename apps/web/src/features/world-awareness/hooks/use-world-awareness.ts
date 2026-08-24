import {
  type InquiryRunSummaryRecord,
  isInquiryRunSettled,
  useInquiryAsk,
  useRecentInquiryRuns,
} from "@/features/inquiry";
import type { InquiryRunStatus } from "@atlas/domain";
import { useCallback, useEffect, useRef } from "react";
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
}

export function useWorldAwareness(): UseWorldAwarenessResult {
  const { runs, pinnedRunId, error } = useRecentInquiryRuns();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRunId = searchParams.get("run");
  const awareness = useAwarenessLayer(runs, requestedRunId, pinnedRunId);
  const {
    refresh,
    dismissError,
    startedRunId,
    isAsking,
    isRefresh,
    watchedStatus,
    error: askError,
  } = useInquiryAsk();

  const setRequestedRun = useCallback(
    (runId: string) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current);
          params.set("run", runId);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const syncedStartedRunId = useRef<string | null>(null);
  useEffect(() => {
    if (!startedRunId) {
      syncedStartedRunId.current = null;
      return;
    }
    if (syncedStartedRunId.current === startedRunId) return;
    syncedStartedRunId.current = startedRunId;
    setRequestedRun(startedRunId);
  }, [startedRunId, setRequestedRun]);

  const shownRun = awareness.run;
  const refreshRun = useCallback(() => {
    if (!shownRun) return;
    refresh(shownRun.question);
  }, [refresh, shownRun]);

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
  };
}
