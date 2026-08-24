import { type InquiryRunSummaryRecord, isInquiryRunSettled } from "@/features/inquiry";

export type AwarenessRequestMiss = "pending" | "unpaintable" | "unknown";

export interface AwarenessSelection {
  latest: InquiryRunSummaryRecord | null;
  run: InquiryRunSummaryRecord | null;
  isPinned: boolean;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
}

function isPaintable(run: InquiryRunSummaryRecord): boolean {
  return run.placeCount > 0;
}

function firstPaintable(runs: InquiryRunSummaryRecord[]): InquiryRunSummaryRecord | null {
  return runs.find(isPaintable) ?? null;
}

function findRun(
  runs: InquiryRunSummaryRecord[],
  runId: string | null,
): InquiryRunSummaryRecord | null {
  if (!runId) return null;
  return runs.find((run) => run.id === runId) ?? null;
}

function missFor(
  requestedId: string | null,
  requested: InquiryRunSummaryRecord | null,
): AwarenessRequestMiss | null {
  if (!requestedId) return null;
  if (!requested) return "unknown";
  return isInquiryRunSettled(requested.status) ? "unpaintable" : "pending";
}

export function selectAwarenessRun(
  runs: InquiryRunSummaryRecord[],
  requestedId: string | null,
  pinnedRunId: string | null,
): AwarenessSelection {
  const latest = runs[0] ?? null;
  if (!latest) {
    return { latest: null, run: null, isPinned: false, isFallback: false, requestMiss: null };
  }

  const requested = findRun(runs, requestedId);
  if (requested && isPaintable(requested)) {
    return { latest, run: requested, isPinned: false, isFallback: false, requestMiss: null };
  }

  const requestMiss = missFor(requestedId, requested);
  const painted = firstPaintable(runs);
  if (!painted) return { latest, run: null, isPinned: false, isFallback: false, requestMiss };

  const isPinned = painted.id === pinnedRunId;
  return {
    latest,
    run: painted,
    isPinned,
    isFallback: !isPinned && painted.id !== latest.id,
    requestMiss,
  };
}
