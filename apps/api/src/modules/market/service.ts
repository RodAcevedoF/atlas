import type { IngestMarketsInput, IngestMarketsOutput, MarketDataPort, MarketStorePort } from "@atlas/application";
import { IngestMarketsUseCase } from "@atlas/application";

export interface IMarketService {
  ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput>;
}

class MarketService implements IMarketService {
  constructor(private readonly ingest: IngestMarketsUseCase) {}

  ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput> {
    return this.ingest.execute(input);
  }
}

export function makeDependencies(deps: {
  marketData: MarketDataPort;
  store: MarketStorePort;
}): { service: IMarketService } {
  return { service: new MarketService(new IngestMarketsUseCase(deps.marketData, deps.store)) };
}
