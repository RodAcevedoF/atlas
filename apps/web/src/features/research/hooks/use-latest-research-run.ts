import { useAppDispatch, useAppSelector } from "@/store/hooks.ts";
import { useEffect } from "react";
import { loadLatestResearchRun } from "../infra/store/research.commands.ts";
import { selectResearch } from "../infra/store/research.slice.ts";
import type { ResearchRunRecord } from "../repositories/research-repository.ts";

export interface UseLatestResearchRunResult {
  run: ResearchRunRecord | null;
  isLoading: boolean;
  error: string | null;
}

export function useLatestResearchRun(): UseLatestResearchRunResult {
  const dispatch = useAppDispatch();
  const { latestRun, isLoading, error } = useAppSelector(selectResearch);

  useEffect(() => {
    void dispatch(loadLatestResearchRun());
  }, [dispatch]);

  return { run: latestRun, isLoading, error };
}
