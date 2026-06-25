import type { GeoRegion, MarketCategory, MarketStatus } from "@atlas/domain";

export type { GeoRegion, MarketCategory, MarketStatus };

export interface RegionSummaryRecord {
  region: GeoRegion;
  marketCount: number;
  eventCount: number;
  activeMarketCount: number;
  totalVolumeUsd: number;
  totalLiquidityUsd: number;
}

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
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
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
  tags: string[];
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
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

export interface ListRegionSummariesInput {
  status?: MarketStatus;
  category?: MarketCategory;
  limit?: number;
  region?: GeoRegion;
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
  listRegionSummaries(input?: ListRegionSummariesInput): Promise<RegionSummaryRecord[]>;
  ingestMarkets(input?: IngestMarketsInput): Promise<IngestMarketsResult>;
}
