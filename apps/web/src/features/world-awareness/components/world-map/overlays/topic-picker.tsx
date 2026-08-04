import { useCallback, useEffect, useRef, useState } from "react";
import type { TopicFilter } from "../../../infra/store/dashboard.filters.ts";
import { CURATED_TOPICS, TOPIC_COLOR_VAR, TOPIC_LABELS } from "../../../utils/index.ts";
import type { TopicSignalCounts } from "../utils/topic-counts.ts";

const ALL_TOPICS_LABEL = "All topics";

function labelFor(topic: TopicFilter): string {
  return topic === "" ? ALL_TOPICS_LABEL : TOPIC_LABELS[topic];
}

function colorFor(topic: TopicFilter): string {
  return topic === "" ? "var(--primary)" : TOPIC_COLOR_VAR[topic];
}

function TopicDot({ topic }: { topic: TopicFilter }) {
  return (
    <span
      className="h-2 w-2 flex-none rounded-full"
      style={{ background: colorFor(topic) }}
      aria-hidden="true"
    />
  );
}

function TopicRow({
  topic,
  count,
  isActive,
  onPick,
}: {
  topic: TopicFilter;
  count: number;
  isActive: boolean;
  onPick: (topic: TopicFilter) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(topic)}
      aria-pressed={isActive}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] transition-colors ${
        isActive ? "bg-white/8 text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <TopicDot topic={topic} />
      <span className="flex-1 truncate text-left">{labelFor(topic)}</span>
      <span className="font-mono text-[10.5px] text-muted-foreground">{count}</span>
    </button>
  );
}

function useDismissOnOutsidePointer(active: boolean, onDismiss: () => void) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      onDismiss();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [active, onDismiss]);

  return rootRef;
}

interface TopicPickerProps {
  topic: TopicFilter;
  counts: TopicSignalCounts;
  onTopicChange: (topic: TopicFilter) => void;
}

export function TopicPicker({ topic, counts, onTopicChange }: TopicPickerProps) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const rootRef = useDismissOnOutsidePointer(open, close);

  const pick = useCallback(
    (next: TopicFilter) => {
      onTopicChange(next);
      setOpen(false);
    },
    [onTopicChange],
  );

  return (
    <div ref={rootRef} className="absolute left-4 top-4 z-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-9 items-center gap-2.25 rounded-[10px] border border-border bg-card/86 px-3.5 text-[13px] text-foreground backdrop-blur-md transition-colors hover:border-border-strong"
      >
        <TopicDot topic={topic} />
        {labelFor(topic)}
        <span className="font-mono text-[10px] text-muted-foreground" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="mt-2 flex w-62.5 flex-col gap-0.5 rounded-[14px] border border-border bg-card/94 p-2 shadow-2xl shadow-black/50 backdrop-blur-lg">
          <TopicRow topic="" count={counts.total} isActive={topic === ""} onPick={pick} />
          {CURATED_TOPICS.map((option) => (
            <TopicRow
              key={option}
              topic={option}
              count={counts.byTopic.get(option) ?? 0}
              isActive={topic === option}
              onPick={pick}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
