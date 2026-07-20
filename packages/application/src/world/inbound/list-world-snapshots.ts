import type { GeoRegion, Signal, Topic, TopicSentimentSummary } from "@atlas/domain";
import { scoreSignalRelevance } from "@atlas/domain";
import type { SignalStorePort } from "../outbound/signal-store.ts";

export interface ListWorldSnapshotsInput {
  region?: GeoRegion;
  since?: Date;
  limit?: number;
}

export interface TopicSnapshotCorroboration {
  sourceCount: number;
  signalCount: number;
}

export interface TopicSnapshot {
  topic: Topic;
  headline: string | null;
  temperature: number;
  corroboration: TopicSnapshotCorroboration;
}

export type ListWorldSnapshotsOutput = TopicSnapshot[];

export interface ListWorldSnapshots {
  execute(input?: ListWorldSnapshotsInput): Promise<ListWorldSnapshotsOutput>;
}

const HEADLINE_CANDIDATE_WINDOW = 300;

/**
 * Per-topic snapshot: sentiment temperature + a headline (top-relevance signal) + a
 * corroboration count so thin-data topics read as thin (honesty guard).
 */
export class ListWorldSnapshotsUseCase implements ListWorldSnapshots {
  constructor(private readonly store: SignalStorePort) {}

  async execute(input: ListWorldSnapshotsInput = {}): Promise<ListWorldSnapshotsOutput> {
    const [summaries, candidates] = await Promise.all([
      this.store.listTopicSentimentSummaries({ region: input.region, since: input.since }),
      this.store.listSignals({
        region: input.region,
        since: input.since,
        limit: HEADLINE_CANDIDATE_WINDOW,
      }),
    ]);

    const headlinesByTopic = pickHeadlinesByTopic(candidates, new Date());
    const snapshots = summaries.map((summary) =>
      toSnapshot(summary, headlinesByTopic.get(summary.topic) ?? null),
    );
    snapshots.sort(
      (left, right) => right.corroboration.signalCount - left.corroboration.signalCount,
    );
    return typeof input.limit === "number" ? snapshots.slice(0, input.limit) : snapshots;
  }
}

function pickHeadlinesByTopic(signals: Signal[], now: Date): Map<Topic, string> {
  const bestByTopic = new Map<Topic, { title: string; score: number }>();
  for (const signal of signals) {
    const score = scoreSignalRelevance(signal, now);
    const current = bestByTopic.get(signal.topic);
    if (!current || score > current.score) {
      bestByTopic.set(signal.topic, { title: signal.title, score });
    }
  }
  return new Map([...bestByTopic].map(([topic, best]) => [topic, best.title]));
}

function toSnapshot(summary: TopicSentimentSummary, headline: string | null): TopicSnapshot {
  return {
    topic: summary.topic,
    headline,
    temperature: summary.temperature,
    corroboration: { sourceCount: summary.sourceCount, signalCount: summary.signalCount },
  };
}
