import type { InquiryRunStatus } from "@atlas/domain";

export interface InquiryClaimRecord {
  text: string;
  confidence: number;
  sourceUrl: string;
  sourceTitle: string | null;
  publishedDate: string | null;
  sourceImageUrl: string | null;
}

export interface InquiryPlaceRecord {
  place: string;
  country: string | null;
  latitude: number;
  longitude: number;
  claimCount: number;
  read: InquiryPlaceReadRecord | null;
  claims: InquiryClaimRecord[];
}

export interface InquiryPlaceReadRecord {
  text: string;
  sourceUrls: string[];
}

export interface InquiryRunRecord {
  id: string;
  ownerId: string | null;
  question: string;
  day: string;
  window: string;
  places: InquiryPlaceRecord[];
  claimCount: number;
  unplacedClaims: number;
  retrievalCostUsd: number;
  synthesis: string | null;
  status: InquiryRunStatus;
  error: string | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface InquiryRunSummaryRecord {
  id: string;
  ownerId: string | null;
  question: string;
  day: string;
  window: string;
  placeCount: number;
  status: InquiryRunStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface InquiryRunListRecord {
  runs: InquiryRunSummaryRecord[];
  pinnedRunId: string | null;
}

export interface InquiryRunRequestInput {
  question: string;
  refresh: boolean;
  attachmentId?: string;
}

export interface InquiryRunRequestRecord {
  runId: string;
  status: InquiryRunStatus;
  deduped: boolean;
}

export interface InquiryBudgetRecord {
  used: number;
  cap: number | null;
  remaining: number | null;
}

export interface InquiryAttachmentRecord {
  id: string;
  filename: string;
}

export interface AttachmentInterpretationRecord {
  summary: string;
  facts: string[];
  entities: string[];
  proposedQuestion: string;
  needsClarification: boolean;
  clarificationQuestion: string | null;
}

export interface InquiryRepository {
  recentRuns(limit: number): Promise<InquiryRunListRecord>;
  runById(runId: string): Promise<InquiryRunRecord>;
  requestRun(request: InquiryRunRequestInput): Promise<InquiryRunRequestRecord>;
  deleteRun(runId: string): Promise<void>;
  budget(): Promise<InquiryBudgetRecord>;
  uploadAttachment(file: File): Promise<InquiryAttachmentRecord>;
  interpretAttachment(id: string, question: string): Promise<AttachmentInterpretationRecord>;
  deleteAttachment(id: string): Promise<void>;
}
