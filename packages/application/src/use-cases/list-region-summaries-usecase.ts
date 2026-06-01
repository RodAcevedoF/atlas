import type { MarketStorePort } from '../ports/market-store.ts';
import type {
	ListRegionSummaries,
	ListRegionSummariesInput,
	ListRegionSummariesOutput,
} from './list-region-summaries.ts';

export class ListRegionSummariesUseCase implements ListRegionSummaries {
	constructor(private readonly store: MarketStorePort) {}

	execute(
		input: ListRegionSummariesInput = {},
	): Promise<ListRegionSummariesOutput> {
		return this.store.listRegionSummaries(input);
	}
}
