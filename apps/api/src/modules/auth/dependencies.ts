import type {
  Authenticate,
  LoginUser,
  LogoutUser,
  PasswordHasherPort,
  RegisterUser,
  SessionPort,
  UserStorePort,
} from "@atlas/application";
import {
  AuthenticateUseCase,
  LoginUserUseCase,
  LogoutUserUseCase,
  RegisterUserUseCase,
} from "@atlas/application";

export interface AuthDeps {
  registerUser: RegisterUser;
  loginUser: LoginUser;
  logoutUser: LogoutUser;
  authenticate: Authenticate;
}

export function makeAuthDependencies(deps: {
  userStore: UserStorePort;
  sessionStore: SessionPort;
  hasher: PasswordHasherPort;
}): AuthDeps {
  return {
    registerUser: new RegisterUserUseCase(deps.userStore, deps.sessionStore, deps.hasher),
    loginUser: new LoginUserUseCase(deps.userStore, deps.sessionStore, deps.hasher),
    logoutUser: new LogoutUserUseCase(deps.sessionStore),
    authenticate: new AuthenticateUseCase(deps.sessionStore, deps.userStore),
  };
}
