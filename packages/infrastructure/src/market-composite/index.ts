import type {
  EventFilter,
  MarketDataPort,
  MarketFilter,
  PriceHistoryRange,
} from "@atlas/application";
import type { EventId, Market, MarketId, PredictionEvent, PriceTick, Trade } from "@atlas/domain";
import { NotImplementedError, capToLimit, fanOutToSources, perSourceLimit } from "@atlas/shared";

export class CompositeMarketDataAdapter implements MarketDataPort {
  constructor(
    private readonly adapters: readonly MarketDataPort[],
    private readonly timeoutMs?: number,
  ) {}

  async listMarkets(filter?: MarketFilter): Promise<Market[]> {
    const sourceFilter = perSourceLimit(filter, this.adapters.length);
    const perSource = await this.fanOut("listMarkets", (adapter) =>
      adapter.listMarkets(sourceFilter),
    );
    return capToLimit(perSource.flat(), filter?.limit);
  }

  async listEvents(filter?: EventFilter): Promise<PredictionEvent[]> {
    const sourceFilter = perSourceLimit(filter, this.adapters.length);
    const perSource = await this.fanOut("listEvents", (adapter) =>
      adapter.listEvents(sourceFilter),
    );
    return capToLimit(perSource.flat(), filter?.limit);
  }

  async getMarket(id: MarketId): Promise<Market | null> {
    const perSource = await this.fanOut("getMarket", (adapter) => adapter.getMarket(id));
    return perSource.find((market) => market !== null) ?? null;
  }

  async getEvent(id: EventId): Promise<PredictionEvent | null> {
    const perSource = await this.fanOut("getEvent", (adapter) => adapter.getEvent(id));
    return perSource.find((event) => event !== null) ?? null;
  }

  getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new NotImplementedError("CompositeMarketDataAdapter.getPriceHistory");
  }

  getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new NotImplementedError("CompositeMarketDataAdapter.getRecentTrades");
  }

  private fanOut<T>(method: string, run: (adapter: MarketDataPort) => Promise<T>): Promise<T[]> {
    return fanOutToSources(
      `market-composite.${method}`,
      this.adapters.map((adapter) => ({
        source: adapter.constructor.name,
        run: () => run(adapter),
      })),
      this.timeoutMs,
    );
  }
}
