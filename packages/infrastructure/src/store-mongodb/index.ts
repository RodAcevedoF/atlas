export * from "./client.ts";
export * from "./collections.ts";
export * from "./indexes.ts";
export * from "./migration-ledger.ts";
export * from "./migrations.ts";
export * from "./inquiry-run-store.ts";

import type { SignalClassificationUpdate, SignalStorePort } from "@atlas/application";
import type { GeoRegion, Signal, SignalSource, Topic } from "@atlas/domain";
import { makeSignalId } from "@atlas/domain";
import type { Db } from "mongodb";
import type { SignalDoc } from "./collections.ts";

const DEFAULT_REGION: GeoRegion = "global";

function coerceRegions(regions: GeoRegion[] | undefined): GeoRegion[] {
  if (!regions || regions.length === 0) return [DEFAULT_REGION];
  return [...new Set(regions)];
}

function docToSignal(doc: SignalDoc): Signal {
  return {
    id: makeSignalId(doc._id),
    source: doc.source,
    topic: doc.topic,
    primaryRegion: doc.primaryRegion,
    regions: coerceRegions(doc.regions),
    sourceCountry: doc.sourceCountry ?? null,
    weight: doc.weight,
    sentiment: doc.sentiment ?? 0,
    title: doc.title,
    ref: doc.ref,
    timestamp: doc.timestamp,
    createdAt: doc.createdAt,
  };
}

export class MongoSignalStore implements SignalStorePort {
  constructor(private readonly db: Db) {}

  async updateSignalClassifications(updates: SignalClassificationUpdate[]): Promise<void> {
    if (updates.length === 0) return;
    const operations = updates.map((update) => ({
      updateOne: {
        filter: { _id: update.id },
        update: { $set: { topic: update.topic, sentiment: update.sentiment } },
      },
    }));
    await this.db.collection<SignalDoc>("signals").bulkWrite(operations, { ordered: false });
  }

  async listSignals(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<Signal[]> {
    const match: Record<string, unknown> = {};
    if (filter?.source) match.source = filter.source;
    if (filter?.topic) match.topic = filter.topic;
    if (filter?.region) match.regions = filter.region;
    if (filter?.since) match.timestamp = { $gte: filter.since };

    const docs = await this.db
      .collection<SignalDoc>("signals")
      .find(match)
      .sort({ timestamp: -1 })
      .limit(filter?.limit ?? 0)
      .toArray();
    return docs.map(docToSignal);
  }
}
