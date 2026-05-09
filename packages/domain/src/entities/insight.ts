import type { EventId, MarketId } from "./market.ts";

export type InsightKind = "intelligence" | "edge" | "discrepancy";

export interface EdgeSignal {
  outcomeId: string;
  outcomeName: string;
  marketPrice: number;
  fairValueEstimate: number;
  edgePct: number;
}

export interface DiscrepancySignal {
  marketIds: MarketId[];
  description: string;
  magnitude: number;
}

export interface Insight {
  id: string;
  marketId: MarketId | null;
  eventId: EventId | null;
  kind: InsightKind;
  summary: string;
  narrative: string;
  signals: EdgeSignal[] | DiscrepancySignal[] | null;
  model: string;
  runId: string;
  generatedAt: Date;
}
