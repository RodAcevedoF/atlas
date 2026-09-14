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

const owner = makeUserId("owner");
const stranger = makeUserId("stranger");

test("import stores all rows, lists only owned datasets and permits reuse", async () => {
  const store = new MemoryDatasetStore();
  const importer = new ImportDatasetUseCase(store, new ExcelJsDatasetParser());
  const dataset = await importer.execute({
    ownerId: owner,
    filename: "projects.csv",
    mediaType: "text/csv",
    bytes: new TextEncoder().encode("city,budget\nPorto,120000\nValencia,130000\n"),
  });
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
