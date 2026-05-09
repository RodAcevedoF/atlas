export type MarketId = string & { readonly _brand: "MarketId" };
export type EventId = string & { readonly _brand: "EventId" };
export type OutcomeId = string & { readonly _brand: "OutcomeId" };

export function makeMarketId(v: string): MarketId {
  return v as MarketId;
}
export function makeEventId(v: string): EventId {
  return v as EventId;
}
export function makeOutcomeId(v: string): OutcomeId {
  return v as OutcomeId;
}

export type MarketStatus = "active" | "closed" | "resolved";
export type MarketCategory =
  | "politics"
  | "crypto"
  | "sports"
  | "economics"
  | "science"
  | "culture"
  | "other";

export interface Outcome {
  id: OutcomeId;
  marketId: MarketId;
  name: string;
  price: number;
  shares: number;
}

export interface Market {
  id: MarketId;
  eventId: EventId | null;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  status: MarketStatus;
  outcomes: Outcome[];
  volumeUsd: number;
  liquidityUsd: number;
  resolvesAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionEvent {
  id: EventId;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  marketIds: MarketId[];
  createdAt: Date;
}
