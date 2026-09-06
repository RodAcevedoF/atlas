import type {
  InquiryCompletion,
  InquiryDegradation,
  InquiryFailureKind,
  InquiryPlace,
  InquiryRunProgress,
  InquiryRunStatus,
  InquirySourceDocument,
} from "@atlas/domain";

export interface MigrationDoc {
  _id: string;
  appliedAt: Date;
}

export interface InquiryRunDoc {
  _id: string;
  ownerId?: string | null;
  question: string;
  questionKey: string;
  day: string;
  window: string;
  places: InquiryPlace[];
  documents: InquirySourceDocument[];
  claimCount: number;
  unplacedClaims: number;
  costUsd: number;
  synthesis: string | null;
  status: InquiryRunStatus;
  failure?: InquiryFailureKind | null;
  error: string | null;
  attempts: number;
  progress: InquiryRunProgress;
  checkpoint?: { attempt: number; sequence: number };
  completion: InquiryCompletion | null;
  degradations: InquiryDegradation[];
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
