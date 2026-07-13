import type { GeoRegion, RegionTopicBreakdown, SignalSource, Topic } from "@atlas/domain";
import type { MarketStorePort } from "../ports/market-store.ts";

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
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListWorldTopicsInput = {}): Promise<ListWorldTopicsOutput> {
    return this.store.listRegionTopicBreakdowns(input);
  }
}
