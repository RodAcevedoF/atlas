export * from "./client.ts";
export * from "./collections.ts";
export * from "./indexes.ts";
export * from "./migration-ledger.ts";
export * from "./research-run-store.ts";

import type {
  MarketStorePort,
  SignalClassificationUpdate,
  SignalStorePort,
  WorldScanReportFilter,
  WorldScanReportRecord,
  WorldScanReportStorePort,
} from "@atlas/application";
import type {
  AnalysisRun,
  EventId,
  GeoRegion,
  Insight,
  InsightKind,
  Market,
  MarketId,
  MarketSnapshot,
  PredictionEvent,
  PriceTick,
  RegionSummary,
  RegionTopicBreakdown,
  Signal,
  SignalSource,
  Topic,
  TopicCount,
  TopicSentimentSummary,
  Trade,
} from "@atlas/domain";
import { makeEventId, makeMarketId, makeOutcomeId, makeSignalId } from "@atlas/domain";
import { type Db, ObjectId, type WithId } from "mongodb";
import type {
  AnalysisRunDoc,
  InsightDoc,
  MarketDoc,
  MarketSnapshotDoc,
  PredictionEventDoc,
  PriceTickDoc,
  SignalDoc,
  TradeDoc,
  WorldScanReportDoc,
} from "./collections.ts";

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

