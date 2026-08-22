import { Eyebrow } from "@/shared/ui/index.ts";
import type {
  GeoRegion,
  RegionTopicBreakdownRecord,
} from "../../../repositories/world-repository.ts";
import { REGION_LABELS, TOPIC_COLOR_VAR, TOPIC_LABELS } from "../../../utils/index.ts";
import { TopicDot } from "../../topic-dot.tsx";
import { DetailPanel, DetailPanelBody, DetailPanelHeader } from "./detail-panel.tsx";

interface RegionDetailPanelProps {
  region: GeoRegion | null;
  breakdown: RegionTopicBreakdownRecord | undefined;
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
      <Eyebrow variant="header">Topic breakdown</Eyebrow>
      {topics.map((topic) => (
        <div key={topic.topic} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <TopicDot topic={topic.topic} />
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
          Select a highlighted country on the map to see what it is covering right now.
        </span>
      </div>
    </div>
  );
}

export function RegionDetailPanel({ region, breakdown }: RegionDetailPanelProps) {
  return (
    <DetailPanel>
      <DetailPanelHeader>
        <Eyebrow variant="header">Region detail</Eyebrow>
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
              <Eyebrow variant="header" className="block">
                signals
              </Eyebrow>
            </div>
          </div>
        ) : null}
      </DetailPanelHeader>

      {!region ? (
        <EmptyState />
      ) : (
        <DetailPanelBody className="gap-4">
          <TopicBars breakdown={breakdown} />
        </DetailPanelBody>
      )}
    </DetailPanel>
  );
}
