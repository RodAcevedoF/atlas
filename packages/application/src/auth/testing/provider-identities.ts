import type { IdentityProvider } from "@atlas/domain";
import { InvalidCredentialsError } from "../inbound/auth.ts";
import type { IdentityProviderPort, ProviderIdentity } from "../outbound/identity-provider.ts";

export class MemoryProviderIdentities implements IdentityProviderPort {
  constructor(
    readonly provider: IdentityProvider,
    private readonly tokens: ReadonlyMap<string, ProviderIdentity>,
  ) {}

  async authenticate(payload: unknown): Promise<ProviderIdentity> {
    const identity = typeof payload === "string" ? this.tokens.get(payload) : undefined;
    if (!identity) throw new InvalidCredentialsError();
    return { ...identity };
  }
}
