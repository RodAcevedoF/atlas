import { Eyebrow } from "@/shared/ui/index.ts";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import type { WorldEventRecord } from "../../../repositories/world-repository.ts";
import { TOPIC_LABELS } from "../../../utils/index.ts";
import { TopicDot } from "../../topic-dot.tsx";
import { DetailPanel, DetailPanelHeader } from "./detail-panel.tsx";

interface PinDetailProps {
  event: WorldEventRecord;
}

export function PinDetail({ event }: PinDetailProps) {
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
      </DetailPanelHeader>
    </DetailPanel>
  );
}
