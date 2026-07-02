import type {
  IngestMarketsInput,
  IngestMarketsOutput,
  IngestNewsInput,
  IngestNewsOutput,
  ListEventsInput,
  ListEventsOutput,
  ListMarketsInput,
  ListMarketsOutput,
  ListRegionSummariesInput,
  ListRegionSummariesOutput,
  ListWorldEventsInput,
  ListWorldEventsOutput,
  ListWorldTopicsInput,
  ListWorldTopicsOutput,
  MarketDataPort,
  MarketStorePort,
  SignalSourcePort,
} from "@atlas/application";
import {
  IngestMarketsUseCase,
  IngestNewsUseCase,
  ListEventsUseCase,
  ListMarketsUseCase,
  ListRegionSummariesUseCase,
  ListWorldEventsUseCase,
  ListWorldTopicsUseCase,
} from "@atlas/application";

export interface IMarketService {
  ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput>;
  ingestNews(input?: IngestNewsInput): Promise<IngestNewsOutput>;
  listMarkets(input?: ListMarketsInput): Promise<ListMarketsOutput>;
  listEvents(input?: ListEventsInput): Promise<ListEventsOutput>;
  listRegionSummaries(input?: ListRegionSummariesInput): Promise<ListRegionSummariesOutput>;
  listWorldTopics(input?: ListWorldTopicsInput): Promise<ListWorldTopicsOutput>;
  listWorldEvents(input?: ListWorldEventsInput): Promise<ListWorldEventsOutput>;
}

class MarketService implements IMarketService {
  constructor(
    private readonly ingest: IngestMarketsUseCase,
    private readonly ingestNewsUseCase: IngestNewsUseCase,
    private readonly listMarketsUseCase: ListMarketsUseCase,
    private readonly listEventsUseCase: ListEventsUseCase,
    private readonly listRegionSummariesUseCase: ListRegionSummariesUseCase,
    private readonly listWorldTopicsUseCase: ListWorldTopicsUseCase,
    private readonly listWorldEventsUseCase: ListWorldEventsUseCase,
  ) {}

  ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput> {
    return this.ingest.execute(input);
  }

  ingestNews(input: IngestNewsInput = {}): Promise<IngestNewsOutput> {
    return this.ingestNewsUseCase.execute(input);
  }

  listMarkets(input: ListMarketsInput = {}): Promise<ListMarketsOutput> {
    return this.listMarketsUseCase.execute(input);
  }

  listEvents(input: ListEventsInput = {}): Promise<ListEventsOutput> {
    return this.listEventsUseCase.execute(input);
  }

  listRegionSummaries(input: ListRegionSummariesInput = {}): Promise<ListRegionSummariesOutput> {
    return this.listRegionSummariesUseCase.execute(input);
  }

  listWorldTopics(input: ListWorldTopicsInput = {}): Promise<ListWorldTopicsOutput> {
    return this.listWorldTopicsUseCase.execute(input);
  }

  listWorldEvents(input: ListWorldEventsInput = {}): Promise<ListWorldEventsOutput> {
    return this.listWorldEventsUseCase.execute(input);
  }
}

export function makeDependencies(deps: {
  marketData: MarketDataPort;
  signalSource: SignalSourcePort;
  store: MarketStorePort;
}): { service: IMarketService } {
  return {
    service: new MarketService(
      new IngestMarketsUseCase(deps.marketData, deps.store),
      new IngestNewsUseCase(deps.signalSource, deps.store),
      new ListMarketsUseCase(deps.store),
      new ListEventsUseCase(deps.store),
      new ListRegionSummariesUseCase(deps.store),
      new ListWorldTopicsUseCase(deps.store),
      new ListWorldEventsUseCase(deps.store),
    ),
  };
}
