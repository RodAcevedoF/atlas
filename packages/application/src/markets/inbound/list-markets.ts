import type { Market, MarketCategory, MarketStatus } from "@atlas/domain";
import type { MarketStorePort } from "../outbound/market-store.ts";

export interface ListMarketsInput {
  status?: MarketStatus;
  category?: MarketCategory;
  limit?: number;
}

export type ListMarketsOutput = Market[];

export interface ListMarkets {
  execute(input?: ListMarketsInput): Promise<ListMarketsOutput>;
}

export class ListMarketsUseCase implements ListMarkets {
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListMarketsInput = {}): Promise<ListMarketsOutput> {
    return this.store.listMarkets(input);
  }
}
