// outbound ports
export type {
  MarketFilter,
  PriceHistoryRange,
  MarketDataPort,
} from "./markets/outbound/market-data.ts";
export type { MarketStorePort } from "./markets/outbound/market-store.ts";
export type { SignalStorePort } from "./world/outbound/signal-store.ts";
export type { WorldScanReportStorePort } from "./world/outbound/world-scan-report-store.ts";
export type {
  GraphRunInput,
  GraphEventType,
  GraphEvent,
  OrchestrationPort,
} from "./world/outbound/orchestration.ts";
export type { SignalSourceFilter, SignalSourcePort } from "./news/outbound/signal-source.ts";
export type { UserStorePort } from "./auth/outbound/user-store.ts";
export type { SessionPort } from "./auth/outbound/session-store.ts";
export type { PasswordHasherPort } from "./auth/outbound/password-hasher.ts";

// markets
export type {
  IngestMarketsInput,
  IngestMarketsOutput,
  IngestMarkets,
} from "./markets/inbound/ingest-markets.ts";
export { IngestMarketsUseCase } from "./markets/inbound/ingest-markets.ts";
export type {
  ListMarketsInput,
  ListMarketsOutput,
  ListMarkets,
} from "./markets/inbound/list-markets.ts";
export { ListMarketsUseCase } from "./markets/inbound/list-markets.ts";
export type {
  ListEventsInput,
  ListEventsOutput,
  ListEvents,
} from "./markets/inbound/list-events.ts";
export { ListEventsUseCase } from "./markets/inbound/list-events.ts";
export type {
  ListRegionSummariesInput,
  ListRegionSummariesOutput,
  ListRegionSummaries,
} from "./markets/inbound/list-region-summaries.ts";
export { ListRegionSummariesUseCase } from "./markets/inbound/list-region-summaries.ts";
export type {
  RunMarketIntelligenceInput,
  RunMarketIntelligenceOutput,
  RunMarketIntelligence,
} from "./markets/inbound/run-market-intelligence.ts";
export type {
  RunEdgeScanInput,
  RunEdgeScanOutput,
  RunEdgeScan,
} from "./markets/inbound/run-edge-scan.ts";
export type {
  RunDiscrepancyScanInput,
  RunDiscrepancyScanOutput,
  RunDiscrepancyScan,
} from "./markets/inbound/run-discrepancy-scan.ts";

// news
export type {
  IngestNewsInput,
  IngestNewsOutput,
  IngestNews,
} from "./news/inbound/ingest-news.ts";
export { IngestNewsUseCase } from "./news/inbound/ingest-news.ts";

// world
export type {
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  ListWorldTopics,
} from "./world/inbound/list-world-topics.ts";
export { ListWorldTopicsUseCase } from "./world/inbound/list-world-topics.ts";
export type {
  ListWorldEventsInput,
  ListWorldEventsOutput,
  WorldEvent,
  ListWorldEvents,
} from "./world/inbound/list-world-events.ts";
export { ListWorldEventsUseCase } from "./world/inbound/list-world-events.ts";
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
} from "./world/inbound/world-scan.ts";
export { WorldScanUseCase } from "./world/inbound/world-scan-usecase.ts";
export { ListWorldScanReportsUseCase } from "./world/inbound/list-world-scan-reports-usecase.ts";

// auth
export type {
  RegisterInput,
  LoginInput,
  LoginResult,
  RegisterUser,
  LoginUser,
  LogoutUser,
  Authenticate,
} from "./auth/inbound/auth.ts";
export { EmailInUseError, InvalidCredentialsError, normalizeEmail } from "./auth/inbound/auth.ts";
export { SESSION_TTL_MS, issueSession } from "./auth/inbound/issue-session.ts";
export { RegisterUserUseCase } from "./auth/inbound/register-user-usecase.ts";
export { LoginUserUseCase } from "./auth/inbound/login-user-usecase.ts";
export { LogoutUserUseCase } from "./auth/inbound/logout-user-usecase.ts";
export { AuthenticateUseCase } from "./auth/inbound/authenticate-usecase.ts";

// profile
export type {
  ProfileUpdateInput,
  UpdateProfile,
  SaveReport,
  UnsaveReport,
  ListSavedReports,
} from "./profile/inbound/profile.ts";
export { UserNotFoundError } from "./profile/inbound/profile.ts";
export { UpdateProfileUseCase } from "./profile/inbound/update-profile-usecase.ts";
export { SaveReportUseCase } from "./profile/inbound/save-report-usecase.ts";
export { UnsaveReportUseCase } from "./profile/inbound/unsave-report-usecase.ts";
export { ListSavedReportsUseCase } from "./profile/inbound/list-saved-reports-usecase.ts";
