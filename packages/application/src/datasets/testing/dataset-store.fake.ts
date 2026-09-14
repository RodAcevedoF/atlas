import type { Dataset, SavedDataset, UserId } from "@atlas/domain";
import type { DatasetStorePort } from "../outbound/dataset-store.ts";

export class MemoryDatasetStore implements DatasetStorePort {
  readonly saved = new Map<string, SavedDataset>();
  async save(input: SavedDataset): Promise<void> {
    this.saved.set(input.dataset.id, structuredClone(input));
  }
  async list(ownerId: UserId, limit: number): Promise<Dataset[]> {
    return [...this.saved.values()]
      .map((saved) => saved.dataset)
      .filter((dataset) => dataset.ownerId === ownerId)
      .slice(0, limit);
  }
  async find(id: string, ownerId: UserId): Promise<SavedDataset | null> {
    const saved = this.saved.get(id);
    return saved?.dataset.ownerId === ownerId ? structuredClone(saved) : null;
  }
  async delete(id: string, ownerId: UserId): Promise<void> {
    if (this.saved.get(id)?.dataset.ownerId === ownerId) this.saved.delete(id);
  }
}
