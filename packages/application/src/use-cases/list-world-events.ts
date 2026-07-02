import type { GeoRegion, SignalSource, Topic } from "@atlas/domain";

export interface ListWorldEventsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
  limit?: number;
}

/** A single world event surfaced from the signal spine, ranked by relevance. */
export interface WorldEvent {
  id: string;
  title: string;
  url: string;
  topic: Topic;
  primaryRegion: GeoRegion;
  source: SignalSource;
  timestamp: Date;
  weight: number;
}

export type ListWorldEventsOutput = WorldEvent[];

export interface ListWorldEvents {
  execute(input?: ListWorldEventsInput): Promise<ListWorldEventsOutput>;
}
