import type {
	IngestMarketsInput,
	IngestMarketsOutput,
	ListEventsInput,
	ListEventsOutput,
	ListMarketsInput,
	ListMarketsOutput,
	ListRegionSummariesInput,
	ListRegionSummariesOutput,
	MarketDataPort,
	MarketStorePort,
} from '@atlas/application';
import {
	IngestMarketsUseCase,
	ListEventsUseCase,
	ListMarketsUseCase,
	ListRegionSummariesUseCase,
} from '@atlas/application';

export interface IMarketService {
	ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput>;
	listMarkets(input?: ListMarketsInput): Promise<ListMarketsOutput>;
	listEvents(input?: ListEventsInput): Promise<ListEventsOutput>;
	listRegionSummaries(
		input?: ListRegionSummariesInput,
	): Promise<ListRegionSummariesOutput>;
}

class MarketService implements IMarketService {
	constructor(
		private readonly ingest: IngestMarketsUseCase,
		private readonly listMarketsUseCase: ListMarketsUseCase,
		private readonly listEventsUseCase: ListEventsUseCase,
		private readonly listRegionSummariesUseCase: ListRegionSummariesUseCase,
	) {}

	ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput> {
		return this.ingest.execute(input);
	}

	listMarkets(input: ListMarketsInput = {}): Promise<ListMarketsOutput> {
		return this.listMarketsUseCase.execute(input);
	}

	listEvents(input: ListEventsInput = {}): Promise<ListEventsOutput> {
		return this.listEventsUseCase.execute(input);
	}

	listRegionSummaries(
		input: ListRegionSummariesInput = {},
	): Promise<ListRegionSummariesOutput> {
		return this.listRegionSummariesUseCase.execute(input);
	}
}

export function makeDependencies(deps: {
	marketData: MarketDataPort;
	store: MarketStorePort;
}): { service: IMarketService } {
	return {
		service: new MarketService(
			new IngestMarketsUseCase(deps.marketData, deps.store),
			new ListMarketsUseCase(deps.store),
			new ListEventsUseCase(deps.store),
			new ListRegionSummariesUseCase(deps.store),
		),
	};
}
