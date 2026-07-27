import { formatCompactCurrency, formatRelativeTime } from "@/shared/utils/index.ts";
import { Button } from "@atlas/ui";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../../repositories/market-repository.ts";
import {
  type CrossStance,
  REGION_LABELS,
  type RegionCross,
  TOPIC_COLOR_VAR,
  TOPIC_LABELS,
} from "../../../utils/index.ts";
import { topOutcomeLabel } from "../../../utils/market.ts";

interface RegionDetailPanelProps {
  region: GeoRegion | null;
  breakdown: RegionTopicBreakdownRecord | undefined;
  cross: RegionCross | null;
  onOpenScan: () => void;
}

const STANCE_LABELS: Record<CrossStance, string> = {
  both: "News + market",
  "attention-only": "Headlines only",
  "expectation-only": "Market only",
  quiet: "Quiet",
};

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">{children}</div>
  );
}

function CrossSection({ cross }: { cross: RegionCross }) {
  const isBoth = cross.stance === "both";
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <SectionLabel>Attention vs. expectation</SectionLabel>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            isBoth ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {STANCE_LABELS[cross.stance]}
        </span>
      </div>

      {cross.stance === "quiet" ? (
        <div className="text-[12px] text-muted-foreground">
          No news or market signal for this selection.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col gap-1.5">
            <div className="text-[10.5px] font-medium text-muted-foreground">Attention · news</div>
            {cross.news.length === 0 ? (
              <div className="text-[11.5px] text-muted-foreground">No headlines.</div>
            ) : (
              cross.news.map((event) => (
                <a
                  key={event.id}
                  href={event.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-baseline justify-between gap-2"
                >
                  <span className="text-[12px] leading-snug text-foreground/90 transition-colors group-hover:text-primary">
                    {event.title}
                  </span>
                  <span className="flex-none font-mono text-[10px] text-muted-foreground">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </a>
              ))
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-[10.5px] font-medium text-muted-foreground">
              Expectation · markets
            </div>
            {cross.markets.length === 0 ? (
              <div className="text-[11.5px] text-muted-foreground">No markets.</div>
            ) : (
              cross.markets.map((market) => (
                <div key={market.id} className="flex flex-col gap-0.5">
                  <span className="text-[12px] leading-snug text-foreground/90">
                    {market.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                    <span>{topOutcomeLabel(market)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{formatCompactCurrency(market.volumeUsd)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicBars({ breakdown }: { breakdown: RegionTopicBreakdownRecord | undefined }) {
  const topics = breakdown?.topics ?? [];
  const peak = topics.reduce((max, topic) => Math.max(max, topic.signalCount), 0);
  if (topics.length === 0) {
    return (
      <div className="text-[12px] text-muted-foreground">No topic activity recorded here.</div>
    );
  }
  return (
    <div className="flex flex-col gap-3.25">
      <SectionLabel>Topic breakdown</SectionLabel>
      {topics.map((topic) => (
        <div key={topic.topic} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <span
                className="h-2 w-2 flex-none rounded-full"
                style={{ background: TOPIC_COLOR_VAR[topic.topic] }}
              />
              {TOPIC_LABELS[topic.topic]}
            </span>
            <span className="font-mono text-muted-foreground">{topic.signalCount}</span>
          </div>
          <div className="h-1.75 overflow-hidden rounded-[5px] bg-muted">
            <div
              className="h-full rounded-[5px]"
              style={{
                width: `${peak > 0 ? Math.round((topic.signalCount / peak) * 100) : 0}%`,
                background: TOPIC_COLOR_VAR[topic.topic],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-5.75 flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-11.5 w-11.5 items-center justify-center rounded-[13px] border border-border bg-muted">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Pick a region</span>
        <span className="max-w-52.5 text-xs text-muted-foreground">
          Select a highlighted country on the map to see its news and where the market disagrees.
        </span>
      </div>
    </div>
  );
}

export function RegionDetailPanel({
  region,
  breakdown,
  cross,
  onOpenScan,
}: RegionDetailPanelProps) {
  return (
    <aside className="flex max-h-[70vh] w-93 flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4.25 pb-3 pt-3.5">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Region detail
        </span>
        {region ? (
          <div className="mt-2 flex items-end justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span
                className="h-2.25 w-2.25 rounded-sm bg-primary"
                style={{ boxShadow: "0 0 10px var(--primary)" }}
              />
              <span className="text-[19px] font-semibold tracking-[-0.01em]">
                {REGION_LABELS[region]}
              </span>
            </div>
            <div className="text-right leading-[1.05]">
              <div className="font-mono text-[20px] font-medium text-primary">
                {(breakdown?.signalCount ?? 0).toLocaleString()}
              </div>
              <div className="text-[9.5px] uppercase tracking-widest text-muted-foreground">
                signals
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!region ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4.25 pb-4 pt-3.5">
            {cross ? <CrossSection cross={cross} /> : null}
            <TopicBars breakdown={breakdown} />
          </div>
          <div className="flex-none border-t border-border p-3">
            <Button size="sm" variant="secondary" className="w-full" onClick={onOpenScan}>
              Open full scan
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}
