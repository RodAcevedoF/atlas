import type { MarketStorePort } from "@atlas/application";
import type {
  AnalysisRun,
  EventId,
  Insight,
  InsightKind,
  Market,
  MarketId,
  PredictionEvent,
  PriceTick,
  Trade,
  Watchlist,
} from "@atlas/domain";
import { NotImplementedError } from "@atlas/shared";

export class DrizzleMarketStore implements MarketStorePort {
  async upsertMarket(_market: Market): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.upsertMarket");
  }

  async findMarket(_id: MarketId): Promise<Market | null> {
    throw new NotImplementedError("DrizzleMarketStore.findMarket");
  }

  async listMarkets(_filter?: { status?: string; limit?: number }): Promise<Market[]> {
    throw new NotImplementedError("DrizzleMarketStore.listMarkets");
  }

  async upsertEvent(_event: PredictionEvent): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.upsertEvent");
  }

  async findEvent(_id: EventId): Promise<PredictionEvent | null> {
    throw new NotImplementedError("DrizzleMarketStore.findEvent");
  }

  async listEvents(_filter?: { limit?: number }): Promise<PredictionEvent[]> {
    throw new NotImplementedError("DrizzleMarketStore.listEvents");
  }

  async insertPriceTick(_tick: PriceTick): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.insertPriceTick");
  }

  async getPriceHistory(_marketId: MarketId, _from: Date, _to: Date): Promise<PriceTick[]> {
    throw new NotImplementedError("DrizzleMarketStore.getPriceHistory");
  }

  async insertTrade(_trade: Trade): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.insertTrade");
  }

  async getRecentTrades(_marketId: MarketId, _limit: number): Promise<Trade[]> {
    throw new NotImplementedError("DrizzleMarketStore.getRecentTrades");
  }

  async saveInsight(_insight: Insight): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.saveInsight");
  }

  async findInsight(_id: string): Promise<Insight | null> {
    throw new NotImplementedError("DrizzleMarketStore.findInsight");
  }

  async listInsights(_filter: {
    marketId?: MarketId;
    eventId?: EventId;
    kind?: InsightKind;
    limit?: number;
  }): Promise<Insight[]> {
    throw new NotImplementedError("DrizzleMarketStore.listInsights");
  }

  async saveAnalysisRun(_run: AnalysisRun): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.saveAnalysisRun");
  }

  async updateAnalysisRun(_id: string, _patch: Partial<AnalysisRun>): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.updateAnalysisRun");
  }

  async findAnalysisRun(_id: string): Promise<AnalysisRun | null> {
    throw new NotImplementedError("DrizzleMarketStore.findAnalysisRun");
  }

  async findWatchlist(_userId: string): Promise<Watchlist | null> {
    throw new NotImplementedError("DrizzleMarketStore.findWatchlist");
  }

  async saveWatchlist(_watchlist: Watchlist): Promise<void> {
    throw new NotImplementedError("DrizzleMarketStore.saveWatchlist");
  }
}
