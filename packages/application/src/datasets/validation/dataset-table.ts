import type { DatasetTable } from "@atlas/domain";
import { InvalidTableError } from "../../inquiry/outbound/tabular-parser.ts";
import { DATASET_MAX_COLUMNS, DATASET_MAX_ROWS } from "../limits.ts";

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
