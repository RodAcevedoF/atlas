import {
  InvalidTableError,
  type ParseTableInput,
  type TabularParserPort,
} from "@atlas/application";
import type {
  TableCell,
  TableColumnProfile,
  TableColumnType,
  TableProfile,
  TableSheetProfile,
} from "@atlas/domain";
import ExcelJS from "exceljs";

export const PROFILE_MAX_SHEETS = 5;
export const PROFILE_MAX_COLUMNS = 50;
export const PROFILE_SAMPLE_ROWS = 20;
const PROFILE_INFERENCE_ROWS = 1_000;
const MAX_PARSED_CELLS = 250_000;
const XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type RawCell = ExcelJS.CellValue | string | null;

function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted && character === '"' && text[index + 1] === '"') {
      value += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && character === ",") {
      row.push(value);
      value = "";
      continue;
    }
    if (!quoted && (character === "\n" || character === "\r")) {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      continue;
    }
    value += character;
  }

  if (quoted) throw new InvalidTableError("CSV contains an unterminated quoted field");
  if (value || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function scalarFromText(value: string): TableCell {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
  if (/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
    const number = Number(trimmed);
    if (Number.isFinite(number)) return number;
  }
  return trimmed;
}

function formulaResult(value: ExcelJS.CellFormulaValue | ExcelJS.CellSharedFormulaValue): RawCell {
  return value.result ?? null;
}

function scalarFrom(value: RawCell): TableCell {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") return scalarFromText(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if ("formula" in value || "sharedFormula" in value) return scalarFrom(formulaResult(value));
  if ("richText" in value) return value.richText.map((part) => part.text).join("");
  if ("text" in value) return value.text;
  if ("error" in value) return value.error;
  return String(value);
}

function typeOf(value: TableCell): Exclude<TableColumnType, "mixed" | "empty"> | "empty" {
  if (value === null) return "empty";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) && !Number.isNaN(Date.parse(value))) {
    return "date";
  }
  return "string";
}

function inferredType(values: TableCell[]): TableColumnType {
  const types = new Set(values.map(typeOf).filter((type) => type !== "empty"));
  if (types.size === 0) return "empty";
  if (types.size === 1) return [...types][0] ?? "empty";
  return "mixed";
}

function headerName(value: TableCell, index: number): string {
  if (value === null) return `Column ${index + 1}`;
  return String(value).slice(0, 120);
}

function profileRows(name: string, rawRows: RawCell[][]): TableSheetProfile {
  const columnCount = rawRows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const visibleColumns = Math.min(columnCount, PROFILE_MAX_COLUMNS);
  const header = rawRows[0]?.slice(0, visibleColumns).map(scalarFrom) ?? [];
  const dataRows = rawRows.slice(1);
  const inferenceRows = dataRows
    .slice(0, PROFILE_INFERENCE_ROWS)
    .map((row) =>
      Array.from({ length: visibleColumns }, (_unused, index) => scalarFrom(row[index] ?? null)),
    );
  const columns: TableColumnProfile[] = Array.from(
    { length: visibleColumns },
    (_unused, index) => ({
      name: headerName(header[index] ?? null, index),
      type: inferredType(inferenceRows.map((row) => row[index] ?? null)),
    }),
  );
  const representativeRows = inferenceRows.slice(0, PROFILE_SAMPLE_ROWS);

  return {
    name,
    rowCount: dataRows.length,
    columnCount,
    columns,
    representativeRows,
    columnsTruncated: columnCount > PROFILE_MAX_COLUMNS,
    rowsSampled: representativeRows.length,
  };
}

function ensureComplexity(rows: RawCell[][]): void {
  const cells = rows.reduce((total, row) => total + row.length, 0);
  if (cells > MAX_PARSED_CELLS) {
    throw new InvalidTableError("Spreadsheet is too large to profile safely");
  }
}

function csvProfile(bytes: Uint8Array): TableProfile {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  const rows = csvRows(text);
  ensureComplexity(rows);
  if (rows.length === 0) throw new InvalidTableError("CSV has no rows");
  return { sheetCount: 1, sheets: [profileRows("CSV", rows)], sheetsTruncated: false };
}

function worksheetRows(worksheet: ExcelJS.Worksheet): RawCell[][] {
  const rows: RawCell[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (row) => {
    const values: RawCell[] = [];
    for (let column = 1; column <= worksheet.columnCount; column += 1) {
      values.push(row.getCell(column).value);
    }
    rows.push(values);
  });
  return rows;
}

async function xlsxProfile(bytes: Uint8Array): Promise<TableProfile> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Uint8Array.from(bytes).buffer);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new InvalidTableError(`XLSX could not be read: ${reason}`);
  }

  if (workbook.worksheets.length === 0) throw new InvalidTableError("XLSX has no worksheets");
  const workbookCells = workbook.worksheets.reduce(
    (total, worksheet) => total + worksheet.rowCount * worksheet.columnCount,
    0,
  );
  if (workbookCells > MAX_PARSED_CELLS) {
    throw new InvalidTableError("Spreadsheet is too large to profile safely");
  }
  const selected = workbook.worksheets.slice(0, PROFILE_MAX_SHEETS);
  const sheets = selected.map((worksheet) => {
    const rows = worksheetRows(worksheet);
    ensureComplexity(rows);
    return profileRows(worksheet.name, rows);
  });
  return {
    sheetCount: workbook.worksheets.length,
    sheets,
    sheetsTruncated: workbook.worksheets.length > PROFILE_MAX_SHEETS,
  };
}

export class ExcelJsTabularParser implements TabularParserPort {
  parse(input: ParseTableInput): Promise<TableProfile> {
    if (input.mediaType === XLSX_MEDIA_TYPE) return xlsxProfile(input.bytes);
    return Promise.resolve(csvProfile(input.bytes));
  }
}
