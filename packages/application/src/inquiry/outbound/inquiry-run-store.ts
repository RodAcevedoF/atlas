import type {
  InquiryRun,
  InquiryRunId,
  InquiryRunListRow,
  InquiryRunStatus,
  UserId,
} from "@atlas/domain";

export const INQUIRY_MAX_ATTEMPTS = 2;

export interface ClaimInquiryRunInput {
  now: Date;
  completedBefore: Date;
  startedBefore: Date;
}

export type CompleteInquiryRunInput = Pick<
  InquiryRun,
  "id" | "status" | "places" | "claimCount" | "unplacedClaims" | "costUsd" | "synthesis" | "error"
> & { completedAt: Date };

export interface InquiryRunPage {
  limit: number;
  ownerId: UserId | null;
}

export interface InquiryRunSummaryCounts {
  total: number;
  today: number;
  byStatus: Partial<Record<InquiryRunStatus, number>>;
  retrievalCostUsd: number;
}

export interface InquiryRunStorePort {
  saveInquiryRun(run: InquiryRun): Promise<void>;
  findInquiryRunById(id: InquiryRunId): Promise<InquiryRun | null>;
  findInquiryRunByQuestionDay(
    ownerId: UserId,
    questionKey: string,
    day: string,
  ): Promise<InquiryRun | null>;
  findInquiryRunListRowById(id: InquiryRunId): Promise<InquiryRunListRow | null>;
  countSucceededQuestionsForOwnerDay(ownerId: UserId, day: string): Promise<number>;
  claimNextInquiryRun(input: ClaimInquiryRunInput): Promise<InquiryRun | null>;
  deleteInquiryRunById(id: InquiryRunId): Promise<boolean>;
  completeInquiryRun(input: CompleteInquiryRunInput): Promise<void>;
  listInquiryRuns(page: InquiryRunPage): Promise<InquiryRunListRow[]>;
  summarizeInquiryRuns(day: string): Promise<InquiryRunSummaryCounts>;
}
