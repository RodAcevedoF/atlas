import type {
  IngestMarketsInput,
  IngestMarketsOutput,
  ListEventsInput,
  ListEventsOutput,
  ListMarketsInput,
  ListMarketsOutput,
  ListRegionSummariesInput,
  ListRegionSummariesOutput,
} from "@atlas/application";

export interface IMarketsService {
  ingestMarkets(input: IngestMarketsInput): Promise<IngestMarketsOutput>;
  listMarkets(input?: ListMarketsInput): Promise<ListMarketsOutput>;
  listEvents(input?: ListEventsInput): Promise<ListEventsOutput>;
  listRegionSummaries(input?: ListRegionSummariesInput): Promise<ListRegionSummariesOutput>;
}
