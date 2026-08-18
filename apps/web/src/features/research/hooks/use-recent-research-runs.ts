import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadRecentResearchRuns } from "../infra/store/research.commands.ts";
import { selectResearch } from "../infra/store/research.slice.ts";
import type { ResearchRunRecord } from "../repositories/research-repository.ts";

export interface UseRecentResearchRunsResult {
  runs: ResearchRunRecord[];
  isLoading: boolean;
  error: string | null;
}

export function useRecentResearchRuns(): UseRecentResearchRunsResult {
  const dispatch = useAppDispatch();
  const { runs, isLoading, error } = useAppSelector(selectResearch);

  useEffect(() => {
    void dispatch(loadRecentResearchRuns());
  }, [dispatch]);

  return { runs, isLoading, error };
}
