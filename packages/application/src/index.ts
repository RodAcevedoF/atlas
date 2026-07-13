export type {
  MarketFilter,
  PriceHistoryRange,
  MarketDataPort,
} from "./ports/market-data.ts";
export type { MarketStorePort } from "./ports/market-store.ts";
export type { TopTrader, OnChainPort } from "./ports/onchain.ts";
export type {
  GraphRunInput,
  GraphEventType,
  GraphEvent,
  OrchestrationPort,
} from "./ports/orchestration.ts";
export type { ClockPort, IdPort } from "./ports/utilities.ts";
export type { SignalSourceFilter, SignalSourcePort } from "./ports/signal-source.ts";
export type { UserStorePort } from "./ports/user-store.ts";
export type { SessionPort } from "./ports/session-store.ts";
export type { PasswordHasherPort } from "./ports/password-hasher.ts";

// markets
export type {
  IngestMarketsInput,
  IngestMarketsOutput,
  IngestMarkets,
} from "./markets/ingest-markets.ts";
export { IngestMarketsUseCase } from "./markets/ingest-markets.ts";
export type {
  ListMarketsInput,
  ListMarketsOutput,
  ListMarkets,
} from "./markets/list-markets.ts";
export { ListMarketsUseCase } from "./markets/list-markets.ts";
export type {
  ListEventsInput,
  ListEventsOutput,
  ListEvents,
} from "./markets/list-events.ts";
export { ListEventsUseCase } from "./markets/list-events.ts";
export type {
  ListRegionSummariesInput,
  ListRegionSummariesOutput,
  ListRegionSummaries,
} from "./markets/list-region-summaries.ts";
export { ListRegionSummariesUseCase } from "./markets/list-region-summaries.ts";
export type {
  RunMarketIntelligenceInput,
  RunMarketIntelligenceOutput,
  RunMarketIntelligence,
} from "./markets/run-market-intelligence.ts";
export type {
  RunEdgeScanInput,
  RunEdgeScanOutput,
  RunEdgeScan,
} from "./markets/run-edge-scan.ts";
export type {
  RunDiscrepancyScanInput,
  RunDiscrepancyScanOutput,
  RunDiscrepancyScan,
} from "./markets/run-discrepancy-scan.ts";

// news
export type {
  IngestNewsInput,
  IngestNewsOutput,
  IngestNews,
} from "./news/ingest-news.ts";
export { IngestNewsUseCase } from "./news/ingest-news.ts";

// world
export type {
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  ListWorldTopics,
} from "./world/list-world-topics.ts";
export { ListWorldTopicsUseCase } from "./world/list-world-topics.ts";
export type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  WorldEvent,
  ListWorldEvents,
} from "./world/list-world-events.ts";
export { ListWorldEventsUseCase } from "./world/list-world-events.ts";
export type {
  WorldScanInput,
  WorldScanOutput,
  WorldScanReport,
  WorldScanNarrative,
  WorldScanHeader,
  WorldScanDevelopment,
  WorldScanDivergence,
  WorldScanRegionNote,
  WorldScanCoverage,
  WorldScanReportRecord,
  WorldScanReportFilter,
  WorldScan,
  ListWorldScanReports,
} from "./world/world-scan.ts";
export { WorldScanUseCase } from "./world/world-scan-usecase.ts";
export { ListWorldScanReportsUseCase } from "./world/list-world-scan-reports-usecase.ts";

// auth
export type {
  RegisterInput,
  LoginInput,
  LoginResult,
  RegisterUser,
  LoginUser,
  LogoutUser,
  Authenticate,
} from "./auth/auth.ts";
export { EmailInUseError, InvalidCredentialsError, normalizeEmail } from "./auth/auth.ts";
export { SESSION_TTL_MS, issueSession } from "./auth/issue-session.ts";
export { RegisterUserUseCase } from "./auth/register-user-usecase.ts";
export { LoginUserUseCase } from "./auth/login-user-usecase.ts";
export { LogoutUserUseCase } from "./auth/logout-user-usecase.ts";
export { AuthenticateUseCase } from "./auth/authenticate-usecase.ts";

// profile
export type {
  ProfileUpdateInput,
  UpdateProfile,
  SaveReport,
  UnsaveReport,
  ListSavedReports,
} from "./profile/profile.ts";
export { UserNotFoundError } from "./profile/profile.ts";
export { UpdateProfileUseCase } from "./profile/update-profile-usecase.ts";
export { SaveReportUseCase } from "./profile/save-report-usecase.ts";
export { UnsaveReportUseCase } from "./profile/unsave-report-usecase.ts";
export { ListSavedReportsUseCase } from "./profile/list-saved-reports-usecase.ts";
