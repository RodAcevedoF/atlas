export type {
  VectorDoc,
  SearchResult,
  VectorStorePort,
} from "./ports/vector-store.ts";
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

export type {
  IngestMarketsInput,
  IngestMarketsOutput,
  IngestMarkets,
} from "./use-cases/ingest-markets.ts";
export type {
  IngestNewsInput,
  IngestNewsOutput,
  IngestNews,
} from "./use-cases/ingest-news.ts";
export { IngestNewsUseCase } from "./use-cases/ingest-news-usecase.ts";
export { IngestMarketsUseCase } from "./use-cases/ingest-markets-usecase.ts";
export type {
  ListMarketsInput,
  ListMarketsOutput,
  ListMarkets,
} from "./use-cases/list-markets.ts";
export { ListMarketsUseCase } from "./use-cases/list-markets-usecase.ts";
export type {
  ListEventsInput,
  ListEventsOutput,
  ListEvents,
} from "./use-cases/list-events.ts";
export { ListEventsUseCase } from "./use-cases/list-events-usecase.ts";
export type {
  ListRegionSummariesInput,
  ListRegionSummariesOutput,
  ListRegionSummaries,
} from "./use-cases/list-region-summaries.ts";
export { ListRegionSummariesUseCase } from "./use-cases/list-region-summaries-usecase.ts";
export type {
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  ListWorldTopics,
} from "./use-cases/list-world-topics.ts";
export { ListWorldTopicsUseCase } from "./use-cases/list-world-topics-usecase.ts";
export type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  WorldEvent,
  ListWorldEvents,
} from "./use-cases/list-world-events.ts";
export { ListWorldEventsUseCase } from "./use-cases/list-world-events-usecase.ts";
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
} from "./use-cases/world-scan.ts";
export { WorldScanUseCase } from "./use-cases/world-scan-usecase.ts";
export { ListWorldScanReportsUseCase } from "./use-cases/list-world-scan-reports-usecase.ts";
export type {
  RunMarketIntelligenceInput,
  RunMarketIntelligenceOutput,
  RunMarketIntelligence,
} from "./use-cases/run-market-intelligence.ts";
export type {
  RunEdgeScanInput,
  RunEdgeScanOutput,
  RunEdgeScan,
} from "./use-cases/run-edge-scan.ts";
export type {
  RunDiscrepancyScanInput,
  RunDiscrepancyScanOutput,
  RunDiscrepancyScan,
} from "./use-cases/run-discrepancy-scan.ts";

export type {
  RegisterInput,
  LoginInput,
  LoginResult,
  RegisterUser,
  LoginUser,
  LogoutUser,
  Authenticate,
} from "./use-cases/auth.ts";
export { EmailInUseError, InvalidCredentialsError, normalizeEmail } from "./use-cases/auth.ts";
export { SESSION_TTL_MS, issueSession } from "./use-cases/issue-session.ts";
export { RegisterUserUseCase } from "./use-cases/register-user-usecase.ts";
export { LoginUserUseCase } from "./use-cases/login-user-usecase.ts";
export { LogoutUserUseCase } from "./use-cases/logout-user-usecase.ts";
export { AuthenticateUseCase } from "./use-cases/authenticate-usecase.ts";

export type {
  ProfileUpdateInput,
  UpdateProfile,
  SaveReport,
  UnsaveReport,
  ListSavedReports,
} from "./use-cases/profile.ts";
export { UserNotFoundError } from "./use-cases/profile.ts";
export { UpdateProfileUseCase } from "./use-cases/update-profile-usecase.ts";
export { SaveReportUseCase } from "./use-cases/save-report-usecase.ts";
export { UnsaveReportUseCase } from "./use-cases/unsave-report-usecase.ts";
export { ListSavedReportsUseCase } from "./use-cases/list-saved-reports-usecase.ts";
