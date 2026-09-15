import type { Dataset, SavedDataset } from "@atlas/domain";
import { InvalidTableError } from "../../inquiry/outbound/tabular-parser.ts";
import { DATASET_MAX_BYTES, DATASET_MAX_ROWS, DATASET_MAX_SHEETS } from "../limits.ts";
import type { DatasetParserPort } from "../outbound/dataset-parser.ts";
import type { DatasetStorePort } from "../outbound/dataset-store.ts";
import { datasetCsv } from "../serialization/dataset-csv.ts";
import { validateDatasetTable } from "../validation/dataset-table.ts";
import { type ImportDatasetInput, parseDatasetInput } from "./dataset-input.ts";

export interface ImportDataset {
  execute(input: ImportDatasetInput): Promise<Dataset[]>;
}

export class ImportDatasetUseCase implements ImportDataset {
  constructor(
    private readonly store: DatasetStorePort,
    private readonly parser: DatasetParserPort,
  ) {}

  async execute(input: ImportDatasetInput): Promise<Dataset[]> {
    const parsed = parseDatasetInput(input);
    const sheets = await this.parser.read(parsed);
    const selected =
      input.worksheet === undefined
        ? sheets
        : sheets.filter((sheet) => sheet.name === input.worksheet);
    if (selected.length === 0) throw new InvalidTableError("Choose an existing worksheet");
    if (selected.length > DATASET_MAX_SHEETS) {
      throw new InvalidTableError("Import at most 10 worksheets at a time; choose one worksheet");
    }
    if (selected.reduce((total, sheet) => total + sheet.rows.length, 0) > DATASET_MAX_ROWS) {
      throw new InvalidTableError("Import at most 1000 data rows in total; choose one worksheet");
    }
    for (const sheet of selected) validateDatasetTable(sheet);
    const csvBytes = selected.reduce(
      (total, sheet) => total + new TextEncoder().encode(datasetCsv(sheet)).byteLength,
      0,
    );
    if (csvBytes > DATASET_MAX_BYTES) {
      throw new InvalidTableError("Dataset CSV must be at most 5 MB");
    }
    const saved = selected.map((sheet): SavedDataset => {
      const dataset: Dataset = {
        id: crypto.randomUUID(),
        ownerId: input.ownerId,
        name:
          sheets.length === 1
            ? parsed.filename
            : `${parsed.filename.slice(0, Math.min(parsed.filename.length - 5, 172 - sheet.name.length))} — ${sheet.name}.xlsx`,
        columns: sheet.columns,
        recordCount: sheet.rows.length,
        createdAt: new Date().toISOString(),
      };
      return {
        dataset,
        records: sheet.rows.map((values, position) => ({
          datasetId: dataset.id,
          ownerId: input.ownerId,
          position,
          values,
        })),
      };
    });
    await this.store.saveMany(saved);
    return saved.map((entry) => entry.dataset);
  }
}
