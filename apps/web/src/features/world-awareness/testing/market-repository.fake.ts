import type {
  MarketRecord,
  MarketRepository,
  RegionTopicBreakdownRecord,
  WorldEventRecord,
} from "../repositories/market-repository.ts";

export interface MarketRepositorySeed {
  markets?: MarketRecord[];
  worldTopics?: RegionTopicBreakdownRecord[];
  worldEvents?: WorldEventRecord[];
}

function outsideDashboardReadPath(method: string): never {
  throw new Error(`market-repository.fake: ${method} is outside the dashboard read path`);
}

export function inMemoryMarketRepository(seed: MarketRepositorySeed = {}): MarketRepository {
  const { markets = [], worldTopics = [], worldEvents = [] } = seed;

  return {
    listMarkets(input = {}) {
      return Promise.resolve(
        markets.filter((market) => input.status === undefined || market.status === input.status),
      );
    },
    listWorldEvents(input = {}) {
      return Promise.resolve(
        worldEvents.filter((event) => input.topic === undefined || event.topic === input.topic),
      );
    },
    listWorldTopics: () => Promise.resolve(worldTopics),
    listEvents: () => Promise.resolve([]),
    listRegionSummaries: () => Promise.resolve([]),
    listWorldSnapshots: () => outsideDashboardReadPath("listWorldSnapshots"),
    ingestMarkets: () => outsideDashboardReadPath("ingestMarkets"),
    ingestNews: () => outsideDashboardReadPath("ingestNews"),
    runWorldScan: () => outsideDashboardReadPath("runWorldScan"),
    listWorldScanReports: () => outsideDashboardReadPath("listWorldScanReports"),
  };
}
