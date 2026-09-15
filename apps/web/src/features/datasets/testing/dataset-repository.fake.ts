import { datasetCsv } from "@atlas/application";
import {
  type Dataset,
  type DatasetSheet,
  type DatasetSheetPreview,
  makeUserId,
} from "@atlas/domain";
import type { DatasetRepository } from "../repositories/dataset-repository.ts";

export class MemoryDatasetRepository implements DatasetRepository {
  constructor(
    private datasets: Dataset[],
    private readonly files: Map<string, File>,
    private readonly workbooks: Map<File, DatasetSheet[]> = new Map(),
  ) {}
  async list(): Promise<Dataset[]> {
    return structuredClone(this.datasets);
  }
  async preview(file: File): Promise<DatasetSheetPreview[]> {
    return this.sheets(file).map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.rows.length,
      columnCount: sheet.columns.length,
    }));
  }
  async save(file: File, worksheet?: string): Promise<Dataset[]> {
    const sheets = this.sheets(file).filter(
      (sheet) => worksheet === undefined || worksheet === sheet.name,
    );
    const datasets = sheets.map((sheet) => {
      const dataset: Dataset = {
        id: crypto.randomUUID(),
        ownerId: makeUserId("owner"),
        name: `${sheet.name}.xlsx`,
        columns: sheet.columns,
        recordCount: sheet.rows.length,
        createdAt: new Date().toISOString(),
      };
      this.files.set(
        dataset.id,
        new File([datasetCsv(sheet)], `${sheet.name}.csv`, { type: "text/csv" }),
      );
      return dataset;
    });
    this.datasets.push(...datasets);
    return structuredClone(datasets);
  }
  private sheets(file: File): DatasetSheet[] {
    const sheets = this.workbooks.get(file);
    if (!sheets) throw new Error("Workbook is unavailable");
    return sheets;
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
