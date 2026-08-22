import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadResearchRun } from "../infra/store/research.commands.ts";
import { selectResearchDetail } from "../infra/store/research.slice.ts";
import type { ResearchRunRecord } from "../repositories/research-repository.ts";

export interface UseResearchRunResult {
  run: ResearchRunRecord | null;
  isLoading: boolean;
  error: string | null;
}

export function useResearchRun(runId: string | null): UseResearchRunResult {
  const dispatch = useAppDispatch();
  const { byId, loadingId, failure } = useAppSelector(selectResearchDetail);
  const run = runId ? (byId[runId] ?? null) : null;
  const error = failure && failure.runId === runId ? failure.message : null;

  useEffect(() => {
    if (!runId || run) return;
    void dispatch(loadResearchRun(runId));
  }, [dispatch, runId, run]);

  return { run, isLoading: runId !== null && loadingId === runId, error };
}
