import type { MigrationLedgerPort } from "@atlas/application";
import type { Db } from "mongodb";
import type { MigrationDoc } from "./collections.ts";

const COLLECTION = "_migrations";

export class MongoMigrationLedger implements MigrationLedgerPort {
  constructor(private readonly db: Db) {}

  async listAppliedIds(): Promise<string[]> {
    const docs = await this.db.collection<MigrationDoc>(COLLECTION).find({}).toArray();
    return docs.map((doc) => doc._id);
  }

  async recordApplied(id: string): Promise<void> {
    await this.db
      .collection<MigrationDoc>(COLLECTION)
      .updateOne({ _id: id }, { $set: { appliedAt: new Date() } }, { upsert: true });
  }
}
