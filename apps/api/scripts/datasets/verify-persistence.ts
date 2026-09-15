import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { type SavedDataset, makeUserId } from "@atlas/domain";
import { MongooseDatasetStore, connectDatasetDatabase } from "@atlas/infra/dataset-mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
const connection = await connectDatasetDatabase(uri, "atlas_course_demo");
try {
  const store = new MongooseDatasetStore(connection);
  await store.initialize();
  const owner = makeUserId("course-demo-owner-v1");
  const other = makeUserId("course-other-owner-v1");
  const id = `dataset-check-${crypto.randomUUID()}`;
  const saved: SavedDataset = {
    dataset: {
      id,
      ownerId: owner,
      name: "verification.csv",
      columns: ["city"],
      recordCount: 2,
      createdAt: new Date().toISOString(),
    },
    records: ["Porto", "Valencia"].map((city, position) => ({
      datasetId: id,
      ownerId: owner,
      position,
      values: [city],
    })),
  };
  await store.saveMany([saved]);
  assert.deepEqual(await store.find(id, owner), saved);
  assert.equal(await store.find(id, other), null);
  assert.equal(
    (await store.list(other, 50)).some((dataset) => dataset.id === id),
    false,
  );
  await store.delete(id, other);
  assert.deepEqual(await store.find(id, owner), saved);
  await assert.rejects(
    store.saveMany([
      { ...saved, records: saved.records.map((record) => ({ ...record, position: 0 })) },
    ]),
  );
  assert.deepEqual(await store.find(id, owner), saved);
  await store.delete(id, owner);
  assert.equal(await store.find(id, owner), null);
  assert.equal(await connection.collection("dataset_records").countDocuments({ datasetId: id }), 0);
  await writeFile(
    "/tmp/atlas-dataset-persistence.json",
    `${JSON.stringify(
      {
        database: "atlas_course_demo",
        ownerIsolation: true,
        transactionRollback: true,
        deletionCascades: true,
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write("Dataset ownership, transaction rollback and deletion verified\n");
} finally {
  await connection.close();
}
