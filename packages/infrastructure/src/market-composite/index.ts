import type { MarketDataPort, MarketFilter, PriceHistoryRange } from "@atlas/application";
import type {
  EventId,
  Market,
  MarketCategory,
  MarketId,
  PredictionEvent,
  PriceTick,
  Trade,
} from "@atlas/domain";
import { NotImplementedError } from "@atlas/shared";

export class CompositeMarketDataAdapter implements MarketDataPort {
  constructor(private readonly adapters: readonly MarketDataPort[]) {}

  async listMarkets(filter?: MarketFilter): Promise<Market[]> {
    const perAdapter = await Promise.all(
      this.adapters.map((adapter) => adapter.listMarkets(filter)),
    );
    return perAdapter.flat();
  }

  async listEvents(filter?: {
    category?: MarketCategory;
    limit?: number;
  }): Promise<PredictionEvent[]> {
    const perAdapter = await Promise.all(
      this.adapters.map((adapter) => adapter.listEvents(filter)),
    );
    return perAdapter.flat();
  }

  async getMarket(id: MarketId): Promise<Market | null> {
    const perAdapter = await Promise.all(this.adapters.map((adapter) => adapter.getMarket(id)));
    return perAdapter.find((market) => market !== null) ?? null;
  }

  async getEvent(id: EventId): Promise<PredictionEvent | null> {
    const perAdapter = await Promise.all(this.adapters.map((adapter) => adapter.getEvent(id)));
    return perAdapter.find((event) => event !== null) ?? null;
  }

  getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new NotImplementedError("CompositeMarketDataAdapter.getPriceHistory");
  }

  getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new NotImplementedError("CompositeMarketDataAdapter.getRecentTrades");
  }
}
