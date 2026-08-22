import type { InquiryRunSummaryRecord } from "@/features/inquiry/repositories/inquiry-repository.ts";
import { hasPlottableCountry } from "./awareness-points.ts";

/** Why a `?run=` request went unhonoured — "unknown" means it never reached this window at all. */
export type AwarenessRequestMiss = "unpaintable" | "unknown";

export interface AwarenessSelection {
  latest: InquiryRunSummaryRecord | null;
  run: InquiryRunSummaryRecord | null;
  isFallback: boolean;
  requestMiss: AwarenessRequestMiss | null;
}

function isPaintable(run: InquiryRunSummaryRecord): boolean {
  return hasPlottableCountry(run.measuredCountries);
}

function firstPaintable(runs: InquiryRunSummaryRecord[]): InquiryRunSummaryRecord | null {
  return runs.find(isPaintable) ?? null;
}

function missFor(
  requestedId: string | null,
  requested: InquiryRunSummaryRecord | null,
): AwarenessRequestMiss | null {
  if (!requestedId) return null;
  return requested ? "unpaintable" : "unknown";
}

export function selectAwarenessRun(
  runs: InquiryRunSummaryRecord[],
  requestedId: string | null,
): AwarenessSelection {
  const latest = runs[0] ?? null;
  if (!latest) return { latest: null, run: null, isFallback: false, requestMiss: null };

  const requested = requestedId ? (runs.find((run) => run.id === requestedId) ?? null) : null;
  if (requested && isPaintable(requested)) {
    return { latest, run: requested, isFallback: false, requestMiss: null };
  }

  const requestMiss = missFor(requestedId, requested);
  const painted = firstPaintable(runs);
  if (!painted) return { latest, run: null, isFallback: false, requestMiss };

  return { latest, run: painted, isFallback: painted.id !== latest.id, requestMiss };
}
