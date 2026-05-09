import type { EventId, Insight } from "@atlas/domain";

export interface RunDiscrepancyScanInput {
  eventId: EventId;
}

export interface RunDiscrepancyScanOutput {
  runId: string;
  insights: Insight[];
}

export interface RunDiscrepancyScan {
  execute(input: RunDiscrepancyScanInput): Promise<RunDiscrepancyScanOutput>;
}
