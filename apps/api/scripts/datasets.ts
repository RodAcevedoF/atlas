import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { datasetCsv, validateDatasetTable } from "@atlas/application";
import { type DatasetTable, type SavedDataset, emptyProfile, makeUserId } from "@atlas/domain";
import { MongooseDatasetStore, connectDatasetDatabase } from "@atlas/infra/dataset-mongoose";
import { ExcelJsDatasetParser, datasetWorkbook } from "@atlas/infra/tabular-parser";
import { infrastructureProjects } from "./datasets/demo.ts";

const DATABASE = "atlas_course_demo";
const DATASET_ID = "course-infrastructure-projects-v1";
const OWNER_ID = makeUserId("course-demo-owner-v1");
const parser = new ExcelJsDatasetParser();

async function readTable(filename: string): Promise<DatasetTable> {
  const mediaType = filename.toLowerCase().endsWith(".csv")
    ? "text/csv"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!/\.(csv|xlsx)$/i.test(filename)) throw new Error("Choose a .csv or .xlsx input");
  return validateDatasetTable(
    await parser.read({ filename: basename(filename), mediaType, bytes: await readFile(filename) }),
  );
}

async function generate(directory: string): Promise<void> {
  const table = validateDatasetTable(infrastructureProjects());
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(resolve(directory, "infrastructure-projects.csv"), datasetCsv(table)),
    datasetWorkbook(table).then((bytes) =>
      writeFile(resolve(directory, "infrastructure-projects.xlsx"), bytes),
    ),
    writeFile(
      resolve(directory, "manifest.json"),
      `${JSON.stringify(
        {
          name: "Synthetic infrastructure projects",
          recordCount: table.rows.length,
          provenance:
            "Deterministic fictional projects in real cities; no retrieved claims or personal information",
          columns: {
            project_id: "Stable demo identifier",
            project: "Explicitly fictional project name",
            city: "City name",
            country: "Country name",
            category: "Infrastructure category",
            status: "Fictional planning stage",
            investment_eur: "Fictional estimated investment, whole euros",
            research_question: "Question for external investigation, not a factual assertion",
            data_origin: "Synthetic-data label",
          },
        },
        null,
        2,
      )}\n`,
    ),
  ]);
  const [csv, xlsx] = await Promise.all([
    readTable(resolve(directory, "infrastructure-projects.csv")),
    readTable(resolve(directory, "infrastructure-projects.xlsx")),
  ]);
  if (!isDeepStrictEqual(csv, xlsx) || !isDeepStrictEqual(csv, table))
    throw new Error("Workbook and CSV disagree");
  process.stdout.write(`Generated and verified ${table.rows.length} records in CSV and XLSX\n`);
}

async function seed(filename: string, reportPath: string): Promise<void> {
  if (!process.argv.includes("--apply"))
    throw new Error("Seed requires --apply and always targets atlas_course_demo");
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const table = await readTable(filename);
  if (!isDeepStrictEqual(table, infrastructureProjects()))
    throw new Error("Course seed accepts only the generated synthetic project dataset");
  const connection = await connectDatasetDatabase(uri, DATABASE);
  try {
    const store = new MongooseDatasetStore(connection);
    await store.initialize();
    await connection.collection("users").updateOne(
      { _id: OWNER_ID },
      {
        $setOnInsert: {
          email: "atlas-course@example.com",
          emailVerified: false,
          role: "user",
          identities: [],
          authenticationVersion: 0,
          profile: emptyProfile(),
          createdAt: new Date("2026-01-01T00:00:00Z"),
        },
      },
      { upsert: true },
    );
    const saved: SavedDataset = {
      dataset: {
        id: DATASET_ID,
        ownerId: OWNER_ID,
        name: "infrastructure-projects.csv",
        columns: table.columns,
        recordCount: table.rows.length,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      records: table.rows.map((values, position) => ({
        datasetId: DATASET_ID,
        ownerId: OWNER_ID,
        position,
        values,
      })),
    };
    await store.save(saved);
    const first = await store.find(DATASET_ID, OWNER_ID);
    await store.save(saved);
    const second = await store.find(DATASET_ID, OWNER_ID);
    if (!isDeepStrictEqual(first, saved) || !isDeepStrictEqual(second, saved))
      throw new Error("Seed readback or repeatability failed");
    const counts = await Promise.all([
      connection.collection<{ _id: string }>("datasets").countDocuments({ _id: DATASET_ID }),
      connection.collection("dataset_records").countDocuments({ datasetId: DATASET_ID }),
      connection.collection("users").countDocuments({ _id: OWNER_ID }),
    ]);
    if (counts[0] !== 1 || counts[1] !== 120 || counts[2] !== 1)
      throw new Error("Seed counts are inconsistent");
    await writeFile(
      reportPath,
      `${JSON.stringify(
        {
          database: DATABASE,
          datasets: counts[0],
          records: counts[1],
          owners: counts[2],
          referencesValid: true,
          repeatable: true,
        },
        null,
        2,
      )}\n`,
    );
    process.stdout.write(`Verified 120 records and owner references in ${DATABASE}\n`);
  } finally {
    await connection.close();
  }
}

const command = process.argv[2];
if (command === "generate") {
  await generate(resolve(process.argv[3] ?? "data/course"));
} else if (command === "seed") {
  const filename = process.argv[3];
  const reportPath = process.argv[4];
  if (!filename || !reportPath || reportPath === "--apply")
    throw new Error("Usage: datasets.ts seed <csv-or-xlsx> <report.json> --apply");
  await seed(resolve(filename), resolve(reportPath));
} else {
  throw new Error(
    "Usage: datasets.ts generate [directory] | seed <csv-or-xlsx> <report.json> --apply",
  );
}
