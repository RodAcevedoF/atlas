import type { PasswordHasherPort, SessionPort, UserStorePort } from "@atlas/application";
import {
  AuthenticateUseCase,
  LoginUserUseCase,
  LogoutUserUseCase,
  RegisterUserUseCase,
} from "@atlas/application";
import { AuthService } from "./auth-service.ts";
import type { IAuthService } from "./service.ts";

export function makeAuthDependencies(deps: {
  userStore: UserStorePort;
  sessionStore: SessionPort;
  hasher: PasswordHasherPort;
}): { service: IAuthService } {
  return {
    service: new AuthService(
      new RegisterUserUseCase(deps.userStore, deps.sessionStore, deps.hasher),
      new LoginUserUseCase(deps.userStore, deps.sessionStore, deps.hasher),
      new LogoutUserUseCase(deps.sessionStore),
      new AuthenticateUseCase(deps.sessionStore, deps.userStore),
    ),
  };
}
