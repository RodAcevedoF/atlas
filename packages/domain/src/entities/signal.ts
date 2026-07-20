import type { GeoRegion, Market, MarketCategory } from "./market.ts";

export type SignalId = string & { readonly _brand: "SignalId" };

export function makeSignalId(v: string): SignalId {
  return v as SignalId;
}

export const SIGNAL_SOURCES = ["market", "news", "social"] as const;
export type SignalSource = (typeof SIGNAL_SOURCES)[number];

export const TOPICS = [
  "politics",
  "conflict",
  "economy",
  "business-finance",
  "technology",
  "science-health",
  "climate-environment",
  "society-culture",
  "sports",
  "other",
] as const;
export type Topic = (typeof TOPICS)[number];

const MARKET_CATEGORY_TO_TOPIC: Record<MarketCategory, Topic> = {
  politics: "politics",
  crypto: "business-finance",
  sports: "sports",
  economics: "economy",
  science: "science-health",
  culture: "society-culture",
  other: "other",
};

export function marketCategoryToTopic(category: MarketCategory): Topic {
  return MARKET_CATEGORY_TO_TOPIC[category];
}

export interface Signal {
  id: SignalId;
  source: SignalSource;
  topic: Topic;
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  weight: number;
  sentiment: number;
  title: string;
  ref: string;
  timestamp: Date;
  createdAt: Date;
}

export function marketToSignal(market: Market): Signal {
  return {
    id: makeSignalId(`market:${market.id}`),
    source: "market",
    topic: marketCategoryToTopic(market.category),
    primaryRegion: market.primaryRegion,
    regions: market.regions,
    weight: market.volumeUsd,
    // market signals encode price/volume
    sentiment: 0,
    title: market.title,
    ref: market.slug,
    timestamp: market.updatedAt,
    createdAt: market.createdAt,
  };
}

const RELEVANCE_HALF_LIFE_HOURS = 24;

export function scoreSignalRelevance(signal: Signal, now: Date): number {
  const ageHours = Math.max(0, (now.getTime() - signal.timestamp.getTime()) / 3_600_000);
  const recency = 2 ** (-ageHours / RELEVANCE_HALF_LIFE_HOURS);
  return signal.weight * recency;
}

export interface TopicCount {
  topic: Topic;
  signalCount: number;
  totalWeight: number;
}

export interface RegionTopicBreakdown {
  region: GeoRegion;
  signalCount: number;
  totalWeight: number;
  sentiment: number;
  topics: TopicCount[];
}

export interface TopicSentimentSummary {
  topic: Topic;
  signalCount: number;
  sourceCount: number;
  temperature: number;
}
