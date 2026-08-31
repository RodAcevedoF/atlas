import type { InquiryRunRecord, InquiryRunSummaryRecord } from "@/features/inquiry";
import { Eyebrow, PANEL_GLASS } from "@/shared/ui";
import { cn } from "@atlas/ui";
import { X } from "lucide-react";
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
  pending: "That run is still working.",
  unpaintable: "That run has nothing this map can plot.",
  unknown: "That run isn't in your recent history.",
};

const SHOWING_INSTEAD = {
  pinned: "Showing the starter research.",
  fallback: "Showing your last run with placed claims.",
  latest: "Showing your most recent run with placed claims.",
  empty: "The map has nothing to plot yet.",
} as const;

interface AwarenessRunNoticeProps {
  latest: InquiryRunSummaryRecord;
  isPinned: boolean;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
  isPainting: boolean;
  onDismiss: () => void;
}

function showingInstead(isPainting: boolean, isPinned: boolean, isFallback: boolean): string {
  if (!isPainting) return SHOWING_INSTEAD.empty;
  if (isPinned) return SHOWING_INSTEAD.pinned;
  return isFallback ? SHOWING_INSTEAD.fallback : SHOWING_INSTEAD.latest;
}

export function AwarenessRunNotice({
  latest,
  isPinned,
  isFallback,
  requestMiss,
  isPainting,
  onDismiss,
}: AwarenessRunNoticeProps) {
  return (
    <div
      className={cn(
        PANEL_GLASS,
        "atlas4-reveal pointer-events-auto relative max-w-md py-2.5 pl-4.5 pr-10 text-center text-[12.5px] leading-relaxed text-muted-foreground",
      )}
    >
      {requestMiss ? REQUEST_MISS[requestMiss] : LATEST_RUN_OUTCOME[latest.status]}{" "}
      {showingInstead(isPainting, isPinned, isFallback)}
      <button
        type="button"
        aria-label="Dismiss run notice"
        onClick={onDismiss}
        className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-coverage/[0.14] hover:text-foreground"
      >
        <X aria-hidden="true" className="h-3 w-3" />
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
    <div
      className={cn(
        PANEL_GLASS,
        "atlas4-reveal absolute right-6 top-6 z-5 flex w-68 flex-col gap-3 p-4",
      )}
    >
      <div className="flex flex-col gap-1.5">
        <Eyebrow variant="meta" className="text-context/85">
          claims · {run.window}
        </Eyebrow>
        <p className="break-words text-[14px] font-medium leading-snug tracking-[-0.015em] text-card-foreground">
          {run.question}
        </p>
      </div>

      <div className="h-px w-full bg-border-strong" />

      <div className="flex items-center gap-2.5">
        <Eyebrow variant="meta">few</Eyebrow>
        <div
          className="h-1.5 flex-1 rounded-full"
          style={{ background: "var(--map-orb-gradient)" }}
        />
        <Eyebrow variant="meta">many</Eyebrow>
      </div>

      <p className="font-mono text-[11.5px] leading-relaxed tabular-nums text-faint">
        {run.claimCount} claims across {plotted} places
        {run.unplacedClaims > 0 ? <span> · {run.unplacedClaims} could not be placed</span> : null}
      </p>
    </div>
  );
}
