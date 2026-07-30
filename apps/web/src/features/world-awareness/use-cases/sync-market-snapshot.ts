import type {
  IngestMarketsInput,
  IngestMarketsResult,
  MarketRepository,
} from "../repositories/market-repository.ts";

export interface SyncMarketSnapshotDeps {
  marketRepository: MarketRepository;
}

export type SyncMarketSnapshot = (input?: IngestMarketsInput) => Promise<IngestMarketsResult>;

export function makeSyncMarketSnapshot({
  marketRepository,
}: SyncMarketSnapshotDeps): SyncMarketSnapshot {
  return (input = { maxMarkets: 100 }) => marketRepository.ingestMarkets(input);
}
