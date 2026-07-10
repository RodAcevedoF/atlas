import { formatRelativeTime } from "@/shared/utils/index.ts";
import { Button, Card } from "@atlas/ui";
import { useState } from "react";
import type {
  WorldScanHistoryItem,
  WorldScanReportRecord,
} from "../../repositories/market-repository.ts";
import { REGION_LABELS, TOPIC_LABELS } from "../../utils/index.ts";

interface WorldScanPanelProps {
  report: WorldScanReportRecord | null;
  isScanning: boolean;
  error: string | null;
  onRun: () => void;
  history: WorldScanHistoryItem[];
  isHistoryLoading: boolean;
  historyError: string | null;
  onLoadHistory: () => void;
}

function Citations({ refs }: { refs: string[] }) {
  if (refs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {refs.map((ref) => (
        <span
          key={ref}
          className="max-w-55 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
          title={ref}
        >
          {ref}
        </span>
      ))}
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{children}</div>
  );
}

function ReportBody({ report }: { report: WorldScanReportRecord }) {
  const { header, developments, divergences, regionNotes, coverage } = report;
  return (
    <div className="flex flex-col gap-4 py-3">
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>{header.newsSignalCount} news signals</span>
        <span aria-hidden="true">·</span>
        <span>{header.marketMoverCount} market movers</span>
        {header.topMovers.length > 0 ? (
          <span
            className="basis-full truncate text-foreground/70"
            title={header.topMovers.join(", ")}
          >
            movers: {header.topMovers.join(", ")}
          </span>
        ) : null}
      </div>

      {developments.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Developments</SectionLabel>
          {developments.map((development) => (
            <div key={development.title} className="flex flex-col gap-1">
              <div className="text-[13px] font-semibold leading-snug">{development.title}</div>
              <div className="text-[11px] text-muted-foreground">{development.where}</div>
              <p className="text-[12.5px] leading-snug text-foreground/90">
                {development.whyItMatters}
              </p>
              <Citations refs={development.citations} />
            </div>
          ))}
        </section>
      ) : null}

      {divergences.length > 0 ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel>Where the money disagrees</SectionLabel>
          {divergences.map((divergence) => (
            <div
              key={`${divergence.topic}-${divergence.region}`}
              className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-2.5"
            >
              <div className="text-[12px] font-semibold">
                {divergence.topic}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {divergence.region}
                </span>
              </div>
              <div className="text-[12px] leading-snug">
                <span className="text-muted-foreground">Attention: </span>
                {divergence.attention}
              </div>
              <div className="text-[12px] leading-snug">
                <span className="text-muted-foreground">Expectation: </span>
                {divergence.expectation}
              </div>
              <div className="text-[12px] leading-snug text-primary">{divergence.read}</div>
              <Citations refs={divergence.citations} />
            </div>
          ))}
        </section>
      ) : null}

      {regionNotes.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <SectionLabel>Regions in focus</SectionLabel>
          {regionNotes.map((note) => (
            <div key={note.region} className="text-[12px] leading-snug">
              <span className="font-medium">{note.region}</span>
              <span className="text-foreground/80"> — {note.note}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-1.5 border-t border-border pt-3">
        <SectionLabel>Coverage</SectionLabel>
        <p className="text-[11.5px] leading-snug text-muted-foreground">{coverage.note}</p>
        {coverage.sourcesUsed.length > 0 ? (
          <div className="text-[11px] text-muted-foreground">
            Sources: {coverage.sourcesUsed.join(", ")}
          </div>
        ) : null}
        {coverage.gaps.map((gap) => (
          <div key={gap} className="text-[11px] text-muted-foreground">
            · {gap}
          </div>
        ))}
      </section>
    </div>
  );
}

function ScopeChips({ scope }: { scope: WorldScanHistoryItem["scope"] }) {
  const chips: string[] = [];
  if (scope.topic) chips.push(TOPIC_LABELS[scope.topic]);
  if (scope.region) chips.push(REGION_LABELS[scope.region]);
  if (chips.length === 0) chips.push("All topics · all regions");
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function HistoryRow({
  item,
  expanded,
  onToggle,
}: {
  item: WorldScanHistoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left"
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
}: {
  history: WorldScanHistoryItem[];
  isLoading: boolean;
  error: string | null;
  onLoad: () => void;
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
          {error ? <div className="text-[12px] text-destructive-foreground">{error}</div> : null}
          {!isLoading && !error && history.length === 0 ? (
            <div className="text-[12px] text-muted-foreground">No saved reports yet.</div>
          ) : null}
          {history.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
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
        {error ? (
          <div className="py-3 text-[12.5px] text-destructive-foreground">{error}</div>
        ) : null}

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
        />
      </div>
    </Card>
  );
}
