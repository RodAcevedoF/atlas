import { PolymarketAdapter } from "@atlas/infra/market-polymarket";
import { GdeltNewsAdapter } from "@atlas/infra/news-gdelt";
import { HttpOrchestration } from "@atlas/infra/orchestration-http";
import { BunPasswordHasher } from "@atlas/infra/password-bun";
import { RedisSessionStore, createRedisClient } from "@atlas/infra/session-redis";
import { MongoMarketStore, createMongoClient, ensureIndexes } from "@atlas/infra/store-mongodb";
import { MongoUserStore, ensureUserIndexes } from "@atlas/infra/user-store-mongodb";
import { makeAuthDependencies } from "../modules/auth/dependencies.ts";
import type { IAuthService } from "../modules/auth/service.ts";
import { makeMarketsDependencies } from "../modules/markets/dependencies.ts";
import type { IMarketsService } from "../modules/markets/service.ts";
import { makeNewsDependencies } from "../modules/news/dependencies.ts";
import type { INewsService } from "../modules/news/service.ts";
import { makeProfileDependencies } from "../modules/profile/dependencies.ts";
import type { IProfileService } from "../modules/profile/service.ts";
import { makeWorldDependencies } from "../modules/world/dependencies.ts";
import type { IWorldService } from "../modules/world/service.ts";

export interface AppDeps {
  authService: IAuthService;
  profileService: IProfileService;
  marketsService: IMarketsService;
  newsService: INewsService;
  worldService: IWorldService;
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

  const { service: authService } = makeAuthDependencies({ userStore, sessionStore, hasher });
  const { service: profileService } = makeProfileDependencies({ userStore, store });
  const { service: marketsService } = makeMarketsDependencies({ marketData, store });
  const { service: newsService } = makeNewsDependencies({ signalSource, store });
  const { service: worldService } = makeWorldDependencies({ store, orchestration });

  return { authService, profileService, marketsService, newsService, worldService };
}
