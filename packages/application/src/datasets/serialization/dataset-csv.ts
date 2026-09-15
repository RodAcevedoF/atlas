import type { DatasetTable } from "@atlas/domain";

export function datasetCsv(table: DatasetTable): string {
  return `${[table.columns, ...table.rows]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","))
    .join("\r\n")}\r\n`;
}
