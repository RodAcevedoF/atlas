import type { GeoRegion, MarketCategory, MarketStatus, RegionSummary } from "@atlas/domain";
import type { MarketStorePort } from "../ports/market-store.ts";

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

export class ListRegionSummariesUseCase implements ListRegionSummaries {
  constructor(private readonly store: MarketStorePort) {}

  execute(input: ListRegionSummariesInput = {}): Promise<ListRegionSummariesOutput> {
    return this.store.listRegionSummaries(input);
  }
}
