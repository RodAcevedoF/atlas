import type { UserId } from "./user.ts";

export interface DatasetTable {
  columns: string[];
  rows: string[][];
}

export interface Dataset {
  id: string;
  ownerId: UserId;
  name: string;
  columns: string[];
  recordCount: number;
  createdAt: string;
}

export interface DatasetRecord {
  datasetId: string;
  ownerId: UserId;
  position: number;
  values: string[];
}

export interface SavedDataset {
  dataset: Dataset;
  records: DatasetRecord[];
}

export interface DatasetSheet extends DatasetTable {
  name: string;
}

export interface DatasetSheetPreview {
  name: string;
  rowCount: number;
  columnCount: number;
}
