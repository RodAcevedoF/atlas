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

/**
 * A normalized unit of world attention. Markets, news, and social all reduce to
 * Signals; the world map and `/world/*` APIs read only Signals. `weight` is an
 * attention proxy (markets: USD volume); `ref` points back to the source item.
 */
export interface Signal {
  id: SignalId;
  source: SignalSource;
  topic: Topic;
  primaryRegion: GeoRegion;
  regions: GeoRegion[];
  weight: number;
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
    title: market.title,
    ref: market.slug,
    timestamp: market.updatedAt,
    createdAt: market.createdAt,
  };
}

export interface TopicCount {
  topic: Topic;
  signalCount: number;
  totalWeight: number;
}

/**
 * Per-region topic breakdown — the core world-map metric. `topics` is ranked by
 * `signalCount` descending (one item = one unit of attention, source-agnostic).
 */
export interface RegionTopicBreakdown {
  region: GeoRegion;
  signalCount: number;
  totalWeight: number;
  topics: TopicCount[];
}
