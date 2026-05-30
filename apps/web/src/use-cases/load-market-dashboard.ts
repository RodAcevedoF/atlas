import type {
  EventRecord,
  ListEventsInput,
  ListMarketsInput,
  MarketCategory,
  MarketRecord,
  MarketRepository,
} from "../repositories/market-repository.ts";

export interface DashboardCategorySummary {
  category: MarketCategory;
  count: number;
  volumeUsd: number;
}

export interface MarketDashboardData {
  markets: MarketRecord[];
  events: EventRecord[];
  activeMarketCount: number;
  totalVolumeUsd: number;
  totalLiquidityUsd: number;
  categorySummary: DashboardCategorySummary[];
}

export interface LoadMarketDashboardInput {
  markets?: ListMarketsInput;
  events?: ListEventsInput;
}

export async function loadMarketDashboard(
  repository: MarketRepository,
  input: LoadMarketDashboardInput = {},
): Promise<MarketDashboardData> {
  const [markets, events] = await Promise.all([
    repository.listMarkets(input.markets),
    repository.listEvents(input.events),
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
    activeMarketCount: markets.filter((market) => market.status === "active").length,
    totalVolumeUsd: markets.reduce((sum, market) => sum + market.volumeUsd, 0),
    totalLiquidityUsd: markets.reduce((sum, market) => sum + market.liquidityUsd, 0),
    categorySummary: [...categoryBuckets.values()].sort((left, right) => right.volumeUsd - left.volumeUsd),
  };
}