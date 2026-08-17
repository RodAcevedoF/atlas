export type ResearchRunId = string & { readonly _brand: "ResearchRunId" };

export function makeResearchRunId(v: string): ResearchRunId {
  return v as ResearchRunId;
}

export const RESEARCH_RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "no_coverage",
  "below_floor",
  "failed_retryable",
  "failed_permanent",
] as const;
export type ResearchRunStatus = (typeof RESEARCH_RUN_STATUSES)[number];

export const AWARENESS_CONFIDENCES = ["measured", "thin", "artifact"] as const;
export type AwarenessConfidence = (typeof AWARENESS_CONFIDENCES)[number];

export interface CountryAwareness {
  country: string;
  awareness: number;
  peak: number;
  /** buckets carrying any coverage */
  coveredBuckets: number;
  totalBuckets: number;
  confidence: AwarenessConfidence;
}

export interface ResearchExemplar {
  country: string | null;
  title: string;
  url: string;
  domain: string | null;
  seenAt: Date;
}

export interface ResearchRun {
  id: ResearchRunId;
  question: string;
  questionKey: string;
  day: string;
  executedQuery: string | null;
  window: string;
  distribution: CountryAwareness[];
  exemplars: ResearchExemplar[];
  synthesis: string | null;
  status: ResearchRunStatus;
  error: string | null;
  attempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface PublicResearchRun {
  id: ResearchRunId;
  question: string;
  day: string;
  executedQuery: string | null;
  window: string;
  distribution: CountryAwareness[];
  exemplars: ResearchExemplar[];
  synthesis: string | null;
  status: ResearchRunStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export function toPublicResearchRun(run: ResearchRun): PublicResearchRun {
  return {
    id: run.id,
    question: run.question,
    day: run.day,
    executedQuery: run.executedQuery,
    window: run.window,
    distribution: run.distribution,
    exemplars: run.exemplars,
    synthesis: run.synthesis,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}
