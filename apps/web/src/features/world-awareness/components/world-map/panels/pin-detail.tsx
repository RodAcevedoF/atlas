import { formatCompactCurrency, formatRelativeTime } from "@/shared/utils/index.ts";
import type { MarketRecord, WorldEventRecord } from "../../../repositories/market-repository.ts";
import { TOPIC_COLOR_VAR, TOPIC_LABELS } from "../../../utils/index.ts";
import { topOutcomeLabel } from "../../../utils/market.ts";

const SOURCE_LABELS: Record<string, string> = {
  news: "News",
  market: "Market",
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

interface PinDetailProps {
  event: WorldEventRecord;
  markets: MarketRecord[];
}

export function PinDetail({ event, markets }: PinDetailProps) {
  return (
    <aside className="flex max-h-[70vh] w-93 flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4.25 pb-3 pt-3.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            <span
              className="h-2 w-2 flex-none rounded-full"
              style={{ background: TOPIC_COLOR_VAR[event.topic] }}
            />
            {TOPIC_LABELS[event.topic]}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {formatRelativeTime(event.timestamp)}
          </span>
        </div>
        <a
          href={event.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground transition-colors hover:text-primary"
        >
          {event.title}
        </a>
        <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-muted-foreground">
          {sourceLabel(event.source)}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4.25 pb-4 pt-3.5">
        <div className="text-[10px] uppercase tracking-[0.13em] text-muted-foreground">
          Related markets
        </div>
        {markets.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">
            No related prediction markets for this topic and region.
          </div>
        ) : (
          markets.map((market) => (
            <div key={market.id} className="flex flex-col gap-0.5">
              <span className="text-[12px] leading-snug text-foreground/90">{market.title}</span>
              <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
                <span>{topOutcomeLabel(market)}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{formatCompactCurrency(market.volumeUsd)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
