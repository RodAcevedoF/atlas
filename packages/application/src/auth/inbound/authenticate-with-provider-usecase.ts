import type { User, UserIdentity } from "@atlas/domain";
import { emptyProfile, findIdentity, makeUserId, toPublicUser } from "@atlas/domain";
import type { IdentityProviderRegistry, ProviderIdentity } from "../outbound/identity-provider.ts";
import type { SessionPort } from "../outbound/session-store.ts";
import type { UserStorePort } from "../outbound/user-store.ts";
import type {
  AuthenticateWithProvider,
  AuthenticateWithProviderInput,
  LoginResult,
} from "./auth.ts";
import { InvalidCredentialsError, UnknownProviderError } from "./auth.ts";
import { issueSession } from "./issue-session.ts";

function toUserIdentity(identity: ProviderIdentity): UserIdentity {
  return {
    provider: identity.provider,
    providerUserId: identity.providerUserId,
    email: identity.email,
  };
}

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
    const user = await this.resolveUser(identity);

    const session = await issueSession(this.sessions, user.id);
    return { token: session.token, user: toPublicUser(user) };
  }

  private async resolveUser(identity: ProviderIdentity): Promise<User> {
    const identityOwner = await this.users.findUserByIdentity(identity);
    if (identityOwner) return identityOwner;
    const existing = await this.users.findUserByEmail(identity.email);
    if (!existing) return this.createUser(identity);
    if (findIdentity(existing, identity.provider)) return existing;
    if (!identity.emailVerified) throw new InvalidCredentialsError();

    const linked = toUserIdentity(identity);
    await this.users.linkIdentity(existing.id, linked);
    return { ...existing, identities: [...existing.identities, linked] };
  }

  private async createUser(identity: ProviderIdentity): Promise<User> {
    const user: User = {
      id: makeUserId(crypto.randomUUID()),
      email: identity.email,
      emailVerified: true,
      role: "user",
      identities: [toUserIdentity(identity)],
      profile: emptyProfile(),
      createdAt: new Date(),
    };
    await this.users.createUser(user);
    return user;
  }
}
