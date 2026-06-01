import type { FastifyInstance } from 'fastify';
import type {
	IngestMarketsInput,
	ListEventsInput,
	ListMarketsInput,
	ListRegionSummariesInput,
} from '@atlas/application';
import type { GeoRegion, MarketCategory, MarketStatus } from '@atlas/domain';
import type { AppDeps } from '../../core/bootstrap.ts';

const MARKET_STATUSES: MarketStatus[] = ['active', 'closed', 'resolved'];
const MARKET_CATEGORIES: MarketCategory[] = [
	'politics',
	'crypto',
	'sports',
	'economics',
	'science',
	'culture',
	'other',
];
const GEO_REGIONS: GeoRegion[] = [
	'north-america',
	'latin-america',
	'europe',
	'middle-east',
	'africa',
	'asia',
	'oceania',
	'global',
];

function parseLimit(value: unknown): number | undefined {
	if (typeof value !== 'string' && typeof value !== 'number') return undefined;
	const parsed = Number.parseInt(String(value), 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return parsed;
}

function parseStatus(value: unknown): MarketStatus | undefined {
	if (typeof value !== 'string') return undefined;
	return MARKET_STATUSES.find((status) => status === value);
}

function parseCategory(value: unknown): MarketCategory | undefined {
	if (typeof value !== 'string') return undefined;
	return MARKET_CATEGORIES.find((category) => category === value);
}

function parseRegion(value: unknown): GeoRegion | undefined {
	if (typeof value !== 'string') return undefined;
	return GEO_REGIONS.find((region) => region === value);
}

export async function registerMarketRoutes(
	app: FastifyInstance,
	deps: AppDeps,
): Promise<void> {
	app.post('/market/ingest', async (req, reply) => {
		const input = (req.body as IngestMarketsInput | undefined) ?? {};
		const result = await deps.marketService.ingestMarkets(input);
		return reply.send(result);
	});

	app.get('/markets', async (req, reply) => {
		const query = (req.query as Record<string, unknown> | undefined) ?? {};
		const input: ListMarketsInput = {
			status: parseStatus(query.status),
			category: parseCategory(query.category),
			limit: parseLimit(query.limit),
		};
		const result = await deps.marketService.listMarkets(input);
		return reply.send(result);
	});

	app.get('/events', async (req, reply) => {
		const query = (req.query as Record<string, unknown> | undefined) ?? {};
		const input: ListEventsInput = {
			limit: parseLimit(query.limit),
		};
		const result = await deps.marketService.listEvents(input);
		return reply.send(result);
	});

	app.get('/regions/summary', async (req, reply) => {
		const query = (req.query as Record<string, unknown> | undefined) ?? {};
		const input: ListRegionSummariesInput = {
			status: parseStatus(query.status),
			category: parseCategory(query.category),
			limit: parseLimit(query.limit),
			region: parseRegion(query.region),
		};
		const result = await deps.marketService.listRegionSummaries(input);
		return reply.send(result);
	});
}
