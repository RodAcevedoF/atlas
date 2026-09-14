import { type Connection, Schema } from "mongoose";

export interface DatasetDocument {
  _id: string;
  ownerId: string;
  name: string;
  columns: string[];
  recordCount: number;
  createdAt: string;
}

export interface DatasetRecordDocument {
  datasetId: string;
  ownerId: string;
  position: number;
  values: string[];
}

export function makeDatasetModels(connection: Connection) {
  const datasetSchema = new Schema<DatasetDocument>(
    {
      _id: { type: String, required: true },
      ownerId: { type: String, required: true, ref: "User" },
      name: { type: String, required: true, maxlength: 180 },
      columns: { type: [String], required: true },
      recordCount: { type: Number, required: true, min: 1, max: 1000 },
      createdAt: { type: String, required: true },
    },
    { versionKey: false, collection: "datasets" },
  );
  datasetSchema.index({ ownerId: 1, createdAt: -1 });
  const recordSchema = new Schema<DatasetRecordDocument>(
    {
      datasetId: { type: String, required: true, ref: "Dataset" },
      ownerId: { type: String, required: true, ref: "User" },
      position: { type: Number, required: true, min: 0 },
      values: { type: [String], required: true },
    },
    { versionKey: false, collection: "dataset_records" },
  );
  recordSchema.index({ datasetId: 1, position: 1 }, { unique: true });
  recordSchema.index({ ownerId: 1 });
  return {
    datasets: connection.model("Dataset", datasetSchema),
    records: connection.model("DatasetRecord", recordSchema),
  };
}
