import type { ResearchRunSummaryRecord } from "../repositories/research-repository.ts";

export function resolveSelectedRunId(
  runs: ResearchRunSummaryRecord[],
  requestedId: string | null,
): string | null {
  const requested = runs.find((run) => run.id === requestedId);
  return requested?.id ?? runs[0]?.id ?? null;
}
