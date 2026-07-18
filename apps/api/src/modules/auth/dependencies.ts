import type {
  Authenticate,
  AuthenticateWithProvider,
  EmailPort,
  IdentityProviderRegistry,
  LogoutUser,
  PasswordHasherPort,
  RegisterUser,
  ResendVerification,
  SessionPort,
  UserStorePort,
  VerificationConfig,
  VerificationTokenStorePort,
  VerifyEmail,
} from "@atlas/application";
import {
  AuthenticateUseCase,
  AuthenticateWithProviderUseCase,
  LogoutUserUseCase,
  RegisterUserUseCase,
  ResendVerificationUseCase,
  VerifyEmailUseCase,
} from "@atlas/application";

export interface AuthDeps {
  registerUser: RegisterUser;
  authenticateWithProvider: AuthenticateWithProvider;
  logoutUser: LogoutUser;
  authenticate: Authenticate;
  verifyEmail: VerifyEmail;
  resendVerification: ResendVerification;
}

export function makeAuthDependencies(deps: {
  userStore: UserStorePort;
  sessionStore: SessionPort;
  hasher: PasswordHasherPort;
  identityProviders: IdentityProviderRegistry;
  emailPort: EmailPort;
  verificationTokens: VerificationTokenStorePort;
  verificationConfig: VerificationConfig;
}): AuthDeps {
  return {
    registerUser: new RegisterUserUseCase(
      deps.userStore,
      deps.sessionStore,
      deps.hasher,
      deps.verificationTokens,
      deps.emailPort,
      deps.verificationConfig,
    ),
    authenticateWithProvider: new AuthenticateWithProviderUseCase(
      deps.identityProviders,
      deps.userStore,
      deps.sessionStore,
    ),
    logoutUser: new LogoutUserUseCase(deps.sessionStore),
    authenticate: new AuthenticateUseCase(deps.sessionStore, deps.userStore),
    verifyEmail: new VerifyEmailUseCase(deps.verificationTokens, deps.userStore),
    resendVerification: new ResendVerificationUseCase(
      deps.userStore,
      deps.verificationTokens,
      deps.emailPort,
      deps.verificationConfig,
    ),
  };
}
