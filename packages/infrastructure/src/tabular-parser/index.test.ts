import { describe, expect, test } from "bun:test";
import ExcelJS from "exceljs";
import { ExcelJsTabularParser } from "./index.ts";

describe("CSV profiles", () => {
  test("counts every row while sending only representative typed rows", async () => {
    const rows = Array.from({ length: 25 }, (_unused, index) => `Atlas ${index},${index},true`);
    const bytes = new TextEncoder().encode(`company,count,active\n${rows.join("\n")}`);

    const profile = await new ExcelJsTabularParser().parse({
      filename: "companies.csv",
      mediaType: "text/csv",
      bytes,
    });

    expect(profile.sheets[0]).toMatchObject({
      rowCount: 25,
      columnCount: 3,
      rowsSampled: 20,
      columns: [
        { name: "company", type: "string" },
        { name: "count", type: "number" },
        { name: "active", type: "boolean" },
      ],
    });
    expect(profile.sheets[0]?.representativeRows).toHaveLength(20);
  });

  test("keeps commas and line breaks inside quoted fields", async () => {
    const bytes = new TextEncoder().encode('company,note\nAtlas,"Madrid, Spain\nSecond line"');

    const profile = await new ExcelJsTabularParser().parse({
      filename: "companies.csv",
      mediaType: "text/csv",
      bytes,
    });

    expect(profile.sheets[0]?.representativeRows).toEqual([
      ["Atlas", "Madrid, Spain\nSecond line"],
    ]);
  });
});

test("XLSX keeps sheet names and reports sheets omitted from the bounded profile", async () => {
  const workbook = new ExcelJS.Workbook();
  for (let index = 0; index < 6; index += 1) {
    const sheet = workbook.addWorksheet(`Sheet ${index + 1}`);
    sheet.addRow(["company", "count"]);
    sheet.addRow(["Atlas", index]);
  }
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

  const profile = await new ExcelJsTabularParser().parse({
    filename: "companies.xlsx",
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes,
  });

  expect(profile.sheetCount).toBe(6);
  expect(profile.sheets).toHaveLength(5);
  expect(profile.sheetsTruncated).toBe(true);
  expect(profile.sheets[0]?.name).toBe("Sheet 1");
});
