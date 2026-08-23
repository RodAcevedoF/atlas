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

export interface InquiryClaim {
  text: string;
  confidence: number;
  sourceUrl: string;
  sourceTitle: string | null;
  publishedDate: string | null;
}

export interface InquiryPlace {
  place: string;
  country: string | null;
  latitude: number;
  longitude: number;
  claimCount: number;
  claims: InquiryClaim[];
}

export interface InquiryRun {
  id: InquiryRunId;
  question: string;
  questionKey: string;
  day: string;
  window: string;
  places: InquiryPlace[];
  claimCount: number;
  unplacedClaims: number;
  costUsd: number;
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
  window: string;
  places: InquiryPlace[];
  claimCount: number;
  unplacedClaims: number;
  retrievalCostUsd: number;
  synthesis: string | null;
  status: InquiryRunStatus;
  error: string | null;
  attempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface InquiryRunSummary {
  id: InquiryRunId;
  question: string;
  day: string;
  window: string;
  placeCount: number;
  status: InquiryRunStatus;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export type InquiryRunListRow = Pick<
  InquiryRun,
  "id" | "question" | "day" | "window" | "status" | "createdAt" | "startedAt" | "completedAt"
> & { placeCount: number };

export function toInquiryRunSummary(run: InquiryRunListRow): InquiryRunSummary {
  return {
    id: run.id,
    question: run.question,
    day: run.day,
    window: run.window,
    placeCount: run.placeCount,
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
    window: run.window,
    places: run.places,
    claimCount: run.claimCount,
    unplacedClaims: run.unplacedClaims,
    retrievalCostUsd: run.costUsd,
    synthesis: run.synthesis,
    status: run.status,
    error: run.error,
    attempts: run.attempts,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  };
}
