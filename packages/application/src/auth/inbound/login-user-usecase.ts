import { toPublicUser } from "@atlas/domain";
import type { PasswordHasherPort } from "../outbound/password-hasher.ts";
import type { SessionPort } from "../outbound/session-store.ts";
import type { UserStorePort } from "../outbound/user-store.ts";
import type { LoginInput, LoginResult, LoginUser } from "./auth.ts";
import { InvalidCredentialsError, normalizeEmail } from "./auth.ts";
import { issueSession } from "./issue-session.ts";

export class LoginUserUseCase implements LoginUser {
  constructor(
    private readonly users: UserStorePort,
    private readonly sessions: SessionPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const email = normalizeEmail(input.email);
    const user = await this.users.findUserByEmail(email);
    if (!user) throw new InvalidCredentialsError();

    const matches = await this.hasher.verify(input.password, user.passwordHash);
    if (!matches) throw new InvalidCredentialsError();

    const session = await issueSession(this.sessions, user.id);
    return { token: session.token, user: toPublicUser(user) };
  }
}
