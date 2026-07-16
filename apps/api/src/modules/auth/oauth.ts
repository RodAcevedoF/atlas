import type { IdentityProviderPort, IdentityProviderRegistry } from "@atlas/application";
import { GithubIdentityProvider } from "@atlas/infra/identity-github";
import { GoogleIdentityProvider } from "@atlas/infra/identity-google";
import oauth2, { type OAuth2Namespace, type ProviderConfiguration } from "@fastify/oauth2";
import type { FastifyInstance } from "fastify";
import { setSessionCookie } from "../../routes/auth.ts";
import type { AuthDeps } from "./dependencies.ts";

type OAuthProvider = "github" | "google";
type OAuthDecorator = "oauth2Github" | "oauth2Google";

interface ProviderDescriptor {
  idEnv: string;
  secretEnv: string;
  decoratorName: OAuthDecorator;
  scope: string[];
  configuration: ProviderConfiguration;
  makeStrategy: () => IdentityProviderPort;
}

const PROVIDERS: Record<OAuthProvider, ProviderDescriptor> = {
  github: {
    idEnv: "GITHUB_CLIENT_ID",
    secretEnv: "GITHUB_CLIENT_SECRET",
    decoratorName: "oauth2Github",
    scope: ["user:email"],
    configuration: oauth2.GITHUB_CONFIGURATION,
    makeStrategy: () => new GithubIdentityProvider(),
  },
  google: {
    idEnv: "GOOGLE_CLIENT_ID",
    secretEnv: "GOOGLE_CLIENT_SECRET",
    decoratorName: "oauth2Google",
    scope: ["openid", "email", "profile"],
    configuration: oauth2.GOOGLE_CONFIGURATION,
    makeStrategy: () => new GoogleIdentityProvider(),
  },
};

export interface OAuthProviderConfig {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
}

function webAppUrl(): string {
  return process.env.WEB_APP_URL ?? "http://localhost:3000";
}

/** Providers are enabled only when their client id + secret env are both present. */
export function readOAuthConfigs(): OAuthProviderConfig[] {
  const configs: OAuthProviderConfig[] = [];
  for (const provider of Object.keys(PROVIDERS) as OAuthProvider[]) {
    const descriptor = PROVIDERS[provider];
    const clientId = process.env[descriptor.idEnv];
    const clientSecret = process.env[descriptor.secretEnv];
    if (clientId && clientSecret) configs.push({ provider, clientId, clientSecret });
  }
  return configs;
}

export function makeOAuthStrategies(configs: OAuthProviderConfig[]): IdentityProviderRegistry {
  const registry: IdentityProviderRegistry = {};
  for (const config of configs) {
    registry[config.provider] = PROVIDERS[config.provider].makeStrategy();
  }
  return registry;
}

/** The `onRequest` auth gate must let the OAuth start + callback routes through unauthenticated. */
export function oauthPublicRoutes(configs: OAuthProviderConfig[]): string[] {
  return configs.flatMap((config) => [
    `/auth/${config.provider}`,
    `/auth/${config.provider}/callback`,
  ]);
}

/**
 * Registers `@fastify/oauth2` per enabled provider (it owns the redirect/state/PKCE dance) and the
 * matching callback route: exchange the code for a token, run the shared authenticate use-case, drop
 * the session cookie, and redirect back into the web app. The callback goes through the web `/api`
 * proxy so the session cookie lands on the app's origin.
 */
export async function registerOAuthRoutes(
  app: FastifyInstance,
  deps: AuthDeps,
  configs: OAuthProviderConfig[],
): Promise<void> {
  for (const config of configs) {
    const descriptor = PROVIDERS[config.provider];
    const callbackPath = `/auth/${config.provider}/callback`;

    await app.register(oauth2, {
      name: descriptor.decoratorName,
      scope: descriptor.scope,
      credentials: {
        client: { id: config.clientId, secret: config.clientSecret },
        auth: descriptor.configuration,
      },
      startRedirectPath: `/auth/${config.provider}`,
      callbackUri: `${webAppUrl()}/api${callbackPath}`,
      pkce: "S256",
      cookie: {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      },
    });

    app.get(callbackPath, async (req, reply) => {
      const namespace = app[descriptor.decoratorName] as OAuth2Namespace | undefined;
      if (!namespace) throw new Error(`OAuth namespace missing for ${config.provider}`);

      const { token } = await namespace.getAccessTokenFromAuthorizationCodeFlow(req);
      const result = await deps.authenticateWithProvider.execute({
        provider: config.provider,
        payload: { accessToken: token.access_token },
      });
      setSessionCookie(reply, result.token);
      return reply.redirect(webAppUrl());
    });
  }
}
