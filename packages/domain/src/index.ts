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

export type {
  PriceTick,
  MarketSnapshot,
  MarketMover,
  TradeSide,
  Trade,
} from "./entities/activity.ts";
export { marketToSnapshot, topMarketMovers } from "./entities/activity.ts";

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
  scoreSignalRelevance,
} from "./entities/signal.ts";
export { SIGNAL_SOURCES, TOPICS } from "./entities/signal.ts";

export { deriveRegionsFromText, deriveTopicFromText } from "./entities/geography.ts";

export type {
  UserId,
  UserProfile,
  IdentityProvider,
  UserIdentity,
  User,
  PublicUser,
} from "./entities/user.ts";
export { makeUserId, emptyProfile, toPublicUser, findIdentity } from "./entities/user.ts";

export type { SessionToken, Session } from "./entities/session.ts";
export { makeSessionToken } from "./entities/session.ts";
