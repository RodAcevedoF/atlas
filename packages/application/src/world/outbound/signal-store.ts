import type { GeoRegion, RegionTopicBreakdown, Signal, SignalSource, Topic } from "@atlas/domain";

export interface SignalStorePort {
  upsertSignals(signals: Signal[]): Promise<void>;
  listRegionTopicBreakdowns(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<RegionTopicBreakdown[]>;
  listSignals(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<Signal[]>;
}
