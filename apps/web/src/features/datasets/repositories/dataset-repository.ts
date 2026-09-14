import type { Dataset } from "@atlas/domain";

export interface DatasetRepository {
  list(): Promise<Dataset[]>;
  save(file: File): Promise<Dataset>;
  file(dataset: Dataset): Promise<File>;
  delete(id: string): Promise<void>;
}
