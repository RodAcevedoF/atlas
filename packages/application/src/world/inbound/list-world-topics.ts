import type { GeoRegion, RegionTopicBreakdown, SignalSource, Topic } from "@atlas/domain";
import type { SignalStorePort } from "../outbound/signal-store.ts";

export interface ListWorldTopicsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
  since?: Date;
  limit?: number;
}

export type ListWorldTopicsOutput = RegionTopicBreakdown[];

export interface ListWorldTopics {
  execute(input?: ListWorldTopicsInput): Promise<ListWorldTopicsOutput>;
}

export class ListWorldTopicsUseCase implements ListWorldTopics {
  constructor(private readonly store: SignalStorePort) {}

  execute(input: ListWorldTopicsInput = {}): Promise<ListWorldTopicsOutput> {
    return this.store.listRegionTopicBreakdowns(input);
  }
}
