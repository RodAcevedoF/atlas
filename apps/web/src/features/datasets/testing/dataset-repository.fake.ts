import type { Dataset } from "@atlas/domain";
import type { DatasetRepository } from "../repositories/dataset-repository.ts";

export class MemoryDatasetRepository implements DatasetRepository {
  constructor(
    private datasets: Dataset[],
    private readonly files: Map<string, File>,
  ) {}
  async list(): Promise<Dataset[]> {
    return structuredClone(this.datasets);
  }
  save(): Promise<Dataset> {
    throw new Error("Saving is outside this test's path");
  }
  async file(dataset: Dataset): Promise<File> {
    const file = this.files.get(dataset.id);
    if (!file) throw new Error("Dataset file is unavailable");
    return file;
  }
  async delete(id: string): Promise<void> {
    this.datasets = this.datasets.filter((dataset) => dataset.id !== id);
    this.files.delete(id);
  }
}
