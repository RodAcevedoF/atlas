import type {
  Authenticate,
  LoginInput,
  LoginResult,
  LoginUser,
  LogoutUser,
  RegisterInput,
  RegisterUser,
} from "@atlas/application";
import type { PublicUser } from "@atlas/domain";
import type { IAuthService } from "./service.ts";

export class AuthService implements IAuthService {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly loginUser: LoginUser,
    private readonly logoutUser: LogoutUser,
    private readonly authenticateUser: Authenticate,
  ) {}

  register(input: RegisterInput): Promise<LoginResult> {
    return this.registerUser.execute(input);
  }

  login(input: LoginInput): Promise<LoginResult> {
    return this.loginUser.execute(input);
  }

  logout(token: string): Promise<void> {
    return this.logoutUser.execute(token);
  }

  authenticate(token: string): Promise<PublicUser | null> {
    return this.authenticateUser.execute(token);
  }
}
