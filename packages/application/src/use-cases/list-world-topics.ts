import type { GeoRegion, RegionTopicBreakdown, SignalSource, Topic } from "@atlas/domain";

export interface ListWorldTopicsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
  limit?: number;
}

export type ListWorldTopicsOutput = RegionTopicBreakdown[];

export interface ListWorldTopics {
  execute(input?: ListWorldTopicsInput): Promise<ListWorldTopicsOutput>;
}
