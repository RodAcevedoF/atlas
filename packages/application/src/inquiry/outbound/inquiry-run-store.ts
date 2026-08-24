import type { InquiryRun, InquiryRunId, InquiryRunListRow } from "@atlas/domain";

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
}

export interface InquiryRunStorePort {
  saveInquiryRun(run: InquiryRun): Promise<void>;
  findInquiryRunById(id: InquiryRunId): Promise<InquiryRun | null>;
  findInquiryRunByQuestionDay(questionKey: string, day: string): Promise<InquiryRun | null>;
  findInquiryRunListRowById(id: InquiryRunId): Promise<InquiryRunListRow | null>;
  countInquiryRunsForDay(day: string): Promise<number>;
  claimNextInquiryRun(input: ClaimInquiryRunInput): Promise<InquiryRun | null>;
  completeInquiryRun(input: CompleteInquiryRunInput): Promise<void>;
  listInquiryRuns(page: InquiryRunPage): Promise<InquiryRunListRow[]>;
}
