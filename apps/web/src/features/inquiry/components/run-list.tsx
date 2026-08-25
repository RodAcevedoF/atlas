import { HAIRLINE_ROW } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { cn } from "@atlas/ui";
import { memo, useMemo } from "react";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";
import { RUN_STATUS_LABEL, runStatusClass } from "./run-status.ts";

const ROW_BASE = cn(
  HAIRLINE_ROW,
  "relative flex w-full flex-col gap-2 px-4.5 py-3.5 text-left transition-colors",
);
const ROW_SELECTED = "bg-coverage/[0.08]";
const ROW_IDLE = "hover:bg-coverage/[0.04]";
const ROW_MARKER = "absolute inset-y-0 left-0 w-0.5 bg-conviction";
const ROW_QUESTION = "line-clamp-2 text-[13.5px] leading-snug text-card-foreground";
const ROW_META = "flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-faint";
const BAR_TRACK = "flex h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]";
const BAR_FILL = "atlas4-grow-x block h-full rounded-full bg-coverage";

const toShare = (places: number, peak: number) =>
  peak > 0 ? Math.round((places / peak) * 100) : 0;

interface RunListProps {
  runs: InquiryRunSummaryRecord[];
  selectedId: string | null;
  onSelect: (runId: string) => void;
}

interface RunListItemProps {
  run: InquiryRunSummaryRecord;
  share: number;
  isSelected: boolean;
  onSelect: (runId: string) => void;
}

const RunListItem = memo(function RunListItem({
  run,
  share,
  isSelected,
  onSelect,
}: RunListItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(run.id)}
      aria-current={isSelected}
      className={cn(ROW_BASE, isSelected ? ROW_SELECTED : ROW_IDLE)}
    >
      {isSelected ? <span className={ROW_MARKER} /> : null}

      <span className={ROW_QUESTION}>{run.question}</span>

      {share > 0 ? (
        <span className={BAR_TRACK}>
          <span className={BAR_FILL} style={{ width: `${share}%` }} />
        </span>
      ) : null}

      <span className={ROW_META}>
        {formatRelativeTime(run.createdAt)}
        <span className={runStatusClass(run.status)}>· {RUN_STATUS_LABEL[run.status]}</span>
        {run.placeCount > 0 ? <span>· {run.placeCount} places</span> : null}
      </span>
    </button>
  );
});

export function RunList({ runs, selectedId, onSelect }: RunListProps) {
  const peakPlaces = useMemo(
    () => runs.reduce((peak, run) => Math.max(peak, run.placeCount), 0),
    [runs],
  );

  return (
    <div className="flex flex-col">
      {runs.map((run) => (
        <RunListItem
          key={run.id}
          run={run}
          share={toShare(run.placeCount, peakPlaces)}
          isSelected={run.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
