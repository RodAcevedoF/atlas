import type { SignalSourceFilter, SignalSourcePort } from "@atlas/application";
import type { Signal } from "@atlas/domain";
import {
  classifySentimentFromText,
  deriveRegionsFromText,
  deriveTopicFromText,
  makeSignalId,
} from "@atlas/domain";
import { fetchExaSearch } from "./exa-client.ts";
import type { ExaResult, ExaSearchRequest } from "./exa-types.ts";

const DEFAULT_QUERY =
  "latest world news on elections, conflict, economy, climate, technology, protests, sanctions, diplomacy, or disease outbreaks";

const MAX_RESULTS = 100;

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return 25;
  return Math.min(limit, MAX_RESULTS);
}

function resultToSignal(result: ExaResult): Signal | null {
  if (!result.url || !result.title || !result.publishedDate) return null;
  const timestamp = new Date(result.publishedDate);
  if (Number.isNaN(timestamp.getTime())) return null;

  const regions = deriveRegionsFromText([result.title]);
  return {
    id: makeSignalId(`news:${result.url}`),
    source: "news",
    topic: deriveTopicFromText([result.title]),
    primaryRegion: regions[0] ?? "global",
    regions,
    sourceCountry: null,
    weight: 1,
    sentiment: classifySentimentFromText([result.title]),
    title: result.title,
    ref: result.url,
    timestamp,
    createdAt: timestamp,
  };
}

function publishedWindow(
  filter?: SignalSourceFilter,
): Pick<ExaSearchRequest, "startPublishedDate" | "endPublishedDate"> {
  if (!filter?.from) return {};
  return {
    startPublishedDate: filter.from.toISOString(),
    endPublishedDate: (filter.to ?? new Date(filter.from.getTime() + 86_400_000)).toISOString(),
  };
}

export class ExaNewsAdapter implements SignalSourcePort {
  constructor(private readonly apiKey: string) {}

  async fetchSignals(filter?: SignalSourceFilter): Promise<Signal[]> {
    const response = await fetchExaSearch(this.apiKey, {
      query: filter?.query ?? DEFAULT_QUERY,
      type: "auto",
      category: "news",
      numResults: clampLimit(filter?.limit),
      ...publishedWindow(filter),
    });

    return (response.results ?? [])
      .map(resultToSignal)
      .filter((signal): signal is Signal => signal !== null);
  }
}
