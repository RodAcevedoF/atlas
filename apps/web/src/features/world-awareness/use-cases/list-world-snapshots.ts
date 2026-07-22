import type {
  ListWorldSnapshotsInput,
  MarketRepository,
  TopicSnapshotRecord,
} from "../repositories/market-repository.ts";

export function listWorldSnapshots(
  repository: MarketRepository,
  input: ListWorldSnapshotsInput = {},
): Promise<TopicSnapshotRecord[]> {
  return repository.listWorldSnapshots(input);
}
