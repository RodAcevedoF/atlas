import type { InquiryRunSummaryRecord } from "../repositories/inquiry-repository.ts";

export function resolveSelectedRunId(
  runs: InquiryRunSummaryRecord[],
  requestedId: string | null,
): string | null {
  const requested = runs.find((run) => run.id === requestedId);
  return requested?.id ?? runs[0]?.id ?? null;
}
