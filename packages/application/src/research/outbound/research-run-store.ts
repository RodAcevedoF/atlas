import type { ResearchRun, ResearchRunId, ResearchRunListRow } from "@atlas/domain";

export const RESEARCH_MAX_ATTEMPTS = 2;

export interface ClaimResearchRunInput {
  now: Date;
  completedBefore: Date;
  startedBefore: Date;
}

export type CompleteResearchRunInput = Pick<
  ResearchRun,
  "id" | "status" | "executedQuery" | "distribution" | "exemplars" | "synthesis" | "error"
> & { completedAt: Date };

export interface ResearchRunPage {
  limit: number;
}

export interface ResearchRunStorePort {
  saveResearchRun(run: ResearchRun): Promise<void>;
  findResearchRunById(id: ResearchRunId): Promise<ResearchRun | null>;
  findResearchRunByQuestionDay(questionKey: string, day: string): Promise<ResearchRun | null>;
  countResearchRunsForDay(day: string): Promise<number>;
  claimNextResearchRun(input: ClaimResearchRunInput): Promise<ResearchRun | null>;
  completeResearchRun(input: CompleteResearchRunInput): Promise<void>;
  listResearchRuns(page: ResearchRunPage): Promise<ResearchRunListRow[]>;
}
