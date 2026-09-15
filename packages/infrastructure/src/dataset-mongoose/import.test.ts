import { expect, test } from "bun:test";
import {
  DeleteDatasetUseCase,
  GetDatasetUseCase,
  ImportDatasetUseCase,
  ListDatasetsUseCase,
} from "@atlas/application";
import { makeUserId } from "@atlas/domain";
import { MemoryDatasetStore } from "../../../application/src/datasets/testing/dataset-store.fake.ts";
import { ExcelJsDatasetParser, datasetWorkbook } from "../tabular-parser/index.ts";
import { multiSheetWorkbook } from "../tabular-parser/testing/dataset-workbook.ts";

const owner = makeUserId("owner");
const stranger = makeUserId("stranger");

test("import stores all rows, lists only owned datasets and permits reuse", async () => {
  const store = new MemoryDatasetStore();
  const importer = new ImportDatasetUseCase(store, new ExcelJsDatasetParser());
  const datasets = await importer.execute({
    ownerId: owner,
    filename: "projects.csv",
    mediaType: "text/csv",
    bytes: new TextEncoder().encode("city,budget\nPorto,120000\nValencia,130000\n"),
  });
  const dataset = datasets[0];
  if (!dataset) throw new Error("Expected an imported dataset");
  const detail = await new GetDatasetUseCase(store).execute(dataset.id, owner);

  expect(detail?.records.map((record) => record.values)).toEqual([
    ["Porto", "120000"],
    ["Valencia", "130000"],
  ]);
  expect(await new ListDatasetsUseCase(store).execute(stranger)).toEqual([]);
  expect(await new GetDatasetUseCase(store).execute(dataset.id, stranger)).toBeNull();
  await new DeleteDatasetUseCase(store).execute(dataset.id, stranger);
  expect(await new GetDatasetUseCase(store).execute(dataset.id, owner)).not.toBeNull();
  await new DeleteDatasetUseCase(store).execute(dataset.id, owner);
  expect(await new GetDatasetUseCase(store).execute(dataset.id, owner)).toBeNull();
});

for (const scenario of [
  { name: "empty file", filename: "projects.csv", mediaType: "text/csv", bytes: new Uint8Array() },
  {
    name: "oversized file",
    filename: "projects.csv",
    mediaType: "text/csv",
    bytes: new TextEncoder().encode(
      `${Array.from({ length: 50 }, (_unused, index) => `column${index}`).join(",")}\n${Array.from({ length: 1000 }, () => Array.from({ length: 50 }, () => "a".repeat(110)).join(",")).join("\n")}`,
    ),
  },
  {
    name: "extension mismatch",
    filename: "projects.xlsx",
    mediaType: "text/csv",
    bytes: new TextEncoder().encode("city\nPorto"),
  },
  {
    name: "invalid rows",
    filename: "projects.csv",
    mediaType: "text/csv",
    bytes: new TextEncoder().encode("city\nPorto,extra"),
  },
]) {
  test(`invalid import writes nothing: ${scenario.name}`, async () => {
    const store = new MemoryDatasetStore();
    const importer = new ImportDatasetUseCase(store, new ExcelJsDatasetParser());

    await expect(importer.execute({ ...scenario, ownerId: owner })).rejects.toThrow();
    expect(await store.list(owner, 50)).toEqual([]);
  });
}

test("rejects workbook CSV expansion without saving", async () => {
  const store = new MemoryDatasetStore();
  const bytes = await datasetWorkbook({
    columns: ["a", "b", "c", "d"],
    rows: Array.from({ length: 1000 }, () => Array.from({ length: 4 }, () => "界".repeat(490))),
  });
  expect(bytes.length).toBeLessThan(5 * 1024 * 1024);

  await expect(
    new ImportDatasetUseCase(store, new ExcelJsDatasetParser()).execute({
      ownerId: owner,
      filename: "projects.xlsx",
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes,
    }),
  ).rejects.toThrow("Dataset CSV must be at most 5 MB");

  expect(await store.list(owner, 50)).toEqual([]);
});

for (const scenario of [
  {
    name: "combined CSV size",
    sheets: ["First", "Second"].map((name) => ({
      name,
      columns: ["a", "b", "c", "d"],
      rows: Array.from({ length: 500 }, () => Array.from({ length: 4 }, () => "界".repeat(490))),
    })),
    error: "Dataset CSV must be at most 5 MB",
  },
  {
    name: "worksheet count",
    sheets: Array.from({ length: 11 }, (_unused, index) => ({
      name: `Sheet${index}`,
      columns: ["City"],
      rows: [["Porto"]],
    })),
    error: "at most 10 worksheets",
  },
  {
    name: "combined row count",
    sheets: ["First", "Second"].map((name) => ({
      name,
      columns: ["City"],
      rows: Array.from({ length: 501 }, () => ["Porto"]),
    })),
    error: "at most 1000 data rows in total",
  },
  {
    name: "invalid second sheet",
    sheets: [
      { name: "Valid", columns: ["City"], rows: [["Porto"]] },
      { name: "Invalid", columns: ["City", "city"], rows: [["Porto", "Lisbon"]] },
    ],
    error: "Column names must be unique",
  },
]) {
  test(`workbook ${scenario.name} rejects the entire import but allows one valid sheet`, async () => {
    const store = new MemoryDatasetStore();
    const importer = new ImportDatasetUseCase(store, new ExcelJsDatasetParser());
    const input = {
      ownerId: owner,
      filename: "projects.xlsx",
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes: await multiSheetWorkbook(scenario.sheets),
    };

    await expect(importer.execute(input)).rejects.toThrow(scenario.error);
    expect(await store.list(owner, 50)).toEqual([]);
    const selected = await importer.execute({ ...input, worksheet: scenario.sheets[0]?.name });

    expect(selected).toHaveLength(1);
    expect(selected[0]?.recordCount).toBe(scenario.sheets[0]?.rows.length);
  });
}

test("a missing worksheet rejects the import without saving", async () => {
  const store = new MemoryDatasetStore();
  const bytes = await multiSheetWorkbook([{ name: "Vehicles", columns: ["VIN"], rows: [["001"]] }]);

  await expect(
    new ImportDatasetUseCase(store, new ExcelJsDatasetParser()).execute({
      ownerId: owner,
      filename: "dealer.xlsx",
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes,
      worksheet: "Missing",
    }),
  ).rejects.toThrow("Choose an existing worksheet");

  expect(await store.list(owner, 50)).toEqual([]);
});

test("imports exactly 10 worksheets and 1000 total rows", async () => {
  const store = new MemoryDatasetStore();
  const sheets = Array.from({ length: 10 }, (_unused, index) => ({
    name: `Sheet${index}`,
    columns: ["ID"],
    rows: Array.from({ length: 100 }, (_row, rowIndex) => [String(rowIndex)]),
  }));
  const bytes = await multiSheetWorkbook(sheets);

  const datasets = await new ImportDatasetUseCase(store, new ExcelJsDatasetParser()).execute({
    ownerId: owner,
    filename: "limit.xlsx",
    mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    bytes,
  });

  expect(datasets).toHaveLength(10);
  expect(datasets.reduce((total, dataset) => total + dataset.recordCount, 0)).toBe(1000);
  expect(await store.list(owner, 50)).toHaveLength(10);
});
