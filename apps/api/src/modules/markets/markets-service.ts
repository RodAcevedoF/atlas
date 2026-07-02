import type {
  IngestMarketsInput,
  IngestMarketsOutput,
  IngestMarketsUseCase,
  ListEventsInput,
  ListEventsOutput,
  ListEventsUseCase,
  ListMarketsInput,
  ListMarketsOutput,
  ListMarketsUseCase,
  ListRegionSummariesInput,
  ListRegionSummariesOutput,
  ListRegionSummariesUseCase,
} from "@atlas/application";
import type { IMarketsService } from "./service.ts";

export class MarketsService implements IMarketsService {
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

  listRegionSummaries(input: ListRegionSummariesInput = {}): Promise<ListRegionSummariesOutput> {
    return this.listRegionSummariesUseCase.execute(input);
  }
}
