import type {
  IngestNewsInput,
  IngestNewsResult,
  MarketRepository,
} from "../repositories/market-repository.ts";

export interface SyncNewsSnapshotDeps {
  marketRepository: MarketRepository;
}

export type SyncNewsSnapshot = (input?: IngestNewsInput) => Promise<IngestNewsResult>;

export function makeSyncNewsSnapshot({ marketRepository }: SyncNewsSnapshotDeps): SyncNewsSnapshot {
  return (input = { limit: 75 }) => marketRepository.ingestNews(input);
}
