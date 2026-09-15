import type { DatasetSheetPreview } from "@atlas/domain";
import type { DatasetParserPort } from "../outbound/dataset-parser.ts";
import { type ImportDatasetInput, parseDatasetInput } from "./dataset-input.ts";

export class PreviewDatasetUseCase {
  constructor(private readonly parser: DatasetParserPort) {}

  async execute(input: ImportDatasetInput): Promise<DatasetSheetPreview[]> {
    const sheets = await this.parser.read(parseDatasetInput(input));
    return sheets.map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.rows.length,
      columnCount: sheet.columns.length,
    }));
  }
}
