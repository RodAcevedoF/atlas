import type { GeoRegion, Signal, SignalId, SignalSource, Topic } from "@atlas/domain";

export interface SignalClassificationUpdate {
  id: SignalId;
  topic: Topic;
  sentiment: number;
}

export interface SignalStorePort {
  updateSignalClassifications(updates: SignalClassificationUpdate[]): Promise<void>;
  listSignals(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<Signal[]>;
}
