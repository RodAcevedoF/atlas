import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadInquiryRun } from "../infra/store/inquiry.commands.ts";
import { selectInquiryDetail } from "../infra/store/inquiry.slice.ts";
import type { InquiryRunRecord } from "../repositories/inquiry-repository.ts";

export interface UseInquiryRunResult {
  run: InquiryRunRecord | null;
  isLoading: boolean;
  error: string | null;
}

export function useInquiryRun(runId: string | null): UseInquiryRunResult {
  const dispatch = useAppDispatch();
  const { byId, loadingId, failure } = useAppSelector(selectInquiryDetail);
  const run = runId ? (byId[runId] ?? null) : null;
  const error = failure && failure.runId === runId ? failure.message : null;

  useEffect(() => {
    if (!runId || run) return;
    void dispatch(loadInquiryRun(runId));
  }, [dispatch, runId, run]);

  return { run, isLoading: runId !== null && loadingId === runId, error };
}
