import { marketCategoryToTopic } from "@atlas/domain";
import type {
  GeoRegion,
  MarketRecord,
  Topic,
  WorldEventRecord,
} from "../repositories/market-repository.ts";

// Attention (news) vs expectation (markets) for one region, optionally scoped to a topic.
// The LLM-free, always-on version of the world scan's divergence idea: surface the top of
// each stream side by side so the disagreement (or agreement) is visible at a glance.

export type CrossStance = "both" | "attention-only" | "expectation-only" | "quiet";

export interface RegionCross {
  news: WorldEventRecord[];
  markets: MarketRecord[];
  stance: CrossStance;
}

const TOP_N = 3;

function stanceFor(newsCount: number, marketCount: number): CrossStance {
  if (newsCount > 0 && marketCount > 0) return "both";
  if (newsCount > 0) return "attention-only";
  if (marketCount > 0) return "expectation-only";
  return "quiet";
}

// The set of "region:topic" pairs that have a market — used to flag news headlines the
// market corroborates (attention that expectation also tracks).
export function marketCoverageKeys(markets: MarketRecord[]): Set<string> {
  return new Set(
    markets.map((market) => `${market.primaryRegion}:${marketCategoryToTopic(market.category)}`),
  );
}

export function eventCoverageKey(region: GeoRegion, topic: Topic): string {
  return `${region}:${topic}`;
}

export function deriveRegionCross(
  region: GeoRegion,
  topic: Topic | "",
  markets: MarketRecord[],
  events: WorldEventRecord[],
): RegionCross {
  const news = events
    .filter(
      (event) =>
        event.source === "news" &&
        event.primaryRegion === region &&
        (topic === "" || event.topic === topic),
    )
    .sort(
      (left, right) => right.weight - left.weight || right.timestamp.localeCompare(left.timestamp),
    )
    .slice(0, TOP_N);

  const regionMarkets = markets
    .filter(
      (market) =>
        market.primaryRegion === region &&
        (topic === "" || marketCategoryToTopic(market.category) === topic),
    )
    .sort((left, right) => right.volumeUsd - left.volumeUsd)
    .slice(0, TOP_N);

  return { news, markets: regionMarkets, stance: stanceFor(news.length, regionMarkets.length) };
}
