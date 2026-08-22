import type { RegionTopicBreakdownRecord, Topic } from "../../../repositories/world-repository.ts";

export interface TopicSignalCounts {
  total: number;
  byTopic: Map<Topic, number>;
}

// Rolls the per-region topic breakdown up into one signal count per topic, for the
// map's topic filter. Regions carry their own total, so it is summed directly rather
// than re-derived from the topic rows.
export function countTopicSignals(breakdowns: RegionTopicBreakdownRecord[]): TopicSignalCounts {
  const byTopic = new Map<Topic, number>();
  let total = 0;

  for (const breakdown of breakdowns) {
    total += breakdown.signalCount;
    for (const { topic, signalCount } of breakdown.topics) {
      byTopic.set(topic, (byTopic.get(topic) ?? 0) + signalCount);
    }
  }

  return { total, byTopic };
}
