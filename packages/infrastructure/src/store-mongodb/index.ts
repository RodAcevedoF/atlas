export * from "./client.ts";
export * from "./collections.ts";
export * from "./indexes.ts";
export * from "./migration-ledger.ts";
export * from "./migrations.ts";
export * from "./inquiry-run-store.ts";

import type { SignalClassificationUpdate, SignalStorePort } from "@atlas/application";
import type {
  GeoRegion,
  RegionTopicBreakdown,
  Signal,
  SignalSource,
  Topic,
  TopicCount,
  TopicSentimentSummary,
} from "@atlas/domain";
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

  async upsertSignals(signals: Signal[]): Promise<void> {
    if (signals.length === 0) return;
    // One bulkWrite round trip instead of N replaceOne calls. Unordered: the ops are
    // independent (keyed by distinct _id), so the engine can apply them in parallel.
    const operations = signals.map((signal) => {
      const doc: Omit<SignalDoc, "_id"> = {
        source: signal.source,
        topic: signal.topic,
        primaryRegion: signal.primaryRegion,
        regions: coerceRegions(signal.regions),
        sourceCountry: signal.sourceCountry,
        weight: signal.weight,
        sentiment: signal.sentiment,
        title: signal.title,
        ref: signal.ref,
        timestamp: signal.timestamp,
        createdAt: signal.createdAt,
      };
      return { replaceOne: { filter: { _id: signal.id }, replacement: doc, upsert: true } };
    });
    await this.db.collection<SignalDoc>("signals").bulkWrite(operations, { ordered: false });
  }

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

  async listRegionTopicBreakdowns(filter?: {
    source?: SignalSource;
    topic?: Topic;
    region?: GeoRegion;
    since?: Date;
    limit?: number;
  }): Promise<RegionTopicBreakdown[]> {
    const match: Record<string, unknown> = {};
    if (filter?.source) match.source = filter.source;
    if (filter?.topic) match.topic = filter.topic;
    if (filter?.region) match.regions = filter.region;
    if (filter?.since) match.timestamp = { $gte: filter.since };

    const rows = await this.db
      .collection<SignalDoc>("signals")
      .aggregate<{
        _id: GeoRegion;
        signalCount: number;
        totalWeight: number;
        weightedSentiment: number;
        topics: TopicCount[];
      }>([
        { $match: match },
        { $unwind: "$regions" },
        ...(filter?.region ? [{ $match: { regions: filter.region } }] : []),
        {
          $group: {
            _id: { region: "$regions", topic: "$topic" },
            signalCount: { $sum: 1 },
            totalWeight: { $sum: "$weight" },
            weightedSentiment: { $sum: { $multiply: ["$weight", "$sentiment"] } },
          },
        },
        {
          $group: {
            _id: "$_id.region",
            signalCount: { $sum: "$signalCount" },
            totalWeight: { $sum: "$totalWeight" },
            weightedSentiment: { $sum: "$weightedSentiment" },
            topics: {
              $push: {
                topic: "$_id.topic",
                signalCount: "$signalCount",
                totalWeight: "$totalWeight",
              },
            },
          },
        },
      ])
      .toArray();

    const breakdowns = rows.map((row) => ({
      region: row._id,
      signalCount: row.signalCount,
      totalWeight: row.totalWeight,
      sentiment: row.totalWeight > 0 ? row.weightedSentiment / row.totalWeight : 0,
      topics: [...row.topics].sort((left, right) => right.signalCount - left.signalCount),
    }));
    breakdowns.sort((left, right) => right.signalCount - left.signalCount);
    return typeof filter?.limit === "number" ? breakdowns.slice(0, filter.limit) : breakdowns;
  }

  async listTopicSentimentSummaries(filter?: {
    region?: GeoRegion;
    since?: Date;
  }): Promise<TopicSentimentSummary[]> {
    const match: Record<string, unknown> = {};
    if (filter?.region) match.regions = filter.region;
    if (filter?.since) match.timestamp = { $gte: filter.since };

    const rows = await this.db
      .collection<SignalDoc>("signals")
      .aggregate<{
        _id: Topic;
        signalCount: number;
        totalWeight: number;
        weightedSentiment: number;
        sources: SignalSource[];
      }>([
        { $match: match },
        {
          $group: {
            _id: "$topic",
            signalCount: { $sum: 1 },
            totalWeight: { $sum: "$weight" },
            weightedSentiment: { $sum: { $multiply: ["$weight", "$sentiment"] } },
            sources: { $addToSet: "$source" },
          },
        },
      ])
      .toArray();

    return rows.map((row) => ({
      topic: row._id,
      signalCount: row.signalCount,
      sourceCount: row.sources.length,
      temperature: row.totalWeight > 0 ? row.weightedSentiment / row.totalWeight : 0,
    }));
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
