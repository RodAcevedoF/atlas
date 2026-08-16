import { PasswordIdentityProvider } from "@atlas/infra/identity-password";
import { CompositeMarketDataAdapter } from "@atlas/infra/market-composite";
import { KalshiAdapter } from "@atlas/infra/market-kalshi";
import { PolymarketAdapter } from "@atlas/infra/market-polymarket";
import { CompositeSignalSourceAdapter } from "@atlas/infra/news-composite";
import { ExaNewsAdapter } from "@atlas/infra/news-exa";
import { GdeltNewsAdapter } from "@atlas/infra/news-gdelt";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";
import { BunPasswordHasher } from "@atlas/infra/password-bun";
import { RedisSessionStore, createRedisClient } from "@atlas/infra/session-redis";
import {
  MongoMarketStore,
  MongoResearchRunStore,
  createMongoClient,
  ensureIndexes,
} from "@atlas/infra/store-mongodb";
import { MongoUserStore, ensureUserIndexes } from "@atlas/infra/user-store-mongodb";
import { RedisVerificationTokenStore } from "@atlas/infra/verification-redis";
import { type AuthDeps, makeAuthDependencies } from "../modules/auth/dependencies.ts";
import { makeEmailPort } from "../modules/auth/email.ts";
import { makeOAuthStrategies, readOAuthConfigs } from "../modules/auth/oauth.ts";
import { type MarketsDeps, makeMarketsDependencies } from "../modules/markets/dependencies.ts";
import { type NewsDeps, makeNewsDependencies } from "../modules/news/dependencies.ts";
import { type ProfileDeps, makeProfileDependencies } from "../modules/profile/dependencies.ts";
import { type ResearchDeps, makeResearchDependencies } from "../modules/research/dependencies.ts";
import { type WorldDeps, makeWorldDependencies } from "../modules/world/dependencies.ts";

const DEFAULT_RESEARCH_RETRY_AFTER_MS = 11 * 60 * 1000;
const DEFAULT_RESEARCH_POLL_INTERVAL_MS = 5_000;
const DEFAULT_RESEARCH_RUN_TIMEOUT_MS = 120_000;

export interface AppDeps {
  auth: AuthDeps;
  profile: ProfileDeps;
  markets: MarketsDeps;
  news: NewsDeps;
  world: WorldDeps;
  research: ResearchDeps;
  redis: ReturnType<typeof createRedisClient>;
}

function readIntervalMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${name} must be a positive number`);
  return parsed;
}

export async function bootstrap(): Promise<AppDeps> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const dbName = process.env.MONGODB_DB_NAME ?? "atlas";

  const client = createMongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  await ensureUserIndexes(db);

  const redis = createRedisClient(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");

  const marketData = new CompositeMarketDataAdapter([new PolymarketAdapter(), new KalshiAdapter()]);
  const exaApiKey = process.env.EXA_API_KEY;
  const signalSource = new CompositeSignalSourceAdapter([
    new GdeltNewsAdapter(),
    ...(exaApiKey ? [new ExaNewsAdapter(exaApiKey)] : []),
  ]);
  const store = new MongoMarketStore(db);
  const userStore = new MongoUserStore(db);
  const sessionStore = new RedisSessionStore(redis);
  const hasher = new BunPasswordHasher();
  const orchestration = new HttpOrchestration(
    process.env.INTELLIGENCE_URL ?? "http://127.0.0.1:8000",
  );

  const identityProviders = {
    password: new PasswordIdentityProvider(userStore, hasher),
    ...makeOAuthStrategies(readOAuthConfigs()),
  };

  const verificationTokens = new RedisVerificationTokenStore(redis);
  const emailPort = makeEmailPort();
  const verificationConfig = { webAppUrl: process.env.WEB_APP_URL ?? "http://localhost:3000" };

  const auth = makeAuthDependencies({
    userStore,
    sessionStore,
    hasher,
    identityProviders,
    emailPort,
    verificationTokens,
    verificationConfig,
  });
  const profile = makeProfileDependencies({ userStore, store });
  const markets = makeMarketsDependencies({ marketData, store });
  const news = makeNewsDependencies({ signalSource, store });
  const world = makeWorldDependencies({ store, orchestration });
  const research = makeResearchDependencies({
    store: new MongoResearchRunStore(db),
    orchestration,
    retryAfterMs: readIntervalMs("RESEARCH_RETRY_AFTER_MS", DEFAULT_RESEARCH_RETRY_AFTER_MS),
    runTimeoutMs: readIntervalMs("RESEARCH_RUN_TIMEOUT_MS", DEFAULT_RESEARCH_RUN_TIMEOUT_MS),
    pollIntervalMs: readIntervalMs("RESEARCH_POLL_INTERVAL_MS", DEFAULT_RESEARCH_POLL_INTERVAL_MS),
  });

  return { auth, profile, markets, news, world, research, redis };
}
