import type { ResearchRepository, ResearchRunRecord } from "../repositories/research-repository.ts";

export interface LoadResearchRunDeps {
  researchRepository: ResearchRepository;
}

export type LoadResearchRun = (runId: string) => Promise<ResearchRunRecord>;

export function makeLoadResearchRun({ researchRepository }: LoadResearchRunDeps): LoadResearchRun {
  return (runId) => researchRepository.runById(runId);
}
