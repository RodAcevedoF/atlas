// outbound ports
export type { MigrationLedgerPort } from "./migrations/outbound/migration-ledger.ts";
export type {
  ClaimInquiryRunInput,
  CompleteInquiryRunInput,
  InquiryRunPage,
  InquiryRunStorePort,
} from "./inquiry/outbound/inquiry-run-store.ts";
export { INQUIRY_MAX_ATTEMPTS } from "./inquiry/outbound/inquiry-run-store.ts";
export type {
  GraphRunInput,
  GraphEventType,
  GraphEvent,
  OrchestrationPort,
} from "./world/outbound/orchestration.ts";
export { GraphUnavailableError } from "./world/outbound/orchestration.ts";
export type { UserStorePort } from "./auth/outbound/user-store.ts";
export type { SessionPort } from "./auth/outbound/session-store.ts";
export type { PasswordHasherPort } from "./auth/outbound/password-hasher.ts";
export type {
  ProviderIdentity,
  IdentityProviderPort,
  IdentityProviderRegistry,
} from "./auth/outbound/identity-provider.ts";
export type { EmailMessage, EmailPort } from "./auth/outbound/email.ts";
export type { VerificationTokenStorePort } from "./auth/outbound/verification-token-store.ts";

// inquiry
export type {
  ExecuteInquiryRun,
  ExecuteInquiryRunOutput,
} from "./inquiry/inbound/execute-inquiry-run.ts";
export { ExecuteInquiryRunUseCase } from "./inquiry/inbound/execute-inquiry-run.ts";
export type {
  RequestInquiryRun,
  RequestInquiryRunInput,
  RequestInquiryRunOutput,
} from "./inquiry/inbound/request-inquiry-run.ts";
export {
  InvalidInquiryQuestionError,
  RequestInquiryRunUseCase,
  InquiryDailyCapReachedError,
} from "./inquiry/inbound/request-inquiry-run.ts";
export type { GetInquiryRun } from "./inquiry/inbound/get-inquiry-run.ts";
export { GetInquiryRunUseCase } from "./inquiry/inbound/get-inquiry-run.ts";
export type {
  ListInquiryRuns,
  InquiryRunFilter,
} from "./inquiry/inbound/list-inquiry-runs.ts";
export { ListInquiryRunsUseCase } from "./inquiry/inbound/list-inquiry-runs.ts";

// migrations
export type {
  MigrationContext,
  Migration,
  MigrationRun,
  RunMigrationsInput,
  RunMigrationsOutput,
  RunMigrations,
} from "./migrations/inbound/run-migrations.ts";
export { RunMigrationsUseCase } from "./migrations/inbound/run-migrations.ts";

// auth
export type {
  RegisterInput,
  LoginInput,
  LoginResult,
  RegisterUser,
  AuthenticateWithProvider,
  AuthenticateWithProviderInput,
  LogoutUser,
  Authenticate,
  VerifyEmail,
  ResendVerification,
} from "./auth/inbound/auth.ts";
export {
  EmailInUseError,
  InvalidCredentialsError,
  UnknownProviderError,
  InvalidVerificationTokenError,
  normalizeEmail,
} from "./auth/inbound/auth.ts";
export { SESSION_TTL_MS, issueSession } from "./auth/inbound/issue-session.ts";
export type { VerificationConfig } from "./auth/inbound/verification.ts";
export { VERIFICATION_TTL_MS, issueVerification } from "./auth/inbound/verification.ts";
export { RegisterUserUseCase } from "./auth/inbound/register-user-usecase.ts";
export { AuthenticateWithProviderUseCase } from "./auth/inbound/authenticate-with-provider-usecase.ts";
export { LogoutUserUseCase } from "./auth/inbound/logout-user-usecase.ts";
export { AuthenticateUseCase } from "./auth/inbound/authenticate-usecase.ts";
export { VerifyEmailUseCase } from "./auth/inbound/verify-email-usecase.ts";
export { ResendVerificationUseCase } from "./auth/inbound/resend-verification-usecase.ts";

// profile
export type { ProfileUpdateInput, UpdateProfile } from "./profile/inbound/profile.ts";
export { UserNotFoundError } from "./profile/inbound/profile.ts";
export { UpdateProfileUseCase } from "./profile/inbound/update-profile-usecase.ts";
