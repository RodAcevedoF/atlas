import type {
  EventRecord,
  IngestMarketsInput,
  IngestMarketsResult,
  ListEventsInput,
  ListMarketsInput,
  MarketRecord,
  MarketRepository,
} from "./market-repository.ts";

function buildQuery(input?: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

export class HttpMarketRepository implements MarketRepository {
  async listMarkets(input: ListMarketsInput = {}): Promise<MarketRecord[]> {
    const response = await fetch(
      `/api/markets${buildQuery({
        status: input.status,
        category: input.category,
        limit: input.limit,
      })}`,
    );
    return readJson<MarketRecord[]>(response);
  }

  async listEvents(input: ListEventsInput = {}): Promise<EventRecord[]> {
    const response = await fetch(`/api/events${buildQuery({ limit: input.limit })}`);
    return readJson<EventRecord[]>(response);
  }

  async ingestMarkets(input: IngestMarketsInput = {}): Promise<IngestMarketsResult> {
    const response = await fetch("/api/market/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return readJson<IngestMarketsResult>(response);
  }
}