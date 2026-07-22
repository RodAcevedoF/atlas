import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, Card } from "@atlas/ui";
import { useState } from "react";
import type {
  WorldScanHistoryItem,
  WorldScanReportRecord,
} from "../../repositories/market-repository.ts";
import { ReportBody, ScopeChips, SectionLabel } from "./report-body.tsx";

export interface ReportSaveControls {
  isSaved: (id: string) => boolean;
  onToggle: (id: string) => void;
  pendingId: string | null;
}

interface WorldScanPanelProps {
  report: WorldScanReportRecord | null;
  isScanning: boolean;
  error: string | null;
  onRun: () => void;
  history: WorldScanHistoryItem[];
  isHistoryLoading: boolean;
  historyError: string | null;
  onLoadHistory: () => void;
  saveControls?: ReportSaveControls;
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

function PastReports({
  history,
  isLoading,
  error,
  onLoad,
  saveControls,
}: {
  history: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onLoad: () => void;
  saveControls?: ReportSaveControls;
}) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) onLoad();
  };

  return (
    <div className="border-t border-border py-3">
      <button
        type="button"
        onClick={toggleOpen}
        className="flex w-full items-center justify-between"
      >
        <SectionLabel>Past reports</SectionLabel>
        <span className="text-[11px] text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <div className="mt-2 flex flex-col gap-1.5">
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
    </div>
  );
}

export function WorldScanPanel({
  report,
  isScanning,
  error,
  onRun,
  history,
  isHistoryLoading,
  historyError,
  onLoadHistory,
  saveControls,
}: WorldScanPanelProps) {
  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4.25 pb-3 pt-3.5">
        <div>
          <span className="text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
            World scan
          </span>
          <div className="mt-0.75 text-sm font-semibold tracking-[-0.01em]">
            Attention vs. expectation
          </div>
        </div>
        <Button size="sm" onClick={onRun} disabled={isScanning}>
          {isScanning ? "Scanning…" : "Run scan"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4.25">
        {error ? <div className="py-3 text-[12.5px] text-destructive">{error}</div> : null}

        {!report && !isScanning && !error ? (
          <div className="py-3 text-[12.5px] text-muted-foreground">
            Run a scan to surface what changed and where the money disagrees with the headlines.
          </div>
        ) : null}

        {isScanning && !report ? (
          <div className="py-3 text-[12.5px] text-muted-foreground">
            Reading the window — fusing news attention and market movement…
          </div>
        ) : null}

        {report ? <ReportBody report={report} /> : null}

        <PastReports
          history={history}
          isLoading={isHistoryLoading}
          error={historyError}
          onLoad={onLoadHistory}
          saveControls={saveControls}
        />
      </div>
    </Card>
  );
}
