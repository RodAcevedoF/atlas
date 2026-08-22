import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadRecentResearchRuns } from "../infra/store/research.commands.ts";
import { selectResearch } from "../infra/store/research.slice.ts";
import type { ResearchRunSummaryRecord } from "../repositories/research-repository.ts";
import { hasRunInFlight } from "../use-cases/watch-research-run.ts";

const LIST_POLL_INTERVAL_MS = 6_000;

export interface UseRecentResearchRunsResult {
  runs: ResearchRunSummaryRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useRecentResearchRuns(): UseRecentResearchRunsResult {
  const dispatch = useAppDispatch();
  const { runs, isLoading, error } = useAppSelector(selectResearch);
  const isLoaded = runs.length > 0;
  const isWatching = hasRunInFlight(runs);

  useEffect(() => {
    if (isLoaded) return;
    void dispatch(loadRecentResearchRuns());
  }, [dispatch, isLoaded]);

  useEffect(() => {
    if (!isWatching) return;
    const poll = setInterval(() => {
      void dispatch(loadRecentResearchRuns());
    }, LIST_POLL_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [dispatch, isWatching]);

  return { runs, isLoading, error };
}
