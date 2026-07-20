import { Card } from "@atlas/ui";
import type { TopicSnapshotRecord } from "../../repositories/market-repository.ts";
import { CURATED_TOPICS, TOPIC_LABELS } from "../../utils/index.ts";
import { TemperatureMeter } from "./temperature-meter.tsx";

const THIN_SOURCE_THRESHOLD = 2;

const EMPTY_CORROBORATION = { sourceCount: 0, signalCount: 0 };

function withCuratedOrder(snapshots: TopicSnapshotRecord[]): TopicSnapshotRecord[] {
  const byTopic = new Map(snapshots.map((snapshot) => [snapshot.topic, snapshot]));
  return CURATED_TOPICS.map(
    (topic) =>
      byTopic.get(topic) ?? {
        topic,
        headline: null,
        temperature: 0,
        corroboration: EMPTY_CORROBORATION,
      },
  );
}

function corroborationLabel(snapshot: TopicSnapshotRecord): string {
  const { sourceCount, signalCount } = snapshot.corroboration;
  const sourceWord = sourceCount === 1 ? "source" : "sources";
  const signalWord = signalCount === 1 ? "signal" : "signals";
  return `${sourceCount} ${sourceWord} · ${signalCount} ${signalWord}`;
}

function SnapshotCard({ snapshot }: { snapshot: TopicSnapshotRecord }) {
  const isThin = snapshot.corroboration.sourceCount < THIN_SOURCE_THRESHOLD;
  return (
    <Card className="flex w-56 flex-none flex-col gap-2 px-3.5 py-3">
      <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {TOPIC_LABELS[snapshot.topic]}
      </span>
      <p className="line-clamp-2 min-h-[2.5em] text-[12.5px] leading-snug text-foreground">
        {snapshot.headline ?? "No recent signals"}
      </p>
      <TemperatureMeter value={snapshot.temperature} />
      <span className="text-[10.5px] text-muted-foreground">
        {corroborationLabel(snapshot)}
        {isThin ? " · thin" : ""}
      </span>
    </Card>
  );
}

interface TopicSnapshotsProps {
  snapshots: TopicSnapshotRecord[];
  isLoading: boolean;
}

export function TopicSnapshots({ snapshots, isLoading }: TopicSnapshotsProps) {
  if (isLoading && snapshots.length === 0) return null;

  return (
    <section className="flex flex-none gap-3 overflow-x-auto pb-1">
      {withCuratedOrder(snapshots).map((snapshot) => (
        <SnapshotCard key={snapshot.topic} snapshot={snapshot} />
      ))}
    </section>
  );
}
