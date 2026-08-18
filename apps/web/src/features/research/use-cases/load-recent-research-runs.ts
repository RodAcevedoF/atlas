import type { ResearchRepository, ResearchRunRecord } from "../repositories/research-repository.ts";

const RECENT_RUN_LIMIT = 5;

export interface LoadRecentResearchRunsDeps {
  researchRepository: ResearchRepository;
}

export type LoadRecentResearchRuns = () => Promise<ResearchRunRecord[]>;

export function makeLoadRecentResearchRuns({
  researchRepository,
}: LoadRecentResearchRunsDeps): LoadRecentResearchRuns {
  return () => researchRepository.recentRuns(RECENT_RUN_LIMIT);
}
