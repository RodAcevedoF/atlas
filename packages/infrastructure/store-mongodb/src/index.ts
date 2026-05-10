export * from "./client.ts";
export * from "./collections.ts";
export * from "./indexes.ts";
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

export class MongoMarketStore implements MarketStorePort {
  async upsertMarket(_market: Market): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.upsertMarket");
  }

  async findMarket(_id: MarketId): Promise<Market | null> {
    throw new NotImplementedError("MongoMarketStore.findMarket");
  }

  async listMarkets(_filter?: { status?: string; limit?: number }): Promise<Market[]> {
    throw new NotImplementedError("MongoMarketStore.listMarkets");
  }

  async upsertEvent(_event: PredictionEvent): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.upsertEvent");
  }

  async findEvent(_id: EventId): Promise<PredictionEvent | null> {
    throw new NotImplementedError("MongoMarketStore.findEvent");
  }

  async listEvents(_filter?: { limit?: number }): Promise<PredictionEvent[]> {
    throw new NotImplementedError("MongoMarketStore.listEvents");
  }

  async insertPriceTick(_tick: PriceTick): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.insertPriceTick");
  }

  async getPriceHistory(_marketId: MarketId, _from: Date, _to: Date): Promise<PriceTick[]> {
    throw new NotImplementedError("MongoMarketStore.getPriceHistory");
  }

  async insertTrade(_trade: Trade): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.insertTrade");
  }

  async getRecentTrades(_marketId: MarketId, _limit: number): Promise<Trade[]> {
    throw new NotImplementedError("MongoMarketStore.getRecentTrades");
  }

  async saveInsight(_insight: Insight): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.saveInsight");
  }

  async findInsight(_id: string): Promise<Insight | null> {
    throw new NotImplementedError("MongoMarketStore.findInsight");
  }

  async listInsights(_filter: {
    marketId?: MarketId;
    eventId?: EventId;
    kind?: InsightKind;
    limit?: number;
  }): Promise<Insight[]> {
    throw new NotImplementedError("MongoMarketStore.listInsights");
  }

  async saveAnalysisRun(_run: AnalysisRun): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.saveAnalysisRun");
  }

  async updateAnalysisRun(_id: string, _patch: Partial<AnalysisRun>): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.updateAnalysisRun");
  }

  async findAnalysisRun(_id: string): Promise<AnalysisRun | null> {
    throw new NotImplementedError("MongoMarketStore.findAnalysisRun");
  }

  async findWatchlist(_userId: string): Promise<Watchlist | null> {
    throw new NotImplementedError("MongoMarketStore.findWatchlist");
  }

  async saveWatchlist(_watchlist: Watchlist): Promise<void> {
    throw new NotImplementedError("MongoMarketStore.saveWatchlist");
  }
}
