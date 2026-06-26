import { REGION_LABELS, TOPIC_LABELS } from "../../common/utils/index.ts";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../repositories/market-repository.ts";

interface RegionDetailPanelProps {
  region: GeoRegion | null;
  breakdown: RegionTopicBreakdownRecord | undefined;
}

function EmptyState() {
  return (
    <div className="flex min-h-[230px] flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] border border-border bg-muted">
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
        <span className="max-w-[210px] text-xs text-muted-foreground">
          Select a highlighted country on the map to see its ranked topic breakdown.
        </span>
      </div>
    </div>
  );
}

export function RegionDetailPanel({ region, breakdown }: RegionDetailPanelProps) {
  const topics = breakdown?.topics ?? [];
  const peak = topics.reduce((max, topic) => Math.max(max, topic.signalCount), 0);

  return (
    <aside className="flex w-[372px] flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-[17px] pb-3 pt-3.5">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Region detail
        </span>
        {region ? (
          <>
            <div className="mt-2 flex items-end justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-[9px] w-[9px] rounded-sm bg-primary"
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
                <div className="text-[9.5px] uppercase tracking-[0.1em] text-muted-foreground">
                  signals
                </div>
              </div>
            </div>
            <div className="mt-2.5 text-[11.5px] text-muted-foreground">
              Topic breakdown · ranked by signal volume
            </div>
          </>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!region ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-[13px] px-[17px] pb-4 pt-3">
            {topics.length === 0 ? (
              <div className="text-[12.5px] text-muted-foreground">
                No topic activity recorded here.
              </div>
            ) : (
              topics.map((topic) => (
                <div key={topic.topic} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-foreground">{TOPIC_LABELS[topic.topic]}</span>
                    <span className="font-mono text-muted-foreground">{topic.signalCount}</span>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-[5px] bg-muted">
                    <div
                      className="h-full rounded-[5px]"
                      style={{
                        width: `${peak > 0 ? Math.round((topic.signalCount / peak) * 100) : 0}%`,
                        background: "linear-gradient(90deg, rgba(255,171,88,.55), var(--primary))",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
