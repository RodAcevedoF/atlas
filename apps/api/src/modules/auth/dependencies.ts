import type {
  Authenticate,
  AuthenticateWithProvider,
  IdentityProviderRegistry,
  LogoutUser,
  PasswordHasherPort,
  RegisterUser,
  SessionPort,
  UserStorePort,
} from "@atlas/application";
import {
  AuthenticateUseCase,
  AuthenticateWithProviderUseCase,
  LogoutUserUseCase,
  RegisterUserUseCase,
} from "@atlas/application";

export interface AuthDeps {
  registerUser: RegisterUser;
  authenticateWithProvider: AuthenticateWithProvider;
  logoutUser: LogoutUser;
  authenticate: Authenticate;
}

export function makeAuthDependencies(deps: {
  userStore: UserStorePort;
  sessionStore: SessionPort;
  hasher: PasswordHasherPort;
  identityProviders: IdentityProviderRegistry;
}): AuthDeps {
  return {
    registerUser: new RegisterUserUseCase(deps.userStore, deps.sessionStore, deps.hasher),
    authenticateWithProvider: new AuthenticateWithProviderUseCase(
      deps.identityProviders,
      deps.userStore,
      deps.sessionStore,
    ),
    logoutUser: new LogoutUserUseCase(deps.sessionStore),
    authenticate: new AuthenticateUseCase(deps.sessionStore, deps.userStore),
  };
}
