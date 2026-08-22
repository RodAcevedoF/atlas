export type InquiryRunId = string & { readonly _brand: "InquiryRunId" };

export function makeInquiryRunId(v: string): InquiryRunId {
  return v as InquiryRunId;
}

export const INQUIRY_RUN_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "no_coverage",
  "below_floor",
  "failed_retryable",
  "failed_permanent",
] as const;
export type InquiryRunStatus = (typeof INQUIRY_RUN_STATUSES)[number];

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

export interface InquiryExemplar {
  country: string | null;
  title: string;
  url: string;
  domain: string | null;
  seenAt: Date;
}

export interface InquiryRun {
  id: InquiryRunId;
  question: string;
  questionKey: string;
  day: string;
  executedQuery: string | null;
  window: string;
  distribution: CountryAwareness[];
  exemplars: InquiryExemplar[];
  synthesis: string | null;
  status: InquiryRunStatus;
  error: string | null;
  attempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface PublicInquiryRun {
  id: InquiryRunId;
  question: string;
  day: string;
  executedQuery: string | null;
  window: string;
  distribution: CountryAwareness[];
  exemplars: InquiryExemplar[];
  synthesis: string | null;
  status: InquiryRunStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface InquiryRunSummary {
  id: InquiryRunId;
  question: string;
  day: string;
  window: string;
  measuredCountries: string[];
  status: InquiryRunStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type InquiryRunListRow = Pick<
  InquiryRun,
  "id" | "question" | "day" | "window" | "status" | "createdAt" | "startedAt" | "completedAt"
> & { distribution: Pick<CountryAwareness, "country" | "confidence">[] };

export function toInquiryRunSummary(run: InquiryRunListRow): InquiryRunSummary {
  return {
    id: run.id,
    question: run.question,
    day: run.day,
    window: run.window,
    measuredCountries: run.distribution
      .filter((country) => country.confidence !== "artifact")
      .map((country) => country.country),
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}

export function toPublicInquiryRun(run: InquiryRun): PublicInquiryRun {
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
