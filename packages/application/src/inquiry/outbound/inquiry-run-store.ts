import type { ResearchRun, ResearchRunId, ResearchRunListRow } from "@atlas/domain";

export const INQUIRY_MAX_ATTEMPTS = 2;

export interface ClaimInquiryRunInput {
  now: Date;
  completedBefore: Date;
  startedBefore: Date;
}

export type CompleteInquiryRunInput = Pick<
  ResearchRun,
  "id" | "status" | "executedQuery" | "distribution" | "exemplars" | "synthesis" | "error"
> & { completedAt: Date };

export interface InquiryRunPage {
  limit: number;
}

export interface InquiryRunStorePort {
  saveInquiryRun(run: ResearchRun): Promise<void>;
  findInquiryRunById(id: ResearchRunId): Promise<ResearchRun | null>;
  findInquiryRunByQuestionDay(questionKey: string, day: string): Promise<ResearchRun | null>;
  countInquiryRunsForDay(day: string): Promise<number>;
  claimNextInquiryRun(input: ClaimInquiryRunInput): Promise<ResearchRun | null>;
  completeInquiryRun(input: CompleteInquiryRunInput): Promise<void>;
  listInquiryRuns(page: InquiryRunPage): Promise<ResearchRunListRow[]>;
}
