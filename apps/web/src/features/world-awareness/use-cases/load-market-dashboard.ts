import type {
  EventRecord,
  ListEventsInput,
  ListMarketsInput,
  ListRegionSummariesInput,
  ListWorldEventsInput,
  ListWorldTopicsInput,
  MarketCategory,
  MarketRecord,
  MarketRepository,
  RegionSummaryRecord,
  RegionTopicBreakdownRecord,
  Topic,
  WorldEventRecord,
} from "../repositories/market-repository.ts";

export interface DashboardCategorySummary {
  category: MarketCategory;
  count: number;
  volumeUsd: number;
}

export interface MarketDashboardData {
  markets: MarketRecord[];
  events: EventRecord[];
  regionSummary: RegionSummaryRecord[];
  worldTopics: RegionTopicBreakdownRecord[];
  worldEvents: WorldEventRecord[];
  activeMarketCount: number;
  totalVolumeUsd: number;
  totalLiquidityUsd: number;
  worldSignals: number;
  activeTopics: number;
  regionsInFocus: number;
  categorySummary: DashboardCategorySummary[];
}

export interface LoadMarketDashboardInput {
  markets?: ListMarketsInput;
  events?: ListEventsInput;
  regionSummary?: ListRegionSummariesInput;
  worldTopics?: ListWorldTopicsInput;
  worldEvents?: ListWorldEventsInput;
}

function countActiveTopics(worldTopics: RegionTopicBreakdownRecord[]): number {
  const topics = new Set<Topic>();
  for (const region of worldTopics) {
    for (const topic of region.topics) {
      if (topic.signalCount > 0) topics.add(topic.topic);
    }
  }
  return topics.size;
}

function countActiveRegions(worldTopics: RegionTopicBreakdownRecord[]): number {
  return worldTopics.filter((region) => region.signalCount > 0).length;
}

export interface LoadMarketDashboardDeps {
  marketRepository: MarketRepository;
}

export type LoadMarketDashboard = (
  input?: LoadMarketDashboardInput,
) => Promise<MarketDashboardData>;

export function makeLoadMarketDashboard({
  marketRepository,
}: LoadMarketDashboardDeps): LoadMarketDashboard {
  return async (input = {}) => {
    const [markets, events, regionSummary, worldTopics, worldEvents] = await Promise.all([
      marketRepository.listMarkets(input.markets),
      marketRepository.listEvents(input.events),
      marketRepository.listRegionSummaries(input.regionSummary),
      marketRepository.listWorldTopics(input.worldTopics),
      marketRepository.listWorldEvents(input.worldEvents),
    ]);

    const categoryBuckets = new Map<MarketCategory, DashboardCategorySummary>();
    for (const market of markets) {
      const current = categoryBuckets.get(market.category) ?? {
        category: market.category,
        count: 0,
        volumeUsd: 0,
      };
      current.count += 1;
      current.volumeUsd += market.volumeUsd;
      categoryBuckets.set(market.category, current);
    }

    return {
      markets,
      events,
      regionSummary,
      worldTopics,
      worldEvents,
      activeMarketCount: markets.filter((market) => market.status === "active").length,
      totalVolumeUsd: markets.reduce((sum, market) => sum + market.volumeUsd, 0),
      totalLiquidityUsd: markets.reduce((sum, market) => sum + market.liquidityUsd, 0),
      worldSignals: worldTopics.reduce((sum, region) => sum + region.signalCount, 0),
      activeTopics: countActiveTopics(worldTopics),
      regionsInFocus: countActiveRegions(worldTopics),
      categorySummary: [...categoryBuckets.values()].sort(
        (left, right) => right.volumeUsd - left.volumeUsd,
      ),
    };
  };
}
