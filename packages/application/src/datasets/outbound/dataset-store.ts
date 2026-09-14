import type { Dataset, SavedDataset, UserId } from "@atlas/domain";

export interface DatasetStorePort {
  save(input: SavedDataset): Promise<void>;
  list(ownerId: UserId, limit: number): Promise<Dataset[]>;
  find(id: string, ownerId: UserId): Promise<SavedDataset | null>;
  delete(id: string, ownerId: UserId): Promise<void>;
}
