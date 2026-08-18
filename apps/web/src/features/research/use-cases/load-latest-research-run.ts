import type { ResearchRepository, ResearchRunRecord } from "../repositories/research-repository.ts";

export interface LoadLatestResearchRunDeps {
  researchRepository: ResearchRepository;
}

export type LoadLatestResearchRun = () => Promise<ResearchRunRecord | null>;

export function makeLoadLatestResearchRun({
  researchRepository,
}: LoadLatestResearchRunDeps): LoadLatestResearchRun {
  return () => researchRepository.latestRun();
}
