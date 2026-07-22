import {
  ReportBody,
  ScopeChips,
} from "@/features/world-awareness/components/world-scan/report-body.tsx";
import type { WorldScanHistoryItem } from "@/features/world-awareness/repositories/market-repository.ts";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, Card } from "@atlas/ui";

interface SavedReportsProps {
  reports: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onRemove: (reportId: string) => void;
  pendingId: string | null;
}

function SavedReportCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: WorldScanHistoryItem;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-2/40">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatRelativeTime(item.generatedAt)}
          </span>
          <ScopeChips scope={item.scope} />
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove} disabled={isRemoving}>
          Remove
        </Button>
      </div>
      <div className="px-3">
        <ReportBody report={item.report} />
      </div>
    </div>
  );
}

export function SavedReports({
  reports,
  isLoading,
  error,
  onRemove,
  pendingId,
}: SavedReportsProps) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4.25 pb-3 pt-3.5">
        <div>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Saved reports
          </span>
          <div className="mt-0.75 text-sm font-semibold tracking-[-0.01em]">Keep for later</div>
        </div>
        <span className="text-[11px] text-muted-foreground">{reports.length}</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4.25 py-3">
        {isLoading ? (
          <div className="text-[12.5px] text-muted-foreground">Loading saved reports…</div>
        ) : null}
        {error ? <div className="text-[12.5px] text-destructive">{error}</div> : null}
        {!isLoading && !error && reports.length === 0 ? (
          <div className="text-[12.5px] text-muted-foreground">
            No saved reports yet. Open “Past reports” in a scan and save one to keep it here.
          </div>
        ) : null}
        {reports.map((item) => (
          <SavedReportCard
            key={item.id}
            item={item}
            onRemove={() => onRemove(item.id)}
            isRemoving={pendingId === item.id}
          />
        ))}
      </div>
    </Card>
  );
}
