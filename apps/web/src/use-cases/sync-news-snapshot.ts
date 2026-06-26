import type {
  IngestNewsInput,
  IngestNewsResult,
  MarketRepository,
} from "../repositories/market-repository.ts";

export function syncNewsSnapshot(
  repository: MarketRepository,
  input: IngestNewsInput = { limit: 75 },
): Promise<IngestNewsResult> {
  return repository.ingestNews(input);
}
