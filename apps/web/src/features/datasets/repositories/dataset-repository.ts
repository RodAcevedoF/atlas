import type { Dataset, DatasetSheetPreview } from "@atlas/domain";

export interface DatasetRepository {
  list(): Promise<Dataset[]>;
  preview(file: File): Promise<DatasetSheetPreview[]>;
  save(file: File, worksheet?: string): Promise<Dataset[]>;
  file(dataset: Dataset): Promise<File>;
  delete(id: string): Promise<void>;
}
