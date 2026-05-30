import type { MarketCategory } from '@atlas/domain';
import type { MarketDataPort } from '../ports/market-data.ts';
import type { MarketStorePort } from '../ports/market-store.ts';
import type {
	IngestMarkets,
	IngestMarketsInput,
	IngestMarketsOutput,
} from './ingest-markets.ts';

export class IngestMarketsUseCase implements IngestMarkets {
	constructor(
		private readonly market: MarketDataPort,
		private readonly store: MarketStorePort,
	) {}

	async execute(input: IngestMarketsInput): Promise<IngestMarketsOutput> {
		const category = input.categories?.[0] as MarketCategory | undefined;
		const markets = await this.market.listMarkets({
			...(category ? { category } : {}),
			limit: input.maxMarkets ?? 100,
		});
		const events = await this.market.listEvents({
			...(category ? { category } : {}),
			limit: input.maxMarkets ?? 100,
		});
		await Promise.all([
			...markets.map((market) => this.store.upsertMarket(market)),
			...events.map((event) => this.store.upsertEvent(event)),
		]);
		return { upserted: markets.length, ticksRecorded: 0 };
	}
}
