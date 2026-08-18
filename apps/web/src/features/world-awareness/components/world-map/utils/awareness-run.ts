import type { ResearchRunRecord } from "@/features/research/repositories/research-repository.ts";
import { type AwarenessPaint, buildAwarenessPaint } from "./awareness-points.ts";

export interface AwarenessSelection {
  latest: ResearchRunRecord | null;
  run: ResearchRunRecord | null;
  paint: AwarenessPaint | null;
  isFallback: boolean;
}

export function selectAwarenessRun(runs: ResearchRunRecord[]): AwarenessSelection {
  const latest = runs[0] ?? null;
  if (!latest) return { latest: null, run: null, paint: null, isFallback: false };

  for (const run of runs) {
    const paint = buildAwarenessPaint(run.distribution);
    if (paint.points.features.length === 0) continue;
    return { latest, run, paint, isFallback: run.id !== latest.id };
  }

  return { latest, run: null, paint: null, isFallback: false };
}
