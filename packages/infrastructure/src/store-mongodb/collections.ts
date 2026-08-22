import type {
  CountryAwareness,
  GeoRegion,
  InquiryExemplar,
  InquiryRunStatus,
  SignalSource,
  Topic,
} from "@atlas/domain";

export interface SignalDoc {
  _id: string;
  source: SignalSource;
  topic: Topic;
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  sourceCountry?: string | null;
  weight: number;
  sentiment: number;
  title: string;
  ref: string;
  timestamp: Date;
  createdAt: Date;
}

export interface MigrationDoc {
  _id: string;
  appliedAt: Date;
}

export interface InquiryRunDoc {
  _id: string;
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
