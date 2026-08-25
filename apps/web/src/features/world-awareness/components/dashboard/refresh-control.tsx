import { RUN_STATUS_LABEL } from "@/features/inquiry";
import { HEADER_CONTROL, HEADER_CONTROL_DISABLED, headerControlTone } from "@/shared/ui";
import type { InquiryRunStatus } from "@atlas/domain";
import { cn } from "@atlas/ui";
import { RefreshCw, X } from "lucide-react";
import type { WorldRefresh } from "../../hooks/use-world-awareness.ts";

const PILL_BASE =
  "flex items-center gap-1.75 rounded-full border px-3 py-1 text-[11px] leading-none";

function StagePill({ status }: { status: InquiryRunStatus | null }) {
  return (
    <span className={cn(PILL_BASE, "border-primary/25 bg-primary/10 text-primary")}>
      <span className="h-1.25 w-1.25 rounded-full bg-primary animate-pulse motion-reduce:animate-none" />
      {status ? RUN_STATUS_LABEL[status] : "Starting"}
    </span>
  );
}

function ErrorPill({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <span
      title={message}
      className={cn(PILL_BASE, "max-w-64 border-destructive/30 bg-destructive/10 text-destructive")}
    >
      <span className="h-1.25 w-1.25 shrink-0 rounded-full bg-destructive" />
      <span className="truncate">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss refresh error"
        className="shrink-0 rounded-full transition-opacity hover:opacity-70"
      >
        <X aria-hidden="true" className="h-3 w-3" />
      </button>
    </span>
  );
}

export function RefreshControl({ refresh }: { refresh: WorldRefresh }) {
  const { canRefresh, isRefreshing, status, error, run, dismissError } = refresh;

  return (
    <div className="flex items-center gap-2">
      <output aria-live="polite" className="flex items-center empty:hidden">
        {isRefreshing ? <StagePill status={status} /> : null}
        {!isRefreshing && error ? <ErrorPill message={error} onDismiss={dismissError} /> : null}
      </output>

      <button
        type="button"
        onClick={run}
        disabled={!canRefresh}
        aria-label="Refresh this run"
        className={cn(
          HEADER_CONTROL,
          "font-semibold",
          headerControlTone(isRefreshing),
          HEADER_CONTROL_DISABLED,
        )}
      >
        <RefreshCw
          aria-hidden="true"
          className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin motion-reduce:animate-none")}
        />
        Refresh
      </button>
    </div>
  );
}
