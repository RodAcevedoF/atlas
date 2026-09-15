import type { DatasetSheet } from "@atlas/domain";
import ExcelJS from "exceljs";

export async function multiSheetWorkbook(sheets: DatasetSheet[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    worksheet.addRow(sheet.columns);
    worksheet.addRows(sheet.rows);
    worksheet.getCell("AA105").font = { bold: true };
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
