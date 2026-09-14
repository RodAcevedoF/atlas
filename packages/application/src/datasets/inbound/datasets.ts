import type { Dataset, DatasetTable, SavedDataset, UserId } from "@atlas/domain";
import { INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES } from "@atlas/domain";
import { InvalidTableError } from "../../inquiry/outbound/tabular-parser.ts";
import type { DatasetParserPort } from "../outbound/dataset-parser.ts";
import type { DatasetStorePort } from "../outbound/dataset-store.ts";

export const DATASET_MAX_BYTES = 5 * 1024 * 1024;
export const DATASET_MAX_ROWS = 1000;
export const DATASET_MAX_COLUMNS = 50;

export function validateDatasetTable(table: DatasetTable): DatasetTable {
  if (table.columns.length === 0 || table.columns.length > DATASET_MAX_COLUMNS) {
    throw new InvalidTableError("Use between 1 and 50 columns");
  }
  if (table.columns.some((column) => !column.trim() || column.length > 120)) {
    throw new InvalidTableError("Every column needs a name of 1–120 characters");
  }
  if (
    new Set(table.columns.map((column) => column.trim().toLowerCase())).size !==
    table.columns.length
  ) {
    throw new InvalidTableError("Column names must be unique");
  }
  if (table.rows.length === 0 || table.rows.length > DATASET_MAX_ROWS) {
    throw new InvalidTableError("Use between 1 and 1000 data rows");
  }
  for (const row of table.rows) {
    if (row.length !== table.columns.length)
      throw new InvalidTableError("Every row must match the header width");
  }
  const cells = [...table.columns, ...table.rows.flat()];
  if (cells.some((cell) => cell.length > 2000 || cell.includes("\0"))) {
    throw new InvalidTableError("Cells must be at most 2000 characters and contain no null bytes");
  }
  if (
    cells.some(
      (cell) =>
        /^[\s]*[=+@]/.test(cell) || (/^\s*-/.test(cell) && !/^-\d+(?:\.\d+)?$/.test(cell.trim())),
    )
  ) {
    throw new InvalidTableError("Formula-like cells are not supported in saved datasets");
  }
  return table;
}

export function datasetCsv(table: DatasetTable): string {
  return `${[table.columns, ...table.rows]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\r\n")}\r\n`;
}

export interface ImportDatasetInput {
  ownerId: UserId;
  filename: string;
  mediaType: string;
  bytes: Uint8Array;
}

export interface ImportDataset {
  execute(input: ImportDatasetInput): Promise<Dataset>;
}

export class ImportDatasetUseCase implements ImportDataset {
  constructor(
    private readonly store: DatasetStorePort,
    private readonly parser: DatasetParserPort,
  ) {}

  async execute(input: ImportDatasetInput): Promise<Dataset> {
    const mediaType = INQUIRY_TABULAR_ATTACHMENT_MEDIA_TYPES.find(
      (candidate) => candidate === input.mediaType,
    );
    if (!mediaType) throw new InvalidTableError("Choose a CSV or XLSX file");
    const name = input.filename.trim();
    const extension = mediaType === "text/csv" ? ".csv" : ".xlsx";
    if (
      !name.toLowerCase().endsWith(extension) ||
      name.length > 180 ||
      Array.from(name).some(
        (character) => character.charCodeAt(0) < 32 || character === "/" || character === "\\",
      )
    ) {
      throw new InvalidTableError(
        "Filename must match the file format and be at most 180 characters",
      );
    }
    if (input.bytes.length > DATASET_MAX_BYTES) {
      throw new InvalidTableError("Dataset must be at most 5 MB");
    }
    const table = validateDatasetTable(await this.parser.read({ ...input, mediaType }));
    if (new TextEncoder().encode(datasetCsv(table)).byteLength > DATASET_MAX_BYTES) {
      throw new InvalidTableError("Dataset CSV must be at most 5 MB");
    }
    const dataset: Dataset = {
      id: crypto.randomUUID(),
      ownerId: input.ownerId,
      name,
      columns: table.columns,
      recordCount: table.rows.length,
      createdAt: new Date().toISOString(),
    };
    await this.store.save({
      dataset,
      records: table.rows.map((values, position) => ({
        datasetId: dataset.id,
        ownerId: input.ownerId,
        position,
        values,
      })),
    });
    return dataset;
  }
}

export class ListDatasetsUseCase {
  constructor(private readonly store: DatasetStorePort) {}
  execute(ownerId: UserId): Promise<Dataset[]> {
    return this.store.list(ownerId, 50);
  }
}

export class GetDatasetUseCase {
  constructor(private readonly store: DatasetStorePort) {}
  execute(id: string, ownerId: UserId): Promise<SavedDataset | null> {
    return this.store.find(id, ownerId);
  }
}

export class DeleteDatasetUseCase {
  constructor(private readonly store: DatasetStorePort) {}
  execute(id: string, ownerId: UserId): Promise<void> {
    return this.store.delete(id, ownerId);
  }
}
