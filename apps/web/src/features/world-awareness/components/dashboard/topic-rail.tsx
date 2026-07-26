import type { Topic } from "../../repositories/market-repository.ts";
import { CURATED_TOPICS, TOPIC_COLOR_VAR, TOPIC_LABELS } from "../../utils/index.ts";

export type TopicFilter = Topic | "";

interface TopicRailProps {
  topic: TopicFilter;
  onTopicChange: (topic: TopicFilter) => void;
}

function TopicChip({
  label,
  color,
  isActive,
  onClick,
}: {
  label: string;
  color?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex h-7 flex-none items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${
        isActive
          ? "bg-white/8 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {color ? (
        <span className="h-2 w-2 flex-none rounded-full" style={{ background: color }} />
      ) : null}
      {label}
    </button>
  );
}

export function TopicRail({ topic, onTopicChange }: TopicRailProps) {
  return (
    <div className="flex flex-none items-center gap-0.5 overflow-x-auto rounded-[11px] border border-border bg-muted p-0.75">
      <TopicChip label="All topics" isActive={topic === ""} onClick={() => onTopicChange("")} />
      <div className="mx-0.5 h-4 w-px flex-none bg-border" />
      {CURATED_TOPICS.map((option) => (
        <TopicChip
          key={option}
          label={TOPIC_LABELS[option]}
          color={TOPIC_COLOR_VAR[option]}
          isActive={topic === option}
          onClick={() => onTopicChange(option)}
        />
      ))}
    </div>
  );
}
