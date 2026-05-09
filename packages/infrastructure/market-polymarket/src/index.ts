import type { MarketDataPort, MarketFilter, PriceHistoryRange } from "@atlas/application";
import type { Market, MarketId, PredictionEvent, PriceTick, Trade } from "@atlas/domain";
import type { EventId } from "@atlas/domain";
import { NotImplementedError } from "@atlas/shared";

// Polymarket data sources:
//   Gamma API  — https://gamma-api.polymarket.com  (markets, events, metadata)
//   CLOB API   — https://clob.polymarket.com        (orderbook, trades, prices)

export class PolymarketAdapter implements MarketDataPort {
  async listMarkets(_filter?: MarketFilter): Promise<Market[]> {
    throw new NotImplementedError("PolymarketAdapter.listMarkets");
  }

  async getMarket(_id: MarketId): Promise<Market | null> {
    throw new NotImplementedError("PolymarketAdapter.getMarket");
  }

  async listEvents(_filter?: { category?: string; limit?: number }): Promise<PredictionEvent[]> {
    throw new NotImplementedError("PolymarketAdapter.listEvents");
  }

  async getEvent(_id: EventId): Promise<PredictionEvent | null> {
    throw new NotImplementedError("PolymarketAdapter.getEvent");
  }

  async getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new NotImplementedError("PolymarketAdapter.getPriceHistory");
  }

  async getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new NotImplementedError("PolymarketAdapter.getRecentTrades");
  }
}
