import type { GeoRegion, Market, PredictionEvent } from '@atlas/domain';

const DEFAULT_REGION: GeoRegion = 'global';

const REGION_KEYWORDS: Array<{
	region: GeoRegion;
	keywords: readonly string[];
}> = [
	{
		region: 'north-america',
		keywords: [
			'united states',
			'usa',
			'us election',
			'america',
			'canada',
			'mexico',
			'trump',
			'biden',
			'california',
		],
	},
	{
		region: 'latin-america',
		keywords: [
			'brazil',
			'argentina',
			'milei',
			'colombia',
			'chile',
			'peru',
			'latin america',
		],
	},
	{
		region: 'europe',
		keywords: [
			'europe',
			'european union',
			'uk',
			'united kingdom',
			'france',
			'germany',
			'italy',
			'spain',
			'ukraine',
		],
	},
	{
		region: 'middle-east',
		keywords: [
			'israel',
			'iran',
			'gaz',
			'gaza',
			'saudi',
			'qatar',
			'uae',
			'lebanon',
			'syria',
		],
	},
	{
		region: 'africa',
		keywords: [
			'africa',
			'nigeria',
			'egypt',
			'south africa',
			'ethiopia',
			'kenya',
		],
	},
	{
		region: 'asia',
		keywords: [
			'china',
			'japan',
			'india',
			'taiwan',
			'korea',
			'asia',
			'beijing',
			'hong kong',
			'singapore',
		],
	},
	{
		region: 'oceania',
		keywords: ['australia', 'new zealand', 'oceania'],
	},
];

function uniqueRegions(regions: GeoRegion[]): GeoRegion[] {
	return regions.length > 0 ? [...new Set(regions)] : [DEFAULT_REGION];
}

export function deriveRegionsFromText(
	parts: Array<string | null | undefined>,
): GeoRegion[] {
	const haystack = parts
		.filter((value): value is string => Boolean(value && value.trim()))
		.join(' ')
		.toLowerCase();
	if (!haystack) return [DEFAULT_REGION];

	const regions = REGION_KEYWORDS.filter(({ keywords }) =>
		keywords.some((keyword) => haystack.includes(keyword)),
	).map(({ region }) => region);

	return uniqueRegions(regions);
}

export function enrichEventRegions(event: PredictionEvent): PredictionEvent {
	const regions = deriveRegionsFromText([
		event.title,
		event.description,
		event.slug,
		...event.tags,
	]);

	return {
		...event,
		primaryRegion: regions[0] ?? DEFAULT_REGION,
		regions,
	};
}

export function enrichMarketRegions(
	market: Market,
	linkedEvent: PredictionEvent | undefined,
): Market {
	const regions = uniqueRegions([
		...(linkedEvent?.regions ?? []),
		...deriveRegionsFromText([
			market.title,
			market.description,
			market.slug,
			linkedEvent?.title,
			linkedEvent?.description,
		]),
	]);

	return {
		...market,
		primaryRegion: regions[0] ?? DEFAULT_REGION,
		regions,
	};
}
