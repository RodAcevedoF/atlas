import type { Market, MarketCategory, MarketStatus } from "@atlas/domain";

export interface ListMarketsInput {
  status?: MarketStatus;
  category?: MarketCategory;
  limit?: number;
}

export type ListMarketsOutput = Market[];

export interface ListMarkets {
  execute(input?: ListMarketsInput): Promise<ListMarketsOutput>;
}
