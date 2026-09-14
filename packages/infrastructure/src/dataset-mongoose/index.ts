import type { DatasetStorePort } from "@atlas/application";
import type { Dataset, SavedDataset, UserId } from "@atlas/domain";
import { makeUserId } from "@atlas/domain";
import { type Connection, createConnection } from "mongoose";
import { type DatasetDocument, makeDatasetModels } from "./models.ts";

function datasetFrom(document: DatasetDocument): Dataset {
  return {
    id: document._id,
    ownerId: makeUserId(document.ownerId),
    name: document.name,
    columns: document.columns,
    recordCount: document.recordCount,
    createdAt: document.createdAt,
  };
}

export class MongooseDatasetStore implements DatasetStorePort {
  private readonly models;
  constructor(private readonly connection: Connection) {
    this.models = makeDatasetModels(connection);
  }

  async initialize(): Promise<void> {
    await Promise.all([this.models.datasets.init(), this.models.records.init()]);
  }

  async save(input: SavedDataset): Promise<void> {
    const { id, ...fields } = input.dataset;
    await this.connection.transaction(async (session) => {
      await this.models.datasets.replaceOne(
        { _id: id, ownerId: fields.ownerId },
        { _id: id, ...fields },
        { upsert: true, session, runValidators: true },
      );
      await this.models.records.deleteMany({ datasetId: id, ownerId: fields.ownerId }, { session });
      await this.models.records.insertMany(input.records, { session });
    });
  }

  async list(ownerId: UserId, limit: number): Promise<Dataset[]> {
    const documents = await this.models.datasets
      .find({ ownerId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean();
    return documents.map(datasetFrom);
  }

  async find(id: string, ownerId: UserId): Promise<SavedDataset | null> {
    const document = await this.models.datasets.findOne({ _id: id, ownerId }).lean();
    if (!document) return null;
    const records = await this.models.records
      .find({ datasetId: id, ownerId })
      .sort({ position: 1 })
      .lean();
    return {
      dataset: datasetFrom(document),
      records: records.map((record) => ({
        datasetId: record.datasetId,
        ownerId: makeUserId(record.ownerId),
        position: record.position,
        values: record.values,
      })),
    };
  }

  async delete(id: string, ownerId: UserId): Promise<void> {
    await this.connection.transaction(async (session) => {
      await this.models.records.deleteMany({ datasetId: id, ownerId }, { session });
      await this.models.datasets.deleteOne({ _id: id, ownerId }, { session });
    });
  }
}

export function connectDatasetDatabase(uri: string, dbName: string): Promise<Connection> {
  return createConnection(uri, { dbName }).asPromise();
}
