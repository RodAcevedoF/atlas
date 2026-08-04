import { Card, cn } from "@atlas/ui";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback } from "react";
import type { TopicSnapshotRecord } from "../../repositories/market-repository.ts";
import { CURATED_TOPICS, TOPIC_COLOR_VAR, TOPIC_LABELS } from "../../utils/index.ts";
import { TemperatureMeter } from "./temperature-meter.tsx";

const THIN_SOURCE_THRESHOLD = 2;

const EMBLA_OPTIONS = {
  align: "start",
  dragFree: true,
  containScroll: false,
  loop: true,
} as const;

const AUTOPLAY_DELAY_MS = 3200;

const AUTOPLAY_OPTIONS = {
  delay: AUTOPLAY_DELAY_MS,
  stopOnInteraction: false,
  stopOnMouseEnter: true,
} as const;

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
    <Card className="flex w-64.5 flex-none flex-col gap-2.25 p-3.5">
      <span className="flex items-center gap-1.75 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        <span
          className="h-2 w-2 flex-none rounded-full"
          style={{ background: TOPIC_COLOR_VAR[snapshot.topic] }}
        />
        {TOPIC_LABELS[snapshot.topic]}
      </span>
      <p className="line-clamp-2 min-h-[2.5em] text-[13px] leading-[1.4] text-foreground">
        {snapshot.headline ?? "No recent signals"}
      </p>
      <TemperatureMeter value={snapshot.temperature} />
      <span className="font-mono text-[9.5px] text-faint">
        {corroborationLabel(snapshot)}
        {isThin ? " · thin" : ""}
      </span>
    </Card>
  );
}

const CHEVRON_PATH = { left: "M15 5 8 12l7 7", right: "M9 5l7 7-7 7" } as const;

interface RailChevronProps {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}

function RailChevron({ side, label, onClick }: RailChevronProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full",
        "border border-border bg-card/85 text-muted-foreground backdrop-blur-sm transition-colors",
        "hover:border-conviction hover:text-foreground",
        side === "left" ? "left-2" : "right-2",
      )}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={CHEVRON_PATH[side]} />
      </svg>
    </button>
  );
}

function RailHeading({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-3.5 px-6">
      <h2 className="font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-foreground">
        Latest by topic
      </h2>
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-[9.5px] uppercase tracking-widest text-faint">
        {count} topics
      </span>
    </div>
  );
}

interface TopicSnapshotsProps {
  snapshots: TopicSnapshotRecord[];
  isLoading: boolean;
}

export function TopicSnapshots({ snapshots, isLoading }: TopicSnapshotsProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(EMBLA_OPTIONS, [Autoplay(AUTOPLAY_OPTIONS)]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (isLoading && snapshots.length === 0) return null;

  const ordered = withCuratedOrder(snapshots);

  return (
    <section className="flex flex-col gap-2.5 border-b border-border py-3.5">
      <RailHeading count={ordered.length} />

      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden px-6">
          <div className="flex gap-2.5">
            {ordered.map((snapshot) => (
              <SnapshotCard key={snapshot.topic} snapshot={snapshot} />
            ))}
          </div>
        </div>
        <div className="atlas-rail-fade-left pointer-events-none absolute inset-y-0 left-0 w-16" />
        <div className="atlas-rail-fade-right pointer-events-none absolute inset-y-0 right-0 w-16" />
        <RailChevron side="left" label="Previous topics" onClick={scrollPrev} />
        <RailChevron side="right" label="Next topics" onClick={scrollNext} />
      </div>
    </section>
  );
}
