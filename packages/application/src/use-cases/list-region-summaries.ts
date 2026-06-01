import type {
	GeoRegion,
	MarketCategory,
	MarketStatus,
	RegionSummary,
} from '@atlas/domain';

export interface ListRegionSummariesInput {
	status?: MarketStatus;
	category?: MarketCategory;
	limit?: number;
	region?: GeoRegion;
}

export type ListRegionSummariesOutput = RegionSummary[];

export interface ListRegionSummaries {
	execute(input?: ListRegionSummariesInput): Promise<ListRegionSummariesOutput>;
}
