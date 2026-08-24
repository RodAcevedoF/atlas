import type { InquiryRunStatus } from "@atlas/domain";

export interface InquiryClaimRecord {
  text: string;
  confidence: number;
  sourceUrl: string;
  sourceTitle: string | null;
  publishedDate: string | null;
}

export interface InquiryPlaceRecord {
  place: string;
  country: string | null;
  latitude: number;
  longitude: number;
  claimCount: number;
  claims: InquiryClaimRecord[];
}

export interface InquiryRunRecord {
  id: string;
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
}

export interface InquiryRunRequestRecord {
  runId: string;
  status: InquiryRunStatus;
  deduped: boolean;
}

export interface InquiryRepository {
  recentRuns(limit: number): Promise<InquiryRunListRecord>;
  runById(runId: string): Promise<InquiryRunRecord>;
  requestRun(request: InquiryRunRequestInput): Promise<InquiryRunRequestRecord>;
  deleteRun(runId: string): Promise<void>;
}
