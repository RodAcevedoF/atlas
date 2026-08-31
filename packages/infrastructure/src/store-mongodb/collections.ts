import type { InquiryPlace, InquiryRunStatus, InquirySourceDocument } from "@atlas/domain";

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
  error: string | null;
  attempts: number;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}
