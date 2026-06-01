export * from './client.ts';
export * from './collections.ts';
export * from './indexes.ts';

import type { Db } from 'mongodb';
import type { MarketStorePort } from '@atlas/application';
import type {
	AnalysisRun,
	EventId,
	GeoRegion,
	Insight,
	InsightKind,
	Market,
	MarketId,
	PredictionEvent,
	PriceTick,
	RegionSummary,
	Trade,
	Watchlist,
} from '@atlas/domain';
import { makeEventId, makeMarketId, makeOutcomeId } from '@atlas/domain';
import type {
	AnalysisRunDoc,
	InsightDoc,
	MarketDoc,
	PredictionEventDoc,
	PriceTickDoc,
	TradeDoc,
	WatchlistDoc,
} from './collections.ts';

const DEFAULT_REGION: GeoRegion = 'global';

function coerceRegions(regions: GeoRegion[] | undefined): GeoRegion[] {
	if (!regions || regions.length === 0) return [DEFAULT_REGION];
	return [...new Set(regions)];
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
		outcomes: doc.outcomes.map((o) => ({
			id: makeOutcomeId(o._id),
			marketId: id,
			name: o.name,
			price: o.price,
			shares: o.shares,
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
		signals: doc.signals as Insight['signals'],
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

function docToWatchlist(doc: WatchlistDoc): Watchlist {
	return {
		id: doc._id,
		userId: doc.userId,
		marketIds: doc.marketIds.map(makeMarketId),
		createdAt: doc.createdAt,
		updatedAt: doc.updatedAt,
	};
}

export class MongoMarketStore implements MarketStorePort {
	constructor(private readonly db: Db) {}

	async upsertMarket(market: Market): Promise<void> {
		const regions = coerceRegions(market.regions);
		const doc: Omit<MarketDoc, '_id'> = {
			eventId: market.eventId,
			slug: market.slug,
			title: market.title,
			description: market.description,
			category: market.category,
			primaryRegion: market.primaryRegion,
			regions,
			status: market.status,
			outcomes: market.outcomes.map((o) => ({
				_id: o.id,
				name: o.name,
				price: o.price,
				shares: o.shares,
			})),
			volumeUsd: market.volumeUsd,
			liquidityUsd: market.liquidityUsd,
			resolvesAt: market.resolvesAt,
			createdAt: market.createdAt,
			updatedAt: market.updatedAt,
		};
		await this.db
			.collection<MarketDoc>('markets')
			.replaceOne({ _id: market.id }, doc, { upsert: true });
	}

	async findMarket(id: MarketId): Promise<Market | null> {
		const doc = await this.db
			.collection<MarketDoc>('markets')
			.findOne({ _id: id });
		return doc ? docToMarket(doc as unknown as MarketDoc) : null;
	}

	async listMarkets(filter?: {
		status?: Market['status'];
		category?: Market['category'];
		limit?: number;
	}): Promise<Market[]> {
		const query: Partial<MarketDoc> = {};
		if (filter?.status) query.status = filter.status as MarketDoc['status'];
		if (filter?.category)
			query.category = filter.category as MarketDoc['category'];
		const docs = await this.db
			.collection<MarketDoc>('markets')
			.find(query)
			.limit(filter?.limit ?? 0)
			.toArray();
		return docs.map((d) => docToMarket(d as unknown as MarketDoc));
	}

	async upsertEvent(event: PredictionEvent): Promise<void> {
		const regions = coerceRegions(event.regions);
		const doc: Omit<PredictionEventDoc, '_id'> = {
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
			.collection<PredictionEventDoc>('prediction_events')
			.replaceOne({ _id: event.id }, doc, { upsert: true });
	}

	async findEvent(id: EventId): Promise<PredictionEvent | null> {
		const doc = await this.db
			.collection<PredictionEventDoc>('prediction_events')
			.findOne({ _id: id });
		return doc ? docToEvent(doc as unknown as PredictionEventDoc) : null;
	}

	async listEvents(filter?: { limit?: number }): Promise<PredictionEvent[]> {
		const docs = await this.db
			.collection<PredictionEventDoc>('prediction_events')
			.find({})
			.limit(filter?.limit ?? 0)
			.toArray();
		return docs.map((d) => docToEvent(d as unknown as PredictionEventDoc));
	}

	async listRegionSummaries(filter?: {
		status?: Market['status'];
		category?: Market['category'];
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
				.collection<MarketDoc>('markets')
				.aggregate<{
					_id: GeoRegion;
					marketCount: number;
					activeMarketCount: number;
					totalVolumeUsd: number;
					totalLiquidityUsd: number;
				}>([
					{ $match: marketMatch },
					{ $unwind: '$regions' },
					{
						$group: {
							_id: '$regions',
							marketCount: { $sum: 1 },
							activeMarketCount: {
								$sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
							},
							totalVolumeUsd: { $sum: '$volumeUsd' },
							totalLiquidityUsd: { $sum: '$liquidityUsd' },
						},
					},
				])
				.toArray(),
			this.db
				.collection<PredictionEventDoc>('prediction_events')
				.aggregate<{ _id: GeoRegion; eventCount: number }>([
					{ $match: eventMatch },
					{ $unwind: '$regions' },
					{
						$group: {
							_id: '$regions',
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
		return typeof filter?.limit === 'number' ?
				summaries.slice(0, filter.limit)
			:	summaries;
	}

	async insertPriceTick(tick: PriceTick): Promise<void> {
		await this.db.collection('price_ticks').insertOne({
			marketId: tick.marketId as string,
			outcomeId: tick.outcomeId as string,
			price: tick.price,
			timestamp: tick.timestamp,
		});
	}

	async getPriceHistory(
		marketId: MarketId,
		from: Date,
		to: Date,
	): Promise<PriceTick[]> {
		const docs = await this.db
			.collection<PriceTickDoc>('price_ticks')
			.find({
				marketId: marketId as string,
				timestamp: { $gte: from, $lte: to },
			})
			.sort({ timestamp: 1 })
			.toArray();
		return docs.map((d) => ({
			marketId: makeMarketId(d.marketId),
			outcomeId: makeOutcomeId(d.outcomeId),
			price: d.price,
			timestamp: d.timestamp,
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
		await this.db.collection<TradeDoc>('trades').insertOne(doc);
	}

	async getRecentTrades(marketId: MarketId, limit: number): Promise<Trade[]> {
		const docs = await this.db
			.collection<TradeDoc>('trades')
			.find({ marketId: marketId as string })
			.sort({ timestamp: -1 })
			.limit(limit)
			.toArray();
		return docs.map((d) => ({
			id: d._id,
			marketId: makeMarketId(d.marketId),
			outcomeId: makeOutcomeId(d.outcomeId),
			side: d.side,
			size: d.size,
			price: d.price,
			walletAddress: d.walletAddress,
			timestamp: d.timestamp,
		}));
	}

	async saveInsight(insight: Insight): Promise<void> {
		const doc: Omit<InsightDoc, '_id'> = {
			marketId: insight.marketId,
			eventId: insight.eventId,
			kind: insight.kind,
			summary: insight.summary,
			narrative: insight.narrative,
			signals: insight.signals as InsightDoc['signals'],
			model: insight.model,
			runId: insight.runId,
			generatedAt: insight.generatedAt,
		};
		await this.db
			.collection<InsightDoc>('insights')
			.replaceOne({ _id: insight.id }, doc, { upsert: true });
	}

	async findInsight(id: string): Promise<Insight | null> {
		const doc = await this.db
			.collection<InsightDoc>('insights')
			.findOne({ _id: id });
		return doc ? docToInsight(doc as unknown as InsightDoc) : null;
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
			.collection<InsightDoc>('insights')
			.find(query)
			.sort({ generatedAt: -1 })
			.limit(filter.limit ?? 0)
			.toArray();
		return docs.map((d) => docToInsight(d as unknown as InsightDoc));
	}

	async saveAnalysisRun(run: AnalysisRun): Promise<void> {
		const doc: Omit<AnalysisRunDoc, '_id'> = {
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
			.collection<AnalysisRunDoc>('analysis_runs')
			.replaceOne({ _id: run.id }, doc, { upsert: true });
	}

	async updateAnalysisRun(
		id: string,
		patch: Partial<AnalysisRun>,
	): Promise<void> {
		await this.db
			.collection<AnalysisRunDoc>('analysis_runs')
			.updateOne({ _id: id }, { $set: patch as Partial<AnalysisRunDoc> });
	}

	async findAnalysisRun(id: string): Promise<AnalysisRun | null> {
		const doc = await this.db
			.collection<AnalysisRunDoc>('analysis_runs')
			.findOne({ _id: id });
		return doc ? docToAnalysisRun(doc as unknown as AnalysisRunDoc) : null;
	}

	async findWatchlist(userId: string): Promise<Watchlist | null> {
		const doc = await this.db
			.collection<WatchlistDoc>('watchlists')
			.findOne({ userId });
		return doc ? docToWatchlist(doc as unknown as WatchlistDoc) : null;
	}

	async saveWatchlist(watchlist: Watchlist): Promise<void> {
		const doc: Omit<WatchlistDoc, '_id'> = {
			userId: watchlist.userId,
			marketIds: watchlist.marketIds as string[],
			createdAt: watchlist.createdAt,
			updatedAt: watchlist.updatedAt,
		};
		await this.db
			.collection<WatchlistDoc>('watchlists')
			.replaceOne({ _id: watchlist.id }, doc, { upsert: true });
	}
}
