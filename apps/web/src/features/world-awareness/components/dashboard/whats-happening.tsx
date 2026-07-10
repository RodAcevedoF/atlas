import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Card } from "@atlas/ui";
import type { WorldEventRecord } from "../../repositories/market-repository.ts";
import { REGION_LABELS, TOPIC_LABELS, eventCoverageKey } from "../../utils/index.ts";

interface WhatsHappeningProps {
  events: WorldEventRecord[];
  marketKeys: Set<string>;
}

export function WhatsHappening({ events, marketKeys }: WhatsHappeningProps) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-[17px] pb-3 pt-3.5">
        <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
          What's happening
        </span>
        <div className="mt-[3px] text-sm font-semibold tracking-[-0.01em]">
          Top world events{" "}
          <span className="font-mono text-xs font-normal text-muted-foreground">
            · {events.length}
          </span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-y-auto px-[17px]">
        {events.length === 0 ? (
          <div className="py-3 text-[12.5px] text-muted-foreground">
            No world events yet. Sync news to populate.
          </div>
        ) : (
          events.map((event) => (
            <a
              key={event.id}
              href={event.url}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col gap-1.5 py-2.5"
            >
              <span className="text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                {event.title}
              </span>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em]">
                  {TOPIC_LABELS[event.topic]}
                </span>
                <span>{REGION_LABELS[event.primaryRegion]}</span>
                {marketKeys.has(eventCoverageKey(event.primaryRegion, event.topic)) ? (
                  <span
                    className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                    title="A prediction market tracks this region and topic"
                  >
                    market
                  </span>
                ) : null}
                <span aria-hidden="true">·</span>
                <span className="font-mono">{formatRelativeTime(event.timestamp)}</span>
              </div>
            </a>
          ))
        )}
      </div>
    </Card>
  );
}
