import type {
  ResearchRepository,
  ResearchRunRequestRecord,
} from "../repositories/research-repository.ts";

export const RESEARCH_QUESTION_MAX_CHARS = 500;

export interface RequestResearchRunDeps {
  researchRepository: ResearchRepository;
}

export type RequestResearchRun = (question: string) => Promise<ResearchRunRequestRecord>;

export function makeRequestResearchRun({
  researchRepository,
}: RequestResearchRunDeps): RequestResearchRun {
  return (question) => researchRepository.requestRun(question);
}
