import type { LoginInput, LoginResult, RegisterInput } from "@atlas/application";
import type { PublicUser } from "@atlas/domain";

export interface IAuthService {
  register(input: RegisterInput): Promise<LoginResult>;
  login(input: LoginInput): Promise<LoginResult>;
  logout(token: string): Promise<void>;
  authenticate(token: string): Promise<PublicUser | null>;
}
