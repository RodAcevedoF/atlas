// outbound ports
export type { MigrationLedgerPort } from "./migrations/outbound/migration-ledger.ts";
export type {
  ClaimInquiryRunInput,
  CompleteInquiryRunInput,
  InquiryRunPage,
  InquiryRunSummaryCounts,
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
export type {
  GetInquiryBudget,
  GetInquiryBudgetInput,
  InquiryBudget,
} from "./inquiry/inbound/get-inquiry-budget.ts";
export { GetInquiryBudgetUseCase } from "./inquiry/inbound/get-inquiry-budget.ts";
export type { GetInquiryRun } from "./inquiry/inbound/get-inquiry-run.ts";
export { GetInquiryRunUseCase } from "./inquiry/inbound/get-inquiry-run.ts";
export type {
  DeleteInquiryRun,
  DeleteInquiryRunOutcome,
  InquiryActor,
} from "./inquiry/inbound/delete-inquiry-run.ts";
export { DeleteInquiryRunUseCase } from "./inquiry/inbound/delete-inquiry-run.ts";
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
  ChangeUserRole,
  ChangeUserRoleInput,
} from "./auth/inbound/auth.ts";
export {
  EmailInUseError,
  InvalidCredentialsError,
  UnknownProviderError,
  InvalidVerificationTokenError,
  RoleChangeForbiddenError,
  UserNotFoundError,
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
export { ChangeUserRoleUseCase } from "./auth/inbound/change-user-role-usecase.ts";

export type {
  AdminAnalytics,
  AdminInquiryAnalytics,
  AdminUserAnalytics,
  GetAdminAnalytics,
} from "./admin/inbound/get-admin-analytics.ts";
export { GetAdminAnalyticsUseCase } from "./admin/inbound/get-admin-analytics.ts";

// profile
export type { ProfileUpdateInput, UpdateProfile } from "./profile/inbound/profile.ts";
export { UpdateProfileUseCase } from "./profile/inbound/update-profile-usecase.ts";
export type {
  DeleteProfileImage,
  GetProfileImage,
  UploadProfileImage,
  UploadProfileImageInput,
} from "./profile/inbound/profile-image.ts";
export {
  DeleteProfileImageUseCase,
  GetProfileImageUseCase,
  InvalidProfileImageError,
  PROFILE_IMAGE_MAX_BYTES,
  ProfileImageTooLargeError,
  UploadProfileImageUseCase,
} from "./profile/inbound/profile-image.ts";
export type {
  ProfileImage,
  ProfileImageMediaType,
  ProfileImageStorePort,
} from "./profile/outbound/profile-image-store.ts";
export { PROFILE_IMAGE_MEDIA_TYPES } from "./profile/outbound/profile-image-store.ts";
