import type {
  IngestMarketsInput,
  IngestMarketsResult,
  MarketRepository,
} from "../repositories/market-repository.ts";

export function syncMarketSnapshot(
  repository: MarketRepository,
  input: IngestMarketsInput = { maxMarkets: 100 },
): Promise<IngestMarketsResult> {
  return repository.ingestMarkets(input);
}
