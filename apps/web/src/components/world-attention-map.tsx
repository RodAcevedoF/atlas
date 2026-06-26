import { useMemo, useState } from "react";
import { REGION_LABELS, TOPIC_LABELS } from "../common/utils/index.ts";
import type { GeoRegion, RegionTopicBreakdownRecord } from "../repositories/market-repository.ts";
import { REGION_SHAPES, VIEWBOX_HEIGHT, VIEWBOX_WIDTH } from "./world-map-geometry.ts";

interface WorldAttentionMapProps {
  breakdowns: RegionTopicBreakdownRecord[];
}

type BreakdownIndex = Map<GeoRegion, RegionTopicBreakdownRecord>;

function indexByRegion(breakdowns: RegionTopicBreakdownRecord[]): BreakdownIndex {
  return new Map(breakdowns.map((breakdown) => [breakdown.region, breakdown]));
}

function maxSignalCount(breakdowns: RegionTopicBreakdownRecord[]): number {
  return breakdowns.reduce((peak, breakdown) => Math.max(peak, breakdown.signalCount), 0);
}

function regionFillOpacity(signalCount: number, peak: number): number {
  if (peak <= 0) return 0.12;
  return 0.12 + 0.78 * (signalCount / peak);
}

function defaultRegion(breakdowns: RegionTopicBreakdownRecord[]): GeoRegion | null {
  const leader = [...breakdowns].sort((left, right) => right.signalCount - left.signalCount)[0];
  return leader?.region ?? null;
}

export function WorldAttentionMap({ breakdowns }: WorldAttentionMapProps) {
  const byRegion = useMemo(() => indexByRegion(breakdowns), [breakdowns]);
  const peak = useMemo(() => maxSignalCount(breakdowns), [breakdowns]);
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(() =>
    defaultRegion(breakdowns),
  );

  const active = selectedRegion ?? defaultRegion(breakdowns);
  const selected = active ? byRegion.get(active) : undefined;
  const regionOrder: GeoRegion[] = [...REGION_SHAPES.map((shape) => shape.region), "global"];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-2xl border border-border bg-card/60 p-3">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="World attention by region"
        >
          <rect
            x={0}
            y={0}
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            rx={18}
            className="fill-secondary/40"
          />
          {REGION_SHAPES.map((shape) => {
            const breakdown = byRegion.get(shape.region);
            const isSelected = active === shape.region;
            return (
              <g key={shape.region}>
                <title>
                  {`${REGION_LABELS[shape.region]} — ${breakdown?.signalCount ?? 0} signals`}
                </title>
                <path
                  d={shape.path}
                  style={{
                    fill: "var(--primary)",
                    fillOpacity: regionFillOpacity(breakdown?.signalCount ?? 0, peak),
                  }}
                  stroke={isSelected ? "var(--primary)" : "var(--border)"}
                  strokeWidth={isSelected ? 3 : 1.25}
                />
                <text
                  x={shape.labelX}
                  y={shape.labelY}
                  textAnchor="middle"
                  className="pointer-events-none fill-foreground text-[13px] font-semibold"
                >
                  {breakdown?.signalCount ?? 0}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-3 flex flex-wrap gap-2">
          {regionOrder.map((region) => {
            const isSelected = active === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => setSelectedRegion(region)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {REGION_LABELS[region]}
                <span className="text-xs opacity-70">{byRegion.get(region)?.signalCount ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <TopicBreakdownPanel region={active} breakdown={selected} />
    </div>
  );
}

interface TopicBreakdownPanelProps {
  region: GeoRegion | null;
  breakdown: RegionTopicBreakdownRecord | undefined;
}

function TopicBreakdownPanel({ region, breakdown }: TopicBreakdownPanelProps) {
  if (!region) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card/60 p-5 text-sm text-muted-foreground">
        No signals yet. Sync markets and news to populate the map.
      </div>
    );
  }

  const topics = breakdown?.topics ?? [];
  const topicPeak = topics.reduce((peak, topic) => Math.max(peak, topic.signalCount), 0);

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">Topic breakdown</div>
      <h3 className="mt-1 text-lg font-semibold text-foreground">{REGION_LABELS[region]}</h3>
      <div className="text-sm text-muted-foreground">
        {breakdown
          ? `${breakdown.signalCount} signals across sources`
          : "No signals in this region yet"}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {topics.map((topic) => (
          <div key={topic.topic}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">{TOPIC_LABELS[topic.topic]}</span>
              <span className="text-muted-foreground">{topic.signalCount}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${topicPeak > 0 ? Math.round((topic.signalCount / topicPeak) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
        {topics.length === 0 ? (
          <div className="text-sm text-muted-foreground">No topic activity recorded here.</div>
        ) : null}
      </div>
    </div>
  );
}
