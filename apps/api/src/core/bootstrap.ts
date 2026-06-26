import { PolymarketAdapter } from "@atlas/infra/market-polymarket";
import { GdeltNewsAdapter } from "@atlas/infra/news-gdelt";
import { MongoMarketStore, createMongoClient, ensureIndexes } from "@atlas/infra/store-mongodb";
import { type IMarketService, makeDependencies } from "../modules/market/service.ts";

export interface AppDeps {
  marketService: IMarketService;
}

export async function bootstrap(): Promise<AppDeps> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI is required");
  const dbName = process.env["MONGODB_DB_NAME"] ?? "atlas";

  const client = createMongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);

  const marketData = new PolymarketAdapter();
  const signalSource = new GdeltNewsAdapter();
  const store = new MongoMarketStore(db);
  const { service: marketService } = makeDependencies({ marketData, signalSource, store });

  return { marketService };
}
