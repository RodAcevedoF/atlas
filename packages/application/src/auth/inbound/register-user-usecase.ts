import type { User } from "@atlas/domain";
import { emptyProfile, makeUserId, toPublicUser } from "@atlas/domain";
import type { PasswordHasherPort } from "../outbound/password-hasher.ts";
import type { SessionPort } from "../outbound/session-store.ts";
import type { UserStorePort } from "../outbound/user-store.ts";
import type { LoginResult, RegisterInput, RegisterUser } from "./auth.ts";
import { EmailInUseError, normalizeEmail } from "./auth.ts";
import { issueSession } from "./issue-session.ts";

export class RegisterUserUseCase implements RegisterUser {
  constructor(
    private readonly users: UserStorePort,
    private readonly sessions: SessionPort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async execute(input: RegisterInput): Promise<LoginResult> {
    const email = normalizeEmail(input.email);
    const existing = await this.users.findUserByEmail(email);
    if (existing) throw new EmailInUseError(email);

    const id = makeUserId(crypto.randomUUID());
    const user: User = {
      id,
      email,
      identities: [
        {
          provider: "password",
          providerUserId: id,
          email,
          secret: await this.hasher.hash(input.password),
        },
      ],
      profile: emptyProfile(),
      createdAt: new Date(),
    };
    await this.users.createUser(user);
    const session = await issueSession(this.sessions, user.id);
    return { token: session.token, user: toPublicUser(user) };
  }
}
