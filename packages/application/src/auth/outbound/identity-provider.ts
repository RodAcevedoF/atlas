import type { IdentityProvider } from "@atlas/domain";

export interface ProviderIdentity {
  provider: IdentityProvider;
  providerUserId: string;
  email: string;
  emailVerified: boolean;
}

export interface IdentityProviderPort {
  readonly provider: IdentityProvider;
  authenticate(payload: unknown): Promise<ProviderIdentity>;
}

export type IdentityProviderRegistry = Partial<Record<IdentityProvider, IdentityProviderPort>>;
