import type { UserId } from "@atlas/domain";
import type { DatasetStorePort } from "../outbound/dataset-store.ts";

export class DeleteDatasetUseCase {
  constructor(private readonly store: DatasetStorePort) {}
  execute(id: string, ownerId: UserId): Promise<void> {
    return this.store.delete(id, ownerId);
  }
}
