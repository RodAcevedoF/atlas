import type {
	ListEventsInput,
	ListMarketsInput,
	ListRegionSummariesInput,
} from '@atlas/application';
import type { GeoRegion, MarketCategory, MarketStatus } from '@atlas/domain';
import {
	GEO_REGIONS,
	MARKET_CATEGORIES,
	MARKET_STATUSES,
} from '@atlas/domain';

type RawQuery = Record<string, unknown>;

function parseLimit(value: unknown): number | undefined {
	if (typeof value !== 'string' && typeof value !== 'number') return undefined;
	const parsed = Number.parseInt(String(value), 10);
	if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
	return parsed;
}

function parseEnum<T extends string>(
	allowed: readonly T[],
	value: unknown,
): T | undefined {
	if (typeof value !== 'string') return undefined;
	return allowed.find((candidate) => candidate === value);
}

function parseStatus(value: unknown): MarketStatus | undefined {
	return parseEnum(MARKET_STATUSES, value);
}

function parseCategory(value: unknown): MarketCategory | undefined {
	return parseEnum(MARKET_CATEGORIES, value);
}

function parseRegion(value: unknown): GeoRegion | undefined {
	return parseEnum(GEO_REGIONS, value);
}

export function parseListMarketsQuery(query: RawQuery): ListMarketsInput {
	return {
		status: parseStatus(query.status),
		category: parseCategory(query.category),
		limit: parseLimit(query.limit),
	};
}

export function parseListEventsQuery(query: RawQuery): ListEventsInput {
	return {
		limit: parseLimit(query.limit),
	};
}

export function parseRegionSummariesQuery(
	query: RawQuery,
): ListRegionSummariesInput {
	return {
		status: parseStatus(query.status),
		category: parseCategory(query.category),
		limit: parseLimit(query.limit),
		region: parseRegion(query.region),
	};
}
