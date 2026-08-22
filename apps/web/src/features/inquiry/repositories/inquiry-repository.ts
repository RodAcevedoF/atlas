export const AWARENESS_CONFIDENCES = ["measured", "thin", "artifact"] as const;
export type AwarenessConfidence = (typeof AWARENESS_CONFIDENCES)[number];

export type InquiryRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "no_coverage"
  | "below_floor"
  | "failed_retryable"
  | "failed_permanent";

export interface CountryAwarenessRecord {
  country: string;
  awareness: number;
  peak: number;
  coveredBuckets: number;
  totalBuckets: number;
  confidence: AwarenessConfidence;
}

export interface InquiryExemplarRecord {
  country: string | null;
  title: string;
  url: string;
  domain: string | null;
  seenAt: string;
}

export interface InquiryRunRecord {
  id: string;
  question: string;
  day: string;
  executedQuery: string | null;
  window: string;
  distribution: CountryAwarenessRecord[];
  exemplars: InquiryExemplarRecord[];
  synthesis: string | null;
  status: InquiryRunStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface InquiryRunSummaryRecord {
  id: string;
  question: string;
  day: string;
  window: string;
  measuredCountries: string[];
  status: InquiryRunStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface InquiryRunRequestRecord {
  runId: string;
  status: InquiryRunStatus;
  deduped: boolean;
}

export interface InquiryRepository {
  recentRuns(limit: number): Promise<InquiryRunSummaryRecord[]>;
  runById(runId: string): Promise<InquiryRunRecord>;
  requestRun(question: string): Promise<InquiryRunRequestRecord>;
}
