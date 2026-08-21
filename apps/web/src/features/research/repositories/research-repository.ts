export const AWARENESS_CONFIDENCES = ["measured", "thin", "artifact"] as const;
export type AwarenessConfidence = (typeof AWARENESS_CONFIDENCES)[number];

export type ResearchRunStatus =
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

export interface ResearchExemplarRecord {
  country: string | null;
  title: string;
  url: string;
  domain: string | null;
  seenAt: string;
}

export interface ResearchRunRecord {
  id: string;
  question: string;
  day: string;
  executedQuery: string | null;
  window: string;
  distribution: CountryAwarenessRecord[];
  exemplars: ResearchExemplarRecord[];
  synthesis: string | null;
  status: ResearchRunStatus;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ResearchRunRequestRecord {
  runId: string;
  status: ResearchRunStatus;
  deduped: boolean;
}

export interface ResearchRepository {
  recentRuns(limit: number): Promise<ResearchRunRecord[]>;
  runById(runId: string): Promise<ResearchRunRecord>;
  requestRun(question: string): Promise<ResearchRunRequestRecord>;
}
