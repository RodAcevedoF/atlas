import type {
  ResearchRepository,
  ResearchRunSummaryRecord,
} from "../repositories/research-repository.ts";

const RECENT_RUN_LIMIT = 25;

export interface LoadRecentResearchRunsDeps {
  researchRepository: ResearchRepository;
}

export type LoadRecentResearchRuns = () => Promise<ResearchRunSummaryRecord[]>;

export function makeLoadRecentResearchRuns({
  researchRepository,
}: LoadRecentResearchRunsDeps): LoadRecentResearchRuns {
  return () => researchRepository.recentRuns(RECENT_RUN_LIMIT);
}
