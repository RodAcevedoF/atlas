import { expect, test } from "bun:test";
import { datasetCsv, validateDatasetTable } from "@atlas/application";
import { ExcelJsDatasetParser, datasetWorkbook } from "./index.ts";

const parser = new ExcelJsDatasetParser();
const table = {
  columns: ["identifier", "city", "context"],
  rows: Array.from({ length: 120 }, (_unused, index) => [
    String(index).padStart(4, "0"),
    "Malmö",
    'Quoted "context", with a comma\nand another line',
  ]),
};

test("CSV and Excel preserve every record, Unicode, leading zeros and quoted multiline cells", async () => {
  const [csv, xlsx] = await Promise.all([
    parser.read({
      filename: "projects.csv",
      mediaType: "text/csv",
      bytes: new TextEncoder().encode(datasetCsv(table)),
    }),
    datasetWorkbook(table).then((bytes) =>
      parser.read({
        filename: "projects.xlsx",
        mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        bytes,
      }),
    ),
  ]);

  expect(validateDatasetTable(csv)).toEqual(table);
  expect(validateDatasetTable(xlsx)).toEqual(table);
});

for (const scenario of [
  { name: "duplicate headers", table: { columns: ["City", " city "], rows: [["a", "b"]] } },
  { name: "missing header", table: { columns: [""], rows: [["a"]] } },
  { name: "ragged rows", table: { columns: ["City"], rows: [["a", "b"]] } },
  { name: "header without data", table: { columns: ["City"], rows: [] } },
  {
    name: "more than 1000 rows",
    table: { columns: ["City"], rows: Array.from({ length: 1001 }, () => ["a"]) },
  },
  {
    name: "formula injection",
    table: { columns: ["City"], rows: [[' =HYPERLINK("https://example.com")']] },
  },
]) {
  test(`rejects ${scenario.name}`, () => {
    expect(() => validateDatasetTable(scenario.table)).toThrow();
  });
}

test("invalid UTF-8 and unterminated CSV quotes are rejected", async () => {
  for (const bytes of [new Uint8Array([255]), new TextEncoder().encode('City\n"unfinished')]) {
    await expect(
      parser.read({ filename: "bad.csv", mediaType: "text/csv", bytes }),
    ).rejects.toThrow();
  }
});
