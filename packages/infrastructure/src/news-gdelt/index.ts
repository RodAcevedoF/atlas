import type { SignalSourceFilter, SignalSourcePort } from "@atlas/application";
import type { Signal } from "@atlas/domain";
import { deriveRegionsFromText, deriveTopicFromText, makeSignalId } from "@atlas/domain";
import { fetchGdeltDoc } from "./gdelt-client.ts";
import type { GdeltArticle } from "./gdelt-types.ts";

const DEFAULT_QUERY =
  "(election OR conflict OR economy OR climate OR technology OR protest OR sanctions OR diplomacy OR outbreak)";

const MAX_RECORDS = 250;

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return 75;
  return Math.min(limit, MAX_RECORDS);
}

function parseSeenDate(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const millis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(millis) ? null : new Date(millis);
}

function toGdeltDateTime(date: Date): string {
  return date.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

function articleToSignal(article: GdeltArticle): Signal | null {
  if (!article.url || !article.title) return null;
  const timestamp = parseSeenDate(article.seendate);
  if (!timestamp) return null;

  const regions = deriveRegionsFromText([article.title, article.sourcecountry]);
  return {
    id: makeSignalId(`news:${article.url}`),
    source: "news",
    topic: deriveTopicFromText([article.title]),
    primaryRegion: regions[0] ?? "global",
    regions,
    weight: 1,
    title: article.title,
    ref: article.url,
    timestamp,
    createdAt: timestamp,
  };
}

function timeWindow(filter?: SignalSourceFilter): Record<string, string | undefined> {
  if (filter?.from) {
    return {
      startdatetime: toGdeltDateTime(filter.from),
      enddatetime: toGdeltDateTime(filter.to ?? new Date(filter.from.getTime() + 86_400_000)),
    };
  }
  return { timespan: "1d" };
}

export class GdeltNewsAdapter implements SignalSourcePort {
  async fetchSignals(filter?: SignalSourceFilter): Promise<Signal[]> {
    const response = await fetchGdeltDoc({
      query: filter?.query ?? DEFAULT_QUERY,
      mode: "ArtList",
      format: "json",
      sort: "DateDesc",
      maxrecords: clampLimit(filter?.limit),
      ...timeWindow(filter),
    });

    return (response.articles ?? [])
      .map(articleToSignal)
      .filter((signal): signal is Signal => signal !== null);
  }
}
