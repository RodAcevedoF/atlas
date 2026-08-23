import type { InquiryRunRecord, InquiryRunSummaryRecord } from "@/features/inquiry";
import { Eyebrow } from "@/shared/ui";
import type { AwarenessRequestMiss } from "../utils/awareness-run.ts";

const LATEST_RUN_OUTCOME: Record<InquiryRunSummaryRecord["status"], string> = {
  queued: "Your latest question is queued.",
  running: "Your latest question is still running.",
  succeeded: "Your latest run placed no claim on the map.",
  no_coverage: "Your latest question found no claims anywhere.",
  below_floor: "Your latest run found claims, but none could be placed.",
  failed_retryable: "Your latest run failed and is due to retry.",
  failed_permanent: "Your latest run failed and will not retry.",
};

const REQUEST_MISS: Record<AwarenessRequestMiss, string> = {
  unpaintable: "That run has nothing this map can plot.",
  unknown: "That run isn't in your recent history.",
};

const SHOWING_INSTEAD = {
  fallback: "Showing your last run with placed claims.",
  latest: "Showing your most recent run with placed claims.",
  empty: "The map has nothing to plot yet.",
} as const;

interface AwarenessRunNoticeProps {
  latest: InquiryRunSummaryRecord;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
  isPainting: boolean;
  onDismiss: () => void;
}

function showingInstead(isPainting: boolean, isFallback: boolean): string {
  if (!isPainting) return SHOWING_INSTEAD.empty;
  return isFallback ? SHOWING_INSTEAD.fallback : SHOWING_INSTEAD.latest;
}

export function AwarenessRunNotice({
  latest,
  isFallback,
  requestMiss,
  isPainting,
  onDismiss,
}: AwarenessRunNoticeProps) {
  return (
    <div className="pointer-events-auto relative max-w-md rounded-xl border border-border bg-card/86 py-2 pl-4 pr-9 text-center text-[12.5px] text-muted-foreground backdrop-blur-md">
      {requestMiss ? REQUEST_MISS[requestMiss] : LATEST_RUN_OUTCOME[latest.status]}{" "}
      {showingInstead(isPainting, isFallback)}
      <button
        type="button"
        aria-label="Dismiss run notice"
        onClick={onDismiss}
        className="absolute right-2 top-1/2 flex h-5.5 w-5.5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

interface AwarenessLegendProps {
  run: InquiryRunRecord;
  plotted: number;
}

export function AwarenessLegend({ run, plotted }: AwarenessLegendProps) {
  return (
    <div className="absolute right-4 top-4 z-5 flex w-64 flex-col gap-2.5 rounded-xl border border-border bg-card/70 p-2.5 backdrop-blur-md">
      <div className="flex flex-col gap-1">
        <Eyebrow>Claims · {run.window}</Eyebrow>
        <p className="line-clamp-2 text-[12.5px] leading-snug text-card-foreground">
          {run.question}
        </p>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="flex items-center gap-2">
        <Eyebrow>Few</Eyebrow>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{ background: "linear-gradient(90deg, var(--map-empty-fill), var(--primary))" }}
        />
        <Eyebrow>Many</Eyebrow>
      </div>

      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {run.claimCount} claims across {plotted} places
        {run.unplacedClaims > 0 ? <span> · {run.unplacedClaims} could not be placed</span> : null}
      </p>
    </div>
  );
}
