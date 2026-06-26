import type {
  AnalysisRun,
  EventId,
  GeoRegion,
  Insight,
  InsightKind,
  Market,
  MarketCategory,
  MarketId,
  MarketStatus,
  PredictionEvent,
  PriceTick,
  RegionSummary,
  RegionTopicBreakdown,
  Signal,
  SignalSource,
  Topic,
  Trade,
} from "@atlas/domain";

export interface MarketStorePort {
  upsertMarket(market: Market): Promise<void>;
  findMarket(id: MarketId): Promise<Market | null>;
  listMarkets(filter?: {
    status?: MarketStatus;
    category?: MarketCategory;
    limit?: number;
  }): Promise<Market[]>;

  upsertEvent(event: PredictionEvent): Promise<void>;
  findEvent(id: EventId): Promise<PredictionEvent | null>;
  listEvents(filter?: { limit?: number }): Promise<PredictionEvent[]>;
  listRegionSummaries(filter?: {
    status?: MarketStatus;
    category?: MarketCategory;
    limit?: number;
    region?: GeoRegion;
  }): Promise<RegionSummary[]>;

  upsertSignals(signals: Signal[]): Promise<void>;
  listRegionTopicBreakdowns(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    limit?: number;
  }): Promise<RegionTopicBreakdown[]>;

  insertPriceTick(tick: PriceTick): Promise<void>;
  getPriceHistory(marketId: MarketId, from: Date, to: Date): Promise<PriceTick[]>;

  insertTrade(trade: Trade): Promise<void>;
  getRecentTrades(marketId: MarketId, limit: number): Promise<Trade[]>;

  saveInsight(insight: Insight): Promise<void>;
  findInsight(id: string): Promise<Insight | null>;
  listInsights(filter: {
    marketId?: MarketId;
    eventId?: EventId;
    kind?: InsightKind;
    limit?: number;
  }): Promise<Insight[]>;

  saveAnalysisRun(run: AnalysisRun): Promise<void>;
  updateAnalysisRun(id: string, patch: Partial<AnalysisRun>): Promise<void>;
  findAnalysisRun(id: string): Promise<AnalysisRun | null>;
}
