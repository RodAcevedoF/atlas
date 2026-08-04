import {
  ReportBody,
  scopeLabels,
} from "@/features/world-awareness/components/world-scan/report-body.tsx";
import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import { Eyebrow } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, Card, cn } from "@atlas/ui";
import { useState } from "react";

const COLLAPSED_COUNT = 3;

interface SavedReportsProps {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onRemove: (reportId: string) => void;
  pendingId: string | null;
  className?: string;
}

function SavedReportRow({
  item,
  expanded,
  onToggle,
  onRemove,
  isRemoving,
}: {
  item: WorldScanHistoryItem;
  expanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-2/40">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <span className="whitespace-nowrap font-mono text-[9.5px] text-faint">
            {formatRelativeTime(item.generatedAt)}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground/90">
            {scopeLabels(item.scope).join(" · ")}
          </span>
          <span className="whitespace-nowrap font-mono text-[9.5px] text-muted-foreground">
            {item.report.header.newsSignalCount} signals
          </span>
        </button>
        <Button size="sm" variant="ghost" onClick={onRemove} disabled={isRemoving}>
          Remove
        </Button>
      </div>
      {expanded ? (
        <div className="border-t border-border px-3">
          <ReportBody report={item.report} />
        </div>
      ) : null}
    </div>
  );
}

export function SavedReports({
  reports,
  isLoading,
  error,
  onRemove,
  pendingId,
  className,
}: SavedReportsProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visible = showAll ? reports : reports.slice(0, COLLAPSED_COUNT);

  return (
    <Card className={cn("flex flex-col gap-3.5 p-5", className)}>
      <Eyebrow>Saved reports</Eyebrow>

      <div className="flex flex-col gap-2.5">
        {isLoading ? (
          <div className="text-[12.5px] text-muted-foreground">Loading saved reports…</div>
        ) : null}
        {error ? <div className="text-[12.5px] text-destructive">{error}</div> : null}
        {!isLoading && !error && reports.length === 0 ? (
          <div className="text-[12.5px] text-muted-foreground">
            No saved reports yet. Open “Past reports” and save one to keep it here.
          </div>
        ) : null}
        {visible.map((item) => (
          <SavedReportRow
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
            onRemove={() => onRemove(item.id)}
            isRemoving={pendingId === item.id}
          />
        ))}
      </div>

      {reports.length > COLLAPSED_COUNT ? (
        <Button variant="outline" className="mt-auto h-9" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer" : `Show all ${reports.length}`}
        </Button>
      ) : null}
    </Card>
  );
}
