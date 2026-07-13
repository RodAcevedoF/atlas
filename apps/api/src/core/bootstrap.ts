import { PolymarketAdapter } from "@atlas/infra/market-polymarket";
import { GdeltNewsAdapter } from "@atlas/infra/news-gdelt";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";
import { BunPasswordHasher } from "@atlas/infra/password-bun";
import { RedisSessionStore, createRedisClient } from "@atlas/infra/session-redis";
import { MongoMarketStore, createMongoClient, ensureIndexes } from "@atlas/infra/store-mongodb";
import { MongoUserStore, ensureUserIndexes } from "@atlas/infra/user-store-mongodb";
import { type AuthDeps, makeAuthDependencies } from "../modules/auth/dependencies.ts";
import { type MarketsDeps, makeMarketsDependencies } from "../modules/markets/dependencies.ts";
import { type NewsDeps, makeNewsDependencies } from "../modules/news/dependencies.ts";
import { type ProfileDeps, makeProfileDependencies } from "../modules/profile/dependencies.ts";
import { type WorldDeps, makeWorldDependencies } from "../modules/world/dependencies.ts";

export interface AppDeps {
  auth: AuthDeps;
  profile: ProfileDeps;
  markets: MarketsDeps;
  news: NewsDeps;
  world: WorldDeps;
  redis: ReturnType<typeof createRedisClient>;
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

  const marketData = new PolymarketAdapter();
  const signalSource = new GdeltNewsAdapter();
  const store = new MongoMarketStore(db);
  const userStore = new MongoUserStore(db);
  const sessionStore = new RedisSessionStore(redis);
  const hasher = new BunPasswordHasher();
  const orchestration = new HttpOrchestration(
    process.env.INTELLIGENCE_URL ?? "http://127.0.0.1:8000",
  );

  const auth = makeAuthDependencies({ userStore, sessionStore, hasher });
  const profile = makeProfileDependencies({ userStore, store });
  const markets = makeMarketsDependencies({ marketData, store });
  const news = makeNewsDependencies({ signalSource, store });
  const world = makeWorldDependencies({ store, orchestration });

  return { auth, profile, markets, news, world, redis };
}
