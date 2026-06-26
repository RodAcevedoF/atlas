export type {
  MarketId,
  EventId,
  OutcomeId,
  MarketStatus,
  MarketCategory,
  GeoRegion,
  RegionSummary,
  Outcome,
  Market,
  PredictionEvent,
} from "./entities/market.ts";
export { makeMarketId, makeEventId, makeOutcomeId } from "./entities/market.ts";
export {
  MARKET_STATUSES,
  MARKET_CATEGORIES,
  GEO_REGIONS,
} from "./entities/market.ts";

export type { PriceTick, TradeSide, Trade } from "./entities/activity.ts";

export type {
  InsightKind,
  EdgeSignal,
  DiscrepancySignal,
  Insight,
} from "./entities/insight.ts";

export type {
  AnalysisRunStatus,
  AnalysisRun,
} from "./entities/analysis-run.ts";

export type {
  SignalId,
  SignalSource,
  Topic,
  Signal,
  TopicCount,
  RegionTopicBreakdown,
} from "./entities/signal.ts";
export {
  makeSignalId,
  marketCategoryToTopic,
  marketToSignal,
} from "./entities/signal.ts";
export { SIGNAL_SOURCES, TOPICS } from "./entities/signal.ts";

export { deriveRegionsFromText, deriveTopicFromText } from "./entities/geography.ts";
