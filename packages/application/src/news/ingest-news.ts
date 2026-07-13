import type { MarketStorePort } from "../ports/market-store.ts";
import type { SignalSourcePort } from "../ports/signal-source.ts";

export interface IngestNewsInput {
  query?: string;
  limit?: number;
}

export interface IngestNewsOutput {
  upserted: number;
}

export interface IngestNews {
  execute(input?: IngestNewsInput): Promise<IngestNewsOutput>;
}

export class IngestNewsUseCase implements IngestNews {
  constructor(
    private readonly source: SignalSourcePort,
    private readonly store: MarketStorePort,
  ) {}

  async execute(input: IngestNewsInput = {}): Promise<IngestNewsOutput> {
    const signals = await this.source.fetchSignals({
      ...(input.query ? { query: input.query } : {}),
      limit: input.limit ?? 75,
    });
    await this.store.upsertSignals(signals);
    return { upserted: signals.length };
  }
}
