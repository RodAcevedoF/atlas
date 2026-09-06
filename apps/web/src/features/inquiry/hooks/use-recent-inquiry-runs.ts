import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadRecentInquiryRuns } from "../infra/store/inquiry.commands.ts";
import { selectInquiry } from "../infra/store/inquiry.slice.ts";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";

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

  useEffect(() => {
    if (isLoaded) return;
    void dispatch(loadRecentInquiryRuns());
  }, [dispatch, isLoaded]);

  return { runs, pinnedRunId, isLoading, error };
}
