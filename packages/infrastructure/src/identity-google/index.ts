import type { IdentityProviderPort, ProviderIdentity } from "@atlas/application";
import { InvalidCredentialsError } from "@atlas/application";

const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
}

function parseAccessToken(payload: unknown): string {
  const source = (payload ?? {}) as Record<string, unknown>;
  const token = typeof source.accessToken === "string" ? source.accessToken : "";
  if (!token) throw new InvalidCredentialsError();
  return token;
}

export class GoogleIdentityProvider implements IdentityProviderPort {
  readonly provider = "google" as const;

  async authenticate(payload: unknown): Promise<ProviderIdentity> {
    const accessToken = parseAccessToken(payload);
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new InvalidCredentialsError();

    const info = (await response.json()) as GoogleUserInfo;
    if (!info.email) throw new InvalidCredentialsError();

    return {
      provider: "google",
      providerUserId: info.sub,
      email: info.email.trim().toLowerCase(),
      emailVerified: info.email_verified === true,
    };
  }
}
