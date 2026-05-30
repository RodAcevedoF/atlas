export type MarketStatus = "active" | "closed" | "resolved";
export type MarketCategory =
  | "politics"
  | "crypto"
  | "sports"
  | "economics"
  | "science"
  | "culture"
  | "other";

export interface MarketOutcome {
  id: string;
  marketId: string;
  name: string;
  price: number;
  shares: number;
}

export interface MarketRecord {
  id: string;
  eventId: string | null;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  status: MarketStatus;
  outcomes: MarketOutcome[];
  volumeUsd: number;
  liquidityUsd: number;
  resolvesAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: MarketCategory;
  marketIds: string[];
  createdAt: string;
}

export interface ListMarketsInput {
  status?: MarketStatus;
  category?: MarketCategory;
  limit?: number;
}

export interface ListEventsInput {
  limit?: number;
}

export interface IngestMarketsInput {
  categories?: string[];
  maxMarkets?: number;
}

export interface IngestMarketsResult {
  upserted: number;
  ticksRecorded: number;
}

export interface MarketRepository {
  listMarkets(input?: ListMarketsInput): Promise<MarketRecord[]>;
  listEvents(input?: ListEventsInput): Promise<EventRecord[]>;
  ingestMarkets(input?: IngestMarketsInput): Promise<IngestMarketsResult>;
}