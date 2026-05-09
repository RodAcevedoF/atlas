import type { Market, MarketCategory, MarketId, PredictionEvent, PriceTick, Trade } from "@atlas/domain";
import type { EventId } from "@atlas/domain";

export interface MarketFilter {
  category?: MarketCategory;
  status?: "active" | "closed" | "resolved";
  minVolumeUsd?: number;
  limit?: number;
  offset?: number;
}

export interface PriceHistoryRange {
  from: Date;
  to: Date;
  resolution?: "1m" | "5m" | "1h" | "1d";
}

export interface MarketDataPort {
  listMarkets(filter?: MarketFilter): Promise<Market[]>;
  getMarket(id: MarketId): Promise<Market | null>;

  listEvents(filter?: { category?: MarketCategory; limit?: number }): Promise<PredictionEvent[]>;
  getEvent(id: EventId): Promise<PredictionEvent | null>;

  getPriceHistory(marketId: MarketId, range: PriceHistoryRange): Promise<PriceTick[]>;
  getRecentTrades(marketId: MarketId, limit?: number): Promise<Trade[]>;
}
