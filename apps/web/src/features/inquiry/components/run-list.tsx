import { formatRelativeTime } from "@/shared/utils/index.ts";
import { cn } from "@atlas/ui";
import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";
import { RUN_STATUS_LABEL, runStatusClass } from "./run-status.ts";

interface RunListProps {
  runs: InquiryRunSummaryRecord[];
  selectedId: string | null;
  onSelect: (runId: string) => void;
}

function RunListItem({
  run,
  isSelected,
  onSelect,
}: {
  run: InquiryRunSummaryRecord;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const places = run.placeCount;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isSelected}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
        isSelected
          ? "border-primary/45 bg-muted"
          : "border-border hover:border-primary/25 hover:bg-muted/55",
      )}
    >
      <span className="line-clamp-2 text-[12.5px] leading-snug text-card-foreground">
        {run.question}
      </span>
      <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
        {formatRelativeTime(run.createdAt)}
        <span className={runStatusClass(run.status)}>· {RUN_STATUS_LABEL[run.status]}</span>
        {places > 0 ? <span>· {places} places</span> : null}
      </span>
    </button>
  );
}

export function RunList({ runs, selectedId, onSelect }: RunListProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {runs.map((run) => (
        <RunListItem
          key={run.id}
          run={run}
          isSelected={run.id === selectedId}
          onSelect={() => onSelect(run.id)}
        />
      ))}
    </div>
  );
}
