import type {
  GeoRegion,
  MarketCategory,
  MarketRecord,
  MarketStatus,
  RegionTopicBreakdownRecord,
  SignalSource,
  Topic,
  TopicCountRecord,
  WorldEventRecord,
} from "../repositories/market-repository.ts";

const FIXED_TIMESTAMP = "2026-08-01T00:00:00.000Z";

export interface BuildMarketOptions {
  id: string;
  category?: MarketCategory;
  primaryRegion?: GeoRegion;
  status?: MarketStatus;
  volumeUsd?: number;
  liquidityUsd?: number;
}

export function buildMarket({
  id,
  category = "politics",
  primaryRegion = "europe",
  status = "active",
  volumeUsd = 1_000,
  liquidityUsd = 100,
}: BuildMarketOptions): MarketRecord {
  return {
    id,
    eventId: null,
    slug: id,
    title: `Market ${id}`,
    description: `Description ${id}`,
    category,
    primaryRegion,
    regions: [primaryRegion],
    status,
    outcomes: [],
    volumeUsd,
    liquidityUsd,
    resolvesAt: null,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  };
}

export interface BuildWorldEventOptions {
  id: string;
  topic?: Topic;
  primaryRegion?: GeoRegion;
  source?: SignalSource;
  weight?: number;
  timestamp?: string;
}

export function buildWorldEvent({
  id,
  topic = "economy",
  primaryRegion = "europe",
  source = "news",
  weight = 1,
  timestamp = FIXED_TIMESTAMP,
}: BuildWorldEventOptions): WorldEventRecord {
  return {
    id,
    title: `Headline ${id}`,
    url: `https://example.test/${id}`,
    topic,
    primaryRegion,
    source,
    timestamp,
    weight,
  };
}

export interface BuildRegionTopicsOptions {
  region: GeoRegion;
  topics: Array<{ topic: Topic; signalCount: number }>;
}

export function buildRegionTopics({
  region,
  topics,
}: BuildRegionTopicsOptions): RegionTopicBreakdownRecord {
  const counted: TopicCountRecord[] = topics.map(({ topic, signalCount }) => ({
    topic,
    signalCount,
    totalWeight: signalCount,
  }));
  const total = counted.reduce((sum, entry) => sum + entry.signalCount, 0);
  return {
    region,
    signalCount: total,
    totalWeight: total,
    sentiment: 0,
    topics: counted,
  };
}
