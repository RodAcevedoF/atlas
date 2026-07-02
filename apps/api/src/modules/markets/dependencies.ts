import type { MarketDataPort, MarketStorePort } from "@atlas/application";
import {
  IngestMarketsUseCase,
  ListEventsUseCase,
  ListMarketsUseCase,
  ListRegionSummariesUseCase,
} from "@atlas/application";
import { MarketsService } from "./markets-service.ts";
import type { IMarketsService } from "./service.ts";

export function makeMarketsDependencies(deps: {
  marketData: MarketDataPort;
  store: MarketStorePort;
}): { service: IMarketsService } {
  return {
    service: new MarketsService(
      new IngestMarketsUseCase(deps.marketData, deps.store),
      new ListMarketsUseCase(deps.store),
      new ListEventsUseCase(deps.store),
      new ListRegionSummariesUseCase(deps.store),
    ),
  };
}
