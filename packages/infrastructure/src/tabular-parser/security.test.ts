import { expect, test } from "bun:test";
import ExcelJS from "exceljs";
import { ExcelJsDatasetParser, ExcelJsTabularParser } from "./index.ts";

const xlsx = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const parsers = [
  { name: "attachment", parse: new ExcelJsTabularParser().parse.bind(new ExcelJsTabularParser()) },
  { name: "dataset", parse: new ExcelJsDatasetParser().read.bind(new ExcelJsDatasetParser()) },
];

for (const parser of parsers) {
  for (const size of [32_769, 9 * 1024 * 1024]) {
    test(`${parser.name} rejects XLSX cell expansion of ${size} characters`, async () => {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Data");
      sheet.addRow(["value"]);
      sheet.addRow(["x".repeat(size)]);
      const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

      const result = parser.parse({ filename: "expanded.xlsx", mediaType: xlsx, bytes });

      await expect(result).rejects.toThrow("safe parsing limits");
    });
  }

  test(`${parser.name} rejects oversized CSV cells including the final field`, async () => {
    const bytes = new TextEncoder().encode(`value\n${"x".repeat(32_769)}`);

    const result = parser.parse({ filename: "expanded.csv", mediaType: "text/csv", bytes });

    await expect(result).rejects.toThrow("safe parsing limits");
  });

  test(`${parser.name} bounds sparse worksheet dimensions before profiling`, async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.getCell("A1").value = "value";
    sheet.getCell("XFD20").value = "sparse";
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

    const result = parser.parse({ filename: "sparse.xlsx", mediaType: xlsx, bytes });

    await expect(result).rejects.toThrow("safe parsing limits");
  });
}

test("attachment and dataset parsing share a concurrency cap and release capacity", async () => {
  const input = {
    filename: "data.csv",
    mediaType: "text/csv" as const,
    bytes: new TextEncoder().encode("value\na"),
  };
  const profile = new ExcelJsTabularParser().parse(input);
  const dataset = new ExcelJsDatasetParser().read(input);

  await expect(new ExcelJsTabularParser().parse(input)).rejects.toThrow("busy");
  await Promise.all([profile, dataset]);

  expect((await new ExcelJsDatasetParser().read(input))[0]?.rows).toEqual([["a"]]);
});

test("ZIP expansion is rejected before ExcelJS loads individually bounded cells", async () => {
  const { checkXlsxBounds } = await import("./xlsx-bounds.ts");
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");
  for (let index = 0; index < 9000; index += 1) sheet.addRow([`${index}:${"x".repeat(1024)}`]);
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());

  expect(() => checkXlsxBounds(bytes)).toThrow("safe parsing limits");
});

for (const disguise of ["central-name", "unicode-path"] as const) {
  test(`XLSX preflight rejects ${disguise} ambiguity before XML parsing`, async () => {
    const { checkXlsxBounds } = await import("./xlsx-bounds.ts");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.getCell("A1").value = "merged";
    sheet.mergeCells("A1:B1");
    let bytes = Buffer.from(await workbook.xlsx.writeBuffer());
    let cursor = bytes.readUInt32LE(bytes.length - 6);
    while (bytes.readUInt32LE(cursor) === 0x02014b50) {
      const nameLength = bytes.readUInt16LE(cursor + 28);
      const extraLength = bytes.readUInt16LE(cursor + 30);
      const nameEnd = cursor + 46 + nameLength;
      const name = bytes.toString("utf8", cursor + 46, nameEnd);
      if (name === "xl/worksheets/sheet1.xml") break;
      cursor = nameEnd + extraLength + bytes.readUInt16LE(cursor + 32);
    }
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Worksheet entry missing");
    const nameEnd = cursor + 46 + bytes.readUInt16LE(cursor + 28);
    if (disguise === "central-name") bytes.write("bin", nameEnd - 3);
    if (disguise === "unicode-path") {
      const extraLength = bytes.readUInt16LE(cursor + 30);
      const field = Buffer.from([0x75, 0x70, 0x00, 0x00]);
      bytes = Buffer.concat([bytes.subarray(0, nameEnd), field, bytes.subarray(nameEnd)]);
      bytes.writeUInt16LE(extraLength + field.length, cursor + 30);
      const end = bytes.length - 22;
      bytes.writeUInt32LE(bytes.readUInt32LE(end + 12) + field.length, end + 12);
      bytes.write("bin", nameEnd - 3);
      const local = bytes.readUInt32LE(cursor + 42);
      bytes.write("bin", local + 30 + bytes.readUInt16LE(local + 26) - 3);
    }

    if (disguise === "central-name") {
      const loaded = new ExcelJS.Workbook();
      await loaded.xlsx.load(Uint8Array.from(bytes).buffer);
      expect(loaded.worksheets[0]?.getCell("B1").isMerged).toBe(true);
    }
    expect(() => checkXlsxBounds(bytes)).toThrow("safe parsing limits");
  });
}
