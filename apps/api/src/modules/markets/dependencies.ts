import type {
  IngestMarkets,
  ListEvents,
  ListMarkets,
  ListRegionSummaries,
  MarketDataPort,
  MarketStorePort,
  SignalStorePort,
} from "@atlas/application";
import {
  IngestMarketsUseCase,
  ListEventsUseCase,
  ListMarketsUseCase,
  ListRegionSummariesUseCase,
} from "@atlas/application";

export interface MarketsDeps {
  ingestMarkets: IngestMarkets;
  listMarkets: ListMarkets;
  listEvents: ListEvents;
  listRegionSummaries: ListRegionSummaries;
}

export function makeMarketsDependencies(deps: {
  marketData: MarketDataPort;
  store: MarketStorePort & SignalStorePort;
}): MarketsDeps {
  return {
    ingestMarkets: new IngestMarketsUseCase(deps.marketData, deps.store),
    listMarkets: new ListMarketsUseCase(deps.store),
    listEvents: new ListEventsUseCase(deps.store),
    listRegionSummaries: new ListRegionSummariesUseCase(deps.store),
  };
}
