import type {
  ListWorldSnapshotsInput,
  MarketRepository,
  TopicSnapshotRecord,
} from "../repositories/market-repository.ts";

export interface ListWorldSnapshotsDeps {
  marketRepository: MarketRepository;
}

export type ListWorldSnapshots = (
  input?: ListWorldSnapshotsInput,
) => Promise<TopicSnapshotRecord[]>;

export function makeListWorldSnapshots({
  marketRepository,
}: ListWorldSnapshotsDeps): ListWorldSnapshots {
  return (input = {}) => marketRepository.listWorldSnapshots(input);
}
