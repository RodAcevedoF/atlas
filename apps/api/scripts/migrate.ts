import { RunMigrationsUseCase } from "@atlas/application";
import {
  MongoMigrationLedger,
  MongoSignalStore,
  createMongoClient,
  dropGdeltEraInquiryRuns,
  dropSavedReportIds,
  emptyGdeltEraInquiryRuns,
  regroupInquiryPlacesOntoCoordinates,
  renameResearchRunsToInquiryRuns,
} from "@atlas/infra/store-mongodb";
import { buildMigrations } from "./migrations.ts";

async function migrate(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const dbName = process.env.MONGODB_DB_NAME ?? "atlas";
  const dryRun = process.argv.includes("--dry-run");

  const client = createMongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    const store = new MongoSignalStore(db);
    const ledger = new MongoMigrationLedger(db);

    const result = await new RunMigrationsUseCase(
      ledger,
      buildMigrations(store, [
        renameResearchRunsToInquiryRuns(db),
        dropSavedReportIds(db),
        emptyGdeltEraInquiryRuns(db),
        dropGdeltEraInquiryRuns(db),
        regroupInquiryPlacesOntoCoordinates(db),
      ]),
    ).execute({
      dryRun,
    });

    for (const id of result.skipped) console.log(`skipped ${id} (already applied)`);
    for (const run of result.ran) {
      console.log(`${dryRun ? "would apply" : "applied"} ${run.id} — ${run.summary}`);
    }
    if (result.ran.length === 0) console.log("Nothing to migrate.");
  } finally {
    await client.close();
  }
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
