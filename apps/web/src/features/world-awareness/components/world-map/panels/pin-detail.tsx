import { Eyebrow } from "@/shared/ui/index.ts";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import type { MarketRecord, WorldEventRecord } from "../../../repositories/market-repository.ts";
import { TOPIC_LABELS } from "../../../utils/index.ts";
import { TopicDot } from "../../topic-dot.tsx";
import { DetailPanel, DetailPanelBody, DetailPanelHeader } from "./detail-panel.tsx";
import { MarketMiniRow } from "./market-mini-row.tsx";

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
    <DetailPanel>
      <DetailPanelHeader>
        <div className="flex items-center justify-between">
          <Eyebrow variant="header" className="flex items-center gap-2">
            <TopicDot topic={event.topic} />
            {TOPIC_LABELS[event.topic]}
          </Eyebrow>
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
        <Eyebrow variant="header" className="mt-1.5 block">
          {sourceLabel(event.source)}
        </Eyebrow>
      </DetailPanelHeader>

      <DetailPanelBody className="gap-2.5">
        <Eyebrow variant="section">Related markets</Eyebrow>
        {markets.length === 0 ? (
          <div className="text-[12px] text-muted-foreground">
            No related prediction markets for this topic and region.
          </div>
        ) : (
          markets.map((market) => <MarketMiniRow key={market.id} market={market} />)
        )}
      </DetailPanelBody>
    </DetailPanel>
  );
}
