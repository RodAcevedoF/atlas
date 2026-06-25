import type { MarketStorePort } from "../ports/market-store.ts";
import type { ListMarkets, ListMarketsInput, ListMarketsOutput } from "./list-markets.ts";

export class ListMarketsUseCase implements ListMarkets {
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListMarketsInput = {}): Promise<ListMarketsOutput> {
    return this.store.listMarkets(input);
  }
}
