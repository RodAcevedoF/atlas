import type { SavedDataset, UserId } from "@atlas/domain";
import type { DatasetStorePort } from "../outbound/dataset-store.ts";

export class GetDatasetUseCase {
  constructor(private readonly store: DatasetStorePort) {}
  execute(id: string, ownerId: UserId): Promise<SavedDataset | null> {
    return this.store.find(id, ownerId);
  }
}
