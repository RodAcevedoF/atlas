import type {
  InquiryPlace,
  InquiryPlaceRead,
  InquiryRun,
  InquiryRunId,
  InquiryRunListRow,
  InquiryRunStatus,
  InquirySourceDocument,
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
  | "id"
  | "status"
  | "places"
  | "documents"
  | "claimCount"
  | "unplacedClaims"
  | "costUsd"
  | "synthesis"
  | "failure"
  | "error"
  | "completion"
  | "degradations"
> & { completedAt: Date };

interface InquiryRunCheckpointOrigin {
  id: InquiryRunId;
  attempt: number;
  sequence: number;
  occurredAt: Date;
}

export type InquiryRunCheckpoint = InquiryRunCheckpointOrigin &
  (
    | {
        stage: "retrieval_complete";
        documents: InquirySourceDocument[];
        claimCount: number;
        costUsd: number;
      }
    | {
        stage: "map_ready";
        places: InquiryPlace[];
        claimCount: number;
        unplacedClaims: number;
      }
    | { stage: "synthesis_ready"; synthesis: string }
    | {
        stage: "place_read_ready";
        latitude: number;
        longitude: number;
        read: InquiryPlaceRead;
      }
  );

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
  claimInquiryRunById(id: InquiryRunId, input: ClaimInquiryRunInput): Promise<InquiryRun | null>;
  deleteInquiryRunById(id: InquiryRunId): Promise<boolean>;
  completeInquiryRun(input: CompleteInquiryRunInput): Promise<void>;
  applyInquiryRunCheckpoint(checkpoint: InquiryRunCheckpoint): Promise<number | null>;
  listInquiryRuns(page: InquiryRunPage): Promise<InquiryRunListRow[]>;
  summarizeInquiryRuns(day: string): Promise<InquiryRunSummaryCounts>;
}
