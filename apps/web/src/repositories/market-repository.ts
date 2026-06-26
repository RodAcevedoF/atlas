import type { GeoRegion, MarketCategory, MarketStatus, SignalSource, Topic } from "@atlas/domain";

export type { GeoRegion, MarketCategory, MarketStatus, SignalSource, Topic };

export interface TopicCountRecord {
  topic: Topic;
  signalCount: number;
  totalWeight: number;
}

export interface RegionTopicBreakdownRecord {
  region: GeoRegion;
  signalCount: number;
  totalWeight: number;
  topics: TopicCountRecord[];
}

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

export interface ListWorldTopicsInput {
  source?: SignalSource;
  topic?: Topic;
  region?: GeoRegion;
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

export interface IngestNewsInput {
  query?: string;
  limit?: number;
}

export interface IngestNewsResult {
  upserted: number;
}

export interface MarketRepository {
  listMarkets(input?: ListMarketsInput): Promise<MarketRecord[]>;
  listEvents(input?: ListEventsInput): Promise<EventRecord[]>;
  listRegionSummaries(input?: ListRegionSummariesInput): Promise<RegionSummaryRecord[]>;
  listWorldTopics(input?: ListWorldTopicsInput): Promise<RegionTopicBreakdownRecord[]>;
  ingestMarkets(input?: IngestMarketsInput): Promise<IngestMarketsResult>;
  ingestNews(input?: IngestNewsInput): Promise<IngestNewsResult>;
}
