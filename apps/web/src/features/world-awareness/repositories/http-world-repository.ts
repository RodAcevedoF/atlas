import type {
  IngestNewsInput,
  IngestNewsResult,
  ListWorldEventsInput,
  ListWorldTopicsInput,
  RegionTopicBreakdownRecord,
  WorldEventRecord,
  WorldRepository,
} from "./world-repository.ts";

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

export class HttpWorldRepository implements WorldRepository {
  async listWorldTopics(input: ListWorldTopicsInput = {}): Promise<RegionTopicBreakdownRecord[]> {
    const response = await fetch(
      `/api/world/topics${buildQuery({
        source: input.source,
        topic: input.topic,
        region: input.region,
        limit: input.limit,
      })}`,
    );
    return readJson<RegionTopicBreakdownRecord[]>(response);
  }

  async listWorldEvents(input: ListWorldEventsInput = {}): Promise<WorldEventRecord[]> {
    const response = await fetch(
      `/api/world/events${buildQuery({
        source: input.source,
        topic: input.topic,
        region: input.region,
        limit: input.limit,
      })}`,
    );
    return readJson<WorldEventRecord[]>(response);
  }

  async ingestNews(input: IngestNewsInput = {}): Promise<IngestNewsResult> {
    const response = await fetch("/api/world/news/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return readJson<IngestNewsResult>(response);
  }
}
