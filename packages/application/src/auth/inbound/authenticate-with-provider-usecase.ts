import { toPublicUser } from "@atlas/domain";
import type { IdentityProviderRegistry } from "../outbound/identity-provider.ts";
import type { SessionPort } from "../outbound/session-store.ts";
import type { UserStorePort } from "../outbound/user-store.ts";
import type {
  AuthenticateWithProvider,
  AuthenticateWithProviderInput,
  LoginResult,
} from "./auth.ts";
import { InvalidCredentialsError, UnknownProviderError } from "./auth.ts";
import { issueSession } from "./issue-session.ts";

export class AuthenticateWithProviderUseCase implements AuthenticateWithProvider {
  constructor(
    private readonly providers: IdentityProviderRegistry,
    private readonly users: UserStorePort,
    private readonly sessions: SessionPort,
  ) {}

  async execute({ provider, payload }: AuthenticateWithProviderInput): Promise<LoginResult> {
    const strategy = this.providers[provider];
    if (!strategy) throw new UnknownProviderError(provider);

    const identity = await strategy.authenticate(payload);
    const user = await this.users.findUserByEmail(identity.email);
    if (!user) throw new InvalidCredentialsError();

    const session = await issueSession(this.sessions, user.id);
    return { token: session.token, user: toPublicUser(user) };
  }
}
