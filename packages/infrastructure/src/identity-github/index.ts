import type { IdentityProviderPort, ProviderIdentity } from "@atlas/application";
import { InvalidCredentialsError } from "@atlas/application";

const USER_URL = "https://api.github.com/user";
const EMAILS_URL = "https://api.github.com/user/emails";

interface GithubUser {
  id: number;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

function parseAccessToken(payload: unknown): string {
  const source = (payload ?? {}) as Record<string, unknown>;
  const token = typeof source.accessToken === "string" ? source.accessToken : "";
  if (!token) throw new InvalidCredentialsError();
  return token;
}

async function fetchGithub<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "atlas",
    },
  });
  if (!response.ok) throw new InvalidCredentialsError();
  return (await response.json()) as T;
}

function pickVerifiedEmail(emails: GithubEmail[]): string {
  const primary = emails.find((entry) => entry.primary && entry.verified);
  const anyVerified = emails.find((entry) => entry.verified);
  const chosen = primary ?? anyVerified;
  if (!chosen) throw new InvalidCredentialsError();
  return chosen.email.trim().toLowerCase();
}

export class GithubIdentityProvider implements IdentityProviderPort {
  readonly provider = "github" as const;

  async authenticate(payload: unknown): Promise<ProviderIdentity> {
    const accessToken = parseAccessToken(payload);
    const [user, emails] = await Promise.all([
      fetchGithub<GithubUser>(USER_URL, accessToken),
      fetchGithub<GithubEmail[]>(EMAILS_URL, accessToken),
    ]);

    return {
      provider: "github",
      providerUserId: String(user.id),
      email: pickVerifiedEmail(emails),
      emailVerified: true,
    };
  }
}
