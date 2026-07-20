import type {
  GeoRegion,
  RegionTopicBreakdown,
  Signal,
  SignalSource,
  Topic,
  TopicSentimentSummary,
} from "@atlas/domain";

export interface SignalStorePort {
  upsertSignals(signals: Signal[]): Promise<void>;
  listRegionTopicBreakdowns(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<RegionTopicBreakdown[]>;
  listTopicSentimentSummaries(filter?: {
    region?: GeoRegion;
    since?: Date;
  }): Promise<TopicSentimentSummary[]>;
  listSignals(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<Signal[]>;
}
