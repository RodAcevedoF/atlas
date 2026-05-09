import type { InsightKind } from "./insight.ts";
import type { EventId, MarketId } from "./market.ts";

export type AnalysisRunStatus = "running" | "completed" | "failed";

export interface AnalysisRun {
  id: string;
  kind: InsightKind;
  marketId: MarketId | null;
  eventId: EventId | null;
  status: AnalysisRunStatus;
  currentNode: string | null;
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}
