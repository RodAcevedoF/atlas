import { Eyebrow, SegmentedControl } from "@/shared/ui";
import type { Topic } from "../../../repositories/world-repository.ts";
import { TOPIC_LABELS } from "../../../utils/index.ts";
import { TopicDot } from "../../topic-dot.tsx";
import type { MapFillMode } from "../types.ts";

const MODES: ReadonlyArray<{ id: MapFillMode; label: string }> = [
  { id: "topic", label: "Topic" },
  { id: "tendency", label: "Tendency" },
];

function TendencyLegend() {
  return (
    <div className="flex items-center gap-2">
      <Eyebrow>Neg</Eyebrow>
      <div
        className="h-1.5 flex-1 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, var(--sentiment-negative), var(--sentiment-neutral), var(--sentiment-positive))",
        }}
      />
      <Eyebrow>Pos</Eyebrow>
    </div>
  );
}

function TopicLegend({ topics }: { topics: Topic[] }) {
  if (topics.length === 0) {
    return <span className="text-[10px] text-muted-foreground">No topic activity</span>;
  }
  return (
    <div className="flex flex-col gap-1">
      {topics.map((topic) => (
        <span key={topic} className="flex items-center gap-1.5">
          <TopicDot topic={topic} />
          <span className="truncate text-[10px] text-muted-foreground">{TOPIC_LABELS[topic]}</span>
        </span>
      ))}
    </div>
  );
}

interface LegendPanelProps {
  mode: MapFillMode;
  onModeChange: (mode: MapFillMode) => void;
  topics: Topic[];
}

export function LegendPanel({ mode, onModeChange, topics }: LegendPanelProps) {
  return (
    <div className="absolute right-4 top-4 z-5 flex w-46 flex-col gap-2.5 rounded-xl border border-border bg-card/70 p-2.5 backdrop-blur-md">
      <SegmentedControl items={MODES} activeId={mode} onSelect={onModeChange} />
      <div className="h-px w-full bg-border" />
      {mode === "tendency" ? <TendencyLegend /> : <TopicLegend topics={topics} />}
    </div>
  );
}
