import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadRecentInquiryRuns } from "../infra/store/inquiry.commands.ts";
import { selectInquiry } from "../infra/store/inquiry.slice.ts";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";
import { hasRunInFlight } from "../use-cases/watch-inquiry-run.ts";

const LIST_POLL_INTERVAL_MS = 6_000;

export interface UseRecentInquiryRunsResult {
  runs: InquiryRunSummaryRecord[];
  pinnedRunId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useRecentInquiryRuns(): UseRecentInquiryRunsResult {
  const dispatch = useAppDispatch();
  const { runs, pinnedRunId, isLoading, error } = useAppSelector(selectInquiry);
  const isLoaded = runs.length > 0;
  const isWatching = hasRunInFlight(runs);

  useEffect(() => {
    if (isLoaded) return;
    void dispatch(loadRecentInquiryRuns());
  }, [dispatch, isLoaded]);

  useEffect(() => {
    if (!isWatching) return;
    const poll = setInterval(() => {
      void dispatch(loadRecentInquiryRuns());
    }, LIST_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [dispatch, isWatching]);

  return { runs, pinnedRunId, isLoading, error };
}
