import type { MarketCategory } from "@atlas/domain";
import type { MarketDataPort } from "../ports/market-data.ts";
import type { MarketStorePort } from "../ports/market-store.ts";
import type { IngestMarkets, IngestMarketsInput, IngestMarketsOutput } from "./ingest-markets.ts";

export class IngestMarketsUseCase implements IngestMarkets {
  constructor(
    private readonly market: MarketDataPort,
    private readonly store: MarketStorePort,
  ) {}

  async execute(input: IngestMarketsInput): Promise<IngestMarketsOutput> {
    const markets = await this.market.listMarkets({
      ...(input.categories?.[0] ? { category: input.categories[0] as MarketCategory } : {}),
      limit: input.maxMarkets ?? 100,
    });
    await Promise.all(markets.map((m) => this.store.upsertMarket(m)));
    return { upserted: markets.length, ticksRecorded: 0 };
  }
}
