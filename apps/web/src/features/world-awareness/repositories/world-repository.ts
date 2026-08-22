import type {
  GeoRegion,
  RegionTopicBreakdown,
  SignalSource,
  Topic,
  TopicCount,
} from "@atlas/domain";

export type { GeoRegion, SignalSource, Topic };

export type TopicCountRecord = TopicCount;

export type RegionTopicBreakdownRecord = RegionTopicBreakdown;

export interface WorldEventRecord {
  id: string;
  title: string;
  url: string;
  topic: Topic;
  primaryRegion: GeoRegion;
  source: SignalSource;
  timestamp: string;
  weight: number;
}

export interface ListWorldTopicsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
  limit?: number;
}

export interface ListWorldEventsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
  limit?: number;
}

export interface IngestNewsInput {
  query?: string;
  limit?: number;
}

export interface IngestNewsResult {
  upserted: number;
}

export interface WorldRepository {
  listWorldTopics(input?: ListWorldTopicsInput): Promise<RegionTopicBreakdownRecord[]>;
  listWorldEvents(input?: ListWorldEventsInput): Promise<WorldEventRecord[]>;
  ingestNews(input?: IngestNewsInput): Promise<IngestNewsResult>;
}