function docToMarket(doc: MarketDoc): Market {
  const id = makeMarketId(doc._id);
  const regions = coerceRegions(doc.regions);
  return {
    id,
    eventId: doc.eventId ? makeEventId(doc.eventId) : null,
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    primaryRegion: doc.primaryRegion ?? regions[0] ?? DEFAULT_REGION,
    regions,
    status: doc.status,
    outcomes: doc.outcomes.map((outcome) => ({
      id: makeOutcomeId(outcome._id),
      marketId: id,
      name: outcome.name,
      price: outcome.price,
      shares: outcome.shares,
    })),
    volumeUsd: doc.volumeUsd,
    liquidityUsd: doc.liquidityUsd,
    resolvesAt: doc.resolvesAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function docToEvent(doc: PredictionEventDoc): PredictionEvent {
  const regions = coerceRegions(doc.regions);
  return {
    id: makeEventId(doc._id),
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    tags: doc.tags ?? [],
    primaryRegion: doc.primaryRegion ?? regions[0] ?? DEFAULT_REGION,
    regions,
    marketIds: doc.marketIds.map(makeMarketId),
    createdAt: doc.createdAt,
  };
}

function docToInsight(doc: InsightDoc): Insight {
  return {
    id: doc._id,
    marketId: doc.marketId ? makeMarketId(doc.marketId) : null,
    eventId: doc.eventId ? makeEventId(doc.eventId) : null,
    kind: doc.kind,
    summary: doc.summary,
    narrative: doc.narrative,
    signals: doc.signals as Insight["signals"],
    model: doc.model,
    runId: doc.runId,
    generatedAt: doc.generatedAt,
  };
}

function docToAnalysisRun(doc: AnalysisRunDoc): AnalysisRun {
  return {
    id: doc._id,
    kind: doc.kind,
    marketId: doc.marketId ? makeMarketId(doc.marketId) : null,
    eventId: doc.eventId ? makeEventId(doc.eventId) : null,
    status: doc.status,
    currentNode: doc.currentNode,
    startedAt: doc.startedAt,
    completedAt: doc.completedAt,
    error: doc.error,
  };
}

function docToWorldScanReportRecord(doc: WithId<WorldScanReportDoc>): WorldScanReportRecord {
  return {
    id: doc._id.toHexString(),
    generatedAt: doc.report.header.generatedAt,
    scope: {
      topic: doc.scope.topic ?? undefined,
      region: doc.scope.region ?? undefined,
      since: doc.scope.since ?? undefined,
    },
    report: doc.report,
  };
}

export class MongoMarketStore
  implements MarketStorePort, SignalStorePort, WorldScanReportStorePort
{
  constructor(private readonly db: Db) {}

  async upsertMarket(market: Market): Promise<void> {
    const regions = coerceRegions(market.regions);
    const doc: Omit<MarketDoc, "_id"> = {
      eventId: market.eventId,
      slug: market.slug,
      title: market.title,
      description: market.description,
      category: market.category,
      primaryRegion: market.primaryRegion,
      regions,
      status: market.status,
      outcomes: market.outcomes.map((outcome) => ({
        _id: outcome.id,
        name: outcome.name,
        price: outcome.price,
        shares: outcome.shares,
      })),
      volumeUsd: market.volumeUsd,
      liquidityUsd: market.liquidityUsd,
      resolvesAt: market.resolvesAt,
      createdAt: market.createdAt,
      updatedAt: market.updatedAt,
    };
    await this.db
      .collection<MarketDoc>("markets")
      .replaceOne({ _id: market.id }, doc, { upsert: true });
  }

  async findMarket(id: MarketId): Promise<Market | null> {
    const doc = await this.db.collection<MarketDoc>("markets").findOne({ _id: id });
    return doc ? docToMarket(doc) : null;
  }

  async listMarkets(filter?: {
    status?: Market["status"];
    category?: Market["category"];
    limit?: number;
  }): Promise<Market[]> {
    const query: Partial<MarketDoc> = {};
    if (filter?.status) query.status = filter.status as MarketDoc["status"];
    if (filter?.category) query.category = filter.category as MarketDoc["category"];
    const docs = await this.db
      .collection<MarketDoc>("markets")
      .find(query)
      .limit(filter?.limit ?? 0)
      .toArray();
    return docs.map((doc) => docToMarket(doc));
  }

  async upsertEvent(event: PredictionEvent): Promise<void> {
    const regions = coerceRegions(event.regions);
    const doc: Omit<PredictionEventDoc, "_id"> = {
      slug: event.slug,
      title: event.title,
      description: event.description,
      category: event.category,
      tags: event.tags,
      primaryRegion: event.primaryRegion,
      regions,
      marketIds: event.marketIds as string[],
      createdAt: event.createdAt,
    };
    await this.db
      .collection<PredictionEventDoc>("prediction_events")
      .replaceOne({ _id: event.id }, doc, { upsert: true });
  }

  async findEvent(id: EventId): Promise<PredictionEvent | null> {
    const doc = await this.db
      .collection<PredictionEventDoc>("prediction_events")
      .findOne({ _id: id });
    return doc ? docToEvent(doc) : null;
  }

  async listEvents(filter?: { limit?: number }): Promise<PredictionEvent[]> {
    const docs = await this.db
      .collection<PredictionEventDoc>("prediction_events")
      .find({})
      .limit(filter?.limit ?? 0)
      .toArray();
    return docs.map((doc) => docToEvent(doc));
  }

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

  async listRegionSummaries(filter?: {
    status?: Market["status"];
    category?: Market["category"];
    limit?: number;
    region?: GeoRegion;
  }): Promise<RegionSummary[]> {
    const marketMatch: Record<string, unknown> = {};
    if (filter?.status) marketMatch.status = filter.status;
    if (filter?.category) marketMatch.category = filter.category;
    if (filter?.region) marketMatch.regions = filter.region;

    const eventMatch: Record<string, unknown> = {};
    if (filter?.category) eventMatch.category = filter.category;
    if (filter?.region) eventMatch.regions = filter.region;

    const [marketRows, eventRows] = await Promise.all([
      this.db
        .collection<MarketDoc>("markets")
        .aggregate<{
          _id: GeoRegion;
          marketCount: number;
          activeMarketCount: number;
          totalVolumeUsd: number;
          totalLiquidityUsd: number;
        }>([
          { $match: marketMatch },
          { $unwind: "$regions" },
          {
            $group: {
              _id: "$regions",
              marketCount: { $sum: 1 },
              activeMarketCount: {
                $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
              },
              totalVolumeUsd: { $sum: "$volumeUsd" },
              totalLiquidityUsd: { $sum: "$liquidityUsd" },
            },
          },
        ])
        .toArray(),
      this.db
        .collection<PredictionEventDoc>("prediction_events")
        .aggregate<{ _id: GeoRegion; eventCount: number }>([
          { $match: eventMatch },
          { $unwind: "$regions" },
          {
            $group: {
              _id: "$regions",
              eventCount: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const eventCounts = new Map<GeoRegion, number>(
      eventRows.map((row) => [row._id, row.eventCount]),
    );
    const summaries = marketRows.map((row) => ({
      region: row._id,
      marketCount: row.marketCount,
      eventCount: eventCounts.get(row._id) ?? 0,
      activeMarketCount: row.activeMarketCount,
      totalVolumeUsd: row.totalVolumeUsd,
      totalLiquidityUsd: row.totalLiquidityUsd,
    }));
    summaries.sort((left, right) => right.totalVolumeUsd - left.totalVolumeUsd);
    return typeof filter?.limit === "number" ? summaries.slice(0, filter.limit) : summaries;
  }

  async insertMarketSnapshots(snapshots: MarketSnapshot[]): Promise<void> {
    if (snapshots.length === 0) return;
    const docs = snapshots.map((snapshot) => ({
      marketId: snapshot.marketId as string,
      volumeUsd: snapshot.volumeUsd,
      liquidityUsd: snapshot.liquidityUsd,
      outcomes: snapshot.outcomes.map((outcome) => ({
        outcomeId: outcome.outcomeId as string,
        price: outcome.price,
      })),
      timestamp: snapshot.timestamp,
    }));
    await this.db.collection<MarketSnapshotDoc>("market_snapshots").insertMany(docs);
  }

  async getMarketSnapshots(filter?: {
    since?: Date;
    marketId?: MarketId;
    limit?: number;
  }): Promise<MarketSnapshot[]> {
    const match: Record<string, unknown> = {};
    if (filter?.marketId) match.marketId = filter.marketId as string;
    if (filter?.since) match.timestamp = { $gte: filter.since };

    const docs = await this.db
      .collection<MarketSnapshotDoc>("market_snapshots")
      .find(match)
      .sort({ marketId: 1, timestamp: -1 })
      .limit(filter?.limit ?? 0)
      .toArray();
    return docs.map((doc) => ({
      marketId: makeMarketId(doc.marketId),
      volumeUsd: doc.volumeUsd,
      liquidityUsd: doc.liquidityUsd,
      outcomes: doc.outcomes.map((outcome) => ({
        outcomeId: makeOutcomeId(outcome.outcomeId),
        price: outcome.price,
      })),
      timestamp: doc.timestamp,
    }));
  }

  async insertPriceTick(tick: PriceTick): Promise<void> {
    await this.db.collection("price_ticks").insertOne({
      marketId: tick.marketId as string,
      outcomeId: tick.outcomeId as string,
      price: tick.price,
      timestamp: tick.timestamp,
    });
  }

  async getPriceHistory(marketId: MarketId, from: Date, to: Date): Promise<PriceTick[]> {
    const docs = await this.db
      .collection<PriceTickDoc>("price_ticks")
      .find({
        marketId: marketId as string,
        timestamp: { $gte: from, $lte: to },
      })
      .sort({ timestamp: 1 })
      .toArray();
    return docs.map((doc) => ({
      marketId: makeMarketId(doc.marketId),
      outcomeId: makeOutcomeId(doc.outcomeId),
      price: doc.price,
      timestamp: doc.timestamp,
    }));
  }

  async insertTrade(trade: Trade): Promise<void> {
    const doc: TradeDoc = {
      _id: trade.id,
      marketId: trade.marketId as string,
      outcomeId: trade.outcomeId as string,
      side: trade.side,
      size: trade.size,
      price: trade.price,
      walletAddress: trade.walletAddress,
      timestamp: trade.timestamp,
    };
    await this.db.collection<TradeDoc>("trades").insertOne(doc);
  }

  async getRecentTrades(marketId: MarketId, limit: number): Promise<Trade[]> {
    const docs = await this.db
      .collection<TradeDoc>("trades")
      .find({ marketId: marketId as string })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return docs.map((doc) => ({
      id: doc._id,
      marketId: makeMarketId(doc.marketId),
      outcomeId: makeOutcomeId(doc.outcomeId),
      side: doc.side,
      size: doc.size,
      price: doc.price,
      walletAddress: doc.walletAddress,
      timestamp: doc.timestamp,
    }));
  }

  async saveInsight(insight: Insight): Promise<void> {
    const doc: Omit<InsightDoc, "_id"> = {
      marketId: insight.marketId,
      eventId: insight.eventId,
      kind: insight.kind,
      summary: insight.summary,
      narrative: insight.narrative,
      signals: insight.signals as InsightDoc["signals"],
      model: insight.model,
      runId: insight.runId,
      generatedAt: insight.generatedAt,
    };
    await this.db
      .collection<InsightDoc>("insights")
      .replaceOne({ _id: insight.id }, doc, { upsert: true });
  }

  async findInsight(id: string): Promise<Insight | null> {
    const doc = await this.db.collection<InsightDoc>("insights").findOne({ _id: id });
    return doc ? docToInsight(doc) : null;
  }

  async listInsights(filter: {
    marketId?: MarketId;
    eventId?: EventId;
    kind?: InsightKind;
    limit?: number;
  }): Promise<Insight[]> {
    const query: Partial<InsightDoc> = {};
    if (filter.marketId) query.marketId = filter.marketId as string;
    if (filter.eventId) query.eventId = filter.eventId as string;
    if (filter.kind) query.kind = filter.kind;
    const docs = await this.db
      .collection<InsightDoc>("insights")
      .find(query)
      .sort({ generatedAt: -1 })
      .limit(filter.limit ?? 0)
      .toArray();
    return docs.map((doc) => docToInsight(doc));
  }

  async saveAnalysisRun(run: AnalysisRun): Promise<void> {
    const doc: Omit<AnalysisRunDoc, "_id"> = {
      kind: run.kind,
      marketId: run.marketId,
      eventId: run.eventId,
      status: run.status,
      currentNode: run.currentNode,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      error: run.error,
    };
    await this.db
      .collection<AnalysisRunDoc>("analysis_runs")
      .replaceOne({ _id: run.id }, doc, { upsert: true });
  }

  async updateAnalysisRun(id: string, patch: Partial<AnalysisRun>): Promise<void> {
    await this.db
      .collection<AnalysisRunDoc>("analysis_runs")
      .updateOne({ _id: id }, { $set: patch as Partial<AnalysisRunDoc> });
  }

  async findAnalysisRun(id: string): Promise<AnalysisRun | null> {
    const doc = await this.db.collection<AnalysisRunDoc>("analysis_runs").findOne({ _id: id });
    return doc ? docToAnalysisRun(doc) : null;
  }

  async saveWorldScanReport(record: WorldScanReportRecord): Promise<void> {
    const doc: WorldScanReportDoc = {
      scope: {
        topic: record.scope.topic ?? null,
        region: record.scope.region ?? null,
        since: record.scope.since ?? null,
      },
      generatedAt: new Date(record.generatedAt),
      report: record.report,
    };
    await this.db.collection<WorldScanReportDoc>("world_scan_reports").insertOne(doc);
  }

  async listWorldScanReports(filter?: WorldScanReportFilter): Promise<WorldScanReportRecord[]> {
    const match: Record<string, unknown> = {};
    if (filter?.topic) match["scope.topic"] = filter.topic;
    if (filter?.region) match["scope.region"] = filter.region;

    const docs = await this.db
      .collection<WorldScanReportDoc>("world_scan_reports")
      .find(match)
      .sort({ generatedAt: -1 })
      .limit(filter?.limit ?? 20)
      .toArray();
    return docs.map(docToWorldScanReportRecord);
  }

  async listWorldScanReportsByIds(ids: string[]): Promise<WorldScanReportRecord[]> {
    const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (objectIds.length === 0) return [];
    const docs = await this.db
      .collection<WorldScanReportDoc>("world_scan_reports")
      .find({ _id: { $in: objectIds } })
      .sort({ generatedAt: -1 })
      .toArray();
    return docs.map(docToWorldScanReportRecord);
  }
}
