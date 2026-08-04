import { Eyebrow } from "@/shared/ui";
import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, Card, cn } from "@atlas/ui";
import { useState } from "react";
import type { WorldScanHistoryItem } from "../../repositories/market-repository.ts";
import { ReportBody, ScopeChips } from "./report-body.tsx";

export interface ReportSaveControls {
  isSaved: (id: string) => boolean;
  onToggle: (id: string) => void;
  pendingId: string | null;
}

interface PastReportsProps {
  history: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onLoad: () => void;
  saveControls?: ReportSaveControls;
  className?: string;
}

function SaveButton({ id, controls }: { id: string; controls: ReportSaveControls }) {
  const saved = controls.isSaved(id);
  return (
    <Button
      size="sm"
      variant={saved ? "secondary" : "ghost"}
      disabled={controls.pendingId === id}
      onClick={(event) => {
        event.stopPropagation();
        controls.onToggle(id);
      }}
    >
      {saved ? "Saved" : "Save"}
    </Button>
  );
}

function HistoryRow({
  item,
  expanded,
  onToggle,
  saveControls,
}: {
  item: WorldScanHistoryItem;
  expanded: boolean;
  onToggle: () => void;
  saveControls?: ReportSaveControls;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-mono text-[11px] text-muted-foreground">
              {formatRelativeTime(item.generatedAt)}
            </span>
            <ScopeChips scope={item.scope} />
          </div>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {item.report.header.marketMoverCount} movers
          </span>
        </button>
        {saveControls ? <SaveButton id={item.id} controls={saveControls} /> : null}
      </div>
      {expanded ? (
        <div className="border-t border-border px-2.5">
          <ReportBody report={item.report} />
        </div>
      ) : null}
    </div>
  );
}

export function PastReports({
  history,
  isLoading,
  error,
  onLoad,
  saveControls,
  className,
}: PastReportsProps) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) onLoad();
  };

  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <button type="button" onClick={toggleOpen} className="flex items-center justify-between">
        <Eyebrow>Past reports</Eyebrow>
        <span className="text-[11px] text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="flex flex-col gap-1.5">
          {isLoading ? (
            <div className="text-[12px] text-muted-foreground">Loading past reports…</div>
          ) : null}
          {error ? <div className="text-[12px] text-destructive">{error}</div> : null}
          {!isLoading && !error && history.length === 0 ? (
            <div className="text-[12px] text-muted-foreground">No past reports yet.</div>
          ) : null}
          {history.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              saveControls={saveControls}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
