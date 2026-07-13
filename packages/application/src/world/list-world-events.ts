import type { GeoRegion, Signal, SignalSource, Topic } from "@atlas/domain";
import { scoreSignalRelevance } from "@atlas/domain";
import type { MarketStorePort } from "../ports/market-store.ts";

export interface ListWorldEventsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
  since?: Date;
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

const CANDIDATE_WINDOW = 200;
const DEFAULT_LIMIT = 12;

/**
 * Ranks recent signals by relevance (attention weight decayed by age) and returns
 * the top individual events. Source defaults to `news` — the feed is news-led, and
 * mixing market signals (whose weight is USD volume) would bury every headline.
 */
export class ListWorldEventsUseCase implements ListWorldEvents {
  constructor(private readonly store: MarketStorePort) {}

  async execute(input: ListWorldEventsInput = {}): Promise<ListWorldEventsOutput> {
    const candidates = await this.store.listSignals({
      source: input.source ?? "news",
      topic: input.topic,
      region: input.region,
      since: input.since,
      limit: CANDIDATE_WINDOW,
    });
    const now = new Date();
    return candidates
      .map((signal) => ({ signal, score: scoreSignalRelevance(signal, now) }))
      .sort((left, right) => right.score - left.score)
      .slice(0, input.limit ?? DEFAULT_LIMIT)
      .map(({ signal }) => toWorldEvent(signal));
  }
}

function toWorldEvent(signal: Signal): WorldEvent {
  return {
    id: signal.id,
    title: signal.title,
    url: signal.ref,
    topic: signal.topic,
    primaryRegion: signal.primaryRegion,
    source: signal.source,
    timestamp: signal.timestamp,
    weight: signal.weight,
  };
}
