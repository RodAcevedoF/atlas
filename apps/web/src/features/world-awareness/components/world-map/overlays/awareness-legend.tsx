import type { InquiryRunRecord, InquiryRunSummaryRecord } from "@/features/inquiry";
import { Eyebrow } from "@/shared/ui";
import type { AwarenessRequestMiss } from "../utils/awareness-run.ts";

const LATEST_RUN_OUTCOME: Record<InquiryRunSummaryRecord["status"], string> = {
  queued: "Your latest question is queued.",
  running: "Your latest question is still running.",
  succeeded: "Your latest run measured no country this map can plot.",
  no_coverage: "Your latest question found no measurable coverage anywhere.",
  below_floor: "Your latest run measured too little coverage to plot honestly.",
  failed_retryable: "Your latest run failed and is due to retry.",
  failed_permanent: "Your latest run failed and will not retry.",
};

const REQUEST_MISS: Record<AwarenessRequestMiss, string> = {
  unpaintable: "That run has nothing this map can plot.",
  unknown: "That run isn't in your recent history.",
};

const SHOWING_INSTEAD = {
  fallback: "Showing your last run with measurable coverage.",
  latest: "Showing your most recent run with coverage.",
  ambient: "The map is showing ambient coverage.",
} as const;

interface AwarenessRunNoticeProps {
  latest: InquiryRunSummaryRecord;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
  isPainting: boolean;
}

function showingInstead(isPainting: boolean, isFallback: boolean): string {
  if (!isPainting) return SHOWING_INSTEAD.ambient;
  return isFallback ? SHOWING_INSTEAD.fallback : SHOWING_INSTEAD.latest;
}

export function AwarenessRunNotice({
  latest,
  isFallback,
  requestMiss,
  isPainting,
}: AwarenessRunNoticeProps) {
  return (
    <div className="max-w-md rounded-xl border border-border bg-card/86 px-4 py-2 text-center text-[12.5px] text-muted-foreground backdrop-blur-md">
      {requestMiss ? REQUEST_MISS[requestMiss] : LATEST_RUN_OUTCOME[latest.status]}{" "}
      {showingInstead(isPainting, isFallback)}
    </div>
  );
}

export function AwarenessRunPill({
  run,
  onShowRun,
}: { run: InquiryRunSummaryRecord; onShowRun: () => void }) {
  return (
    <button
      type="button"
      onClick={onShowRun}
      className="absolute bottom-4 left-4 z-5 max-w-64 truncate rounded-xl border border-border bg-card/70 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-md hover:text-card-foreground"
    >
      Show inquiry run · {run.question}
    </button>
  );
}

interface AwarenessLegendProps {
  run: InquiryRunRecord;
  plotted: number;
  unmapped: string[];
  onShowAmbient: () => void;
}

export function AwarenessLegend({ run, plotted, unmapped, onShowAmbient }: AwarenessLegendProps) {
  return (
    <div className="absolute right-4 top-4 z-5 flex w-64 flex-col gap-2.5 rounded-xl border border-border bg-card/70 p-2.5 backdrop-blur-md">
      <div className="flex flex-col gap-1">
        <Eyebrow>Awareness · {run.window}</Eyebrow>
        <p className="line-clamp-2 text-[12.5px] leading-snug text-card-foreground">
          {run.question}
        </p>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex items-center gap-2">
        <Eyebrow>Quiet</Eyebrow>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{ background: "linear-gradient(90deg, var(--map-empty-fill), var(--primary))" }}
        />
        <Eyebrow>Loud</Eyebrow>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {plotted} countries plotted
        {unmapped.length > 0 ? (
          <span title={unmapped.join(", ")}> · {unmapped.length} measured but not on this map</span>
        ) : null}
      </p>

      {run.executedQuery ? (
        <p
          className="truncate font-mono text-[10px] text-muted-foreground"
          title={run.executedQuery}
        >
          {run.executedQuery}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onShowAmbient}
        className="text-left text-[10px] text-muted-foreground underline-offset-2 hover:text-card-foreground hover:underline"
      >
        Show ambient map
      </button>
    </div>
  );
}
