import type {
  GeoRegion,
  Signal,
  SignalId,
  SignalSource,
  Topic,
  TopicSentimentSummary,
} from "@atlas/domain";

export interface SignalClassificationUpdate {
  id: SignalId;
  topic: Topic;
  sentiment: number;
}

export interface SignalStorePort {
  upsertSignals(signals: Signal[]): Promise<void>;
  updateSignalClassifications(updates: SignalClassificationUpdate[]): Promise<void>;
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
