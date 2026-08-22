import type {
  IngestNewsInput,
  IngestNewsResult,
  WorldRepository,
} from "../repositories/world-repository.ts";

export interface SyncNewsSnapshotDeps {
  worldRepository: WorldRepository;
}

export type SyncNewsSnapshot = (input?: IngestNewsInput) => Promise<IngestNewsResult>;

export function makeSyncNewsSnapshot({ worldRepository }: SyncNewsSnapshotDeps): SyncNewsSnapshot {
  return (input = { limit: 75 }) => worldRepository.ingestNews(input);
}
