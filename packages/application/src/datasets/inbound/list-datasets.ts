import type { Dataset, UserId } from "@atlas/domain";
import type { DatasetStorePort } from "../outbound/dataset-store.ts";

export class ListDatasetsUseCase {
  constructor(private readonly store: DatasetStorePort) {}
  execute(ownerId: UserId): Promise<Dataset[]> {
    return this.store.list(ownerId, 50);
  }
}
