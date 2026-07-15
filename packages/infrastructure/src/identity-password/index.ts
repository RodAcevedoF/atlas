import type {
  IdentityProviderPort,
  PasswordHasherPort,
  ProviderIdentity,
  UserStorePort,
} from "@atlas/application";
import { InvalidCredentialsError, normalizeEmail } from "@atlas/application";
import { findIdentity } from "@atlas/domain";

interface PasswordCredentials {
  email: string;
  password: string;
}

function parsePayload(payload: unknown): PasswordCredentials {
  const source = (payload ?? {}) as Record<string, unknown>;
  const email = typeof source.email === "string" ? source.email : "";
  const password = typeof source.password === "string" ? source.password : "";
  if (!email || !password) throw new InvalidCredentialsError();
  return { email, password };
}

export class PasswordIdentityProvider implements IdentityProviderPort {
  readonly provider = "password" as const;

  constructor(
    private readonly users: UserStorePort,
    private readonly hasher: PasswordHasherPort,
  ) {}

  async authenticate(payload: unknown): Promise<ProviderIdentity> {
    const { email, password } = parsePayload(payload);
    const user = await this.users.findUserByEmail(normalizeEmail(email));
    if (!user) throw new InvalidCredentialsError();

    const identity = findIdentity(user, "password");
    if (!identity?.secret) throw new InvalidCredentialsError();

    const matches = await this.hasher.verify(password, identity.secret);
    if (!matches) throw new InvalidCredentialsError();

    return {
      provider: "password",
      providerUserId: identity.providerUserId,
      email: user.email,
      emailVerified: true,
    };
  }
}
