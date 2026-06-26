import { Card } from "@atlas/ui";
import { TOPIC_LABELS } from "../../common/utils/index.ts";
import type { RegionTopicBreakdownRecord, Topic } from "../../repositories/market-repository.ts";

interface TopTopic {
  topic: Topic;
  count: number;
}

function aggregateTopTopics(breakdowns: RegionTopicBreakdownRecord[], limit: number): TopTopic[] {
  const totals = new Map<Topic, number>();
  for (const breakdown of breakdowns) {
    for (const topic of breakdown.topics) {
      totals.set(topic.topic, (totals.get(topic.topic) ?? 0) + topic.signalCount);
    }
  }
  return [...totals.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

export function TopTopics({ breakdowns }: { breakdowns: RegionTopicBreakdownRecord[] }) {
  const topics = aggregateTopTopics(breakdowns, 8);
  const peak = topics.reduce((max, topic) => Math.max(max, topic.count), 0);

  return (
    <Card className="flex w-[372px] flex-none flex-col overflow-hidden">
      <div className="border-b border-border px-[17px] pb-3 pt-3.5">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Worldwide
        </span>
        <div className="mt-[3px] text-sm font-semibold tracking-[-0.01em]">Top topics</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-[11px] overflow-y-auto px-[17px] pb-3.5 pt-3">
        {topics.length === 0 ? (
          <div className="text-[12.5px] text-muted-foreground">No signals yet.</div>
        ) : (
          topics.map((entry, index) => (
            <div key={entry.topic} className="flex items-center gap-3">
              <span className="w-4 flex-none font-mono text-[11px] text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium">{TOPIC_LABELS[entry.topic]}</span>
                  <span className="font-mono text-muted-foreground">
                    {entry.count.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${peak > 0 ? Math.round((entry.count / peak) * 100) : 0}%`,
                      background: "linear-gradient(90deg, rgba(255,171,88,.5), var(--primary))",
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
