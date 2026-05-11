import type { MarketDataPort, MarketFilter, PriceHistoryRange } from "@atlas/application";
import type {
  EventId,
  Market,
  MarketCategory,
  MarketId,
  MarketStatus,
  Outcome,
  PredictionEvent,
  PriceTick,
  Trade,
} from "@atlas/domain";
import { makeEventId, makeMarketId, makeOutcomeId } from "@atlas/domain";
import { NotImplementedError } from "@atlas/shared";
import type { GammaEvent, GammaMarket, GammaMarketEmbeddedEvent } from "./gamma-types.ts";

// Polymarket data sources:
//   Gamma API  — https://gamma-api.polymarket.com  (markets, events, metadata)
//   CLOB API   — https://clob.polymarket.com        (orderbook, trades, prices)

const BASE_URL = "https://gamma-api.polymarket.com";

function parseGammaDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function mapCategory(category: string | undefined): MarketCategory {
  if (!category) return "other";
  const c = category.toLowerCase();
  if (c === "politics" || c === "political" || c === "elections") return "politics";
  if (c === "crypto" || c === "cryptocurrency") return "crypto";
  if (c === "sports") return "sports";
  if (c === "economics" || c === "economy" || c === "finance") return "economics";
  if (c === "science" || c === "technology" || c === "tech") return "science";
  if (c === "culture" || c === "entertainment") return "culture";
  return "other";
}

function marketCategory(embedded: GammaMarketEmbeddedEvent | undefined): MarketCategory {
  if (embedded?.category) return mapCategory(embedded.category);
  return "other";
}

function mapStatus(market: GammaMarket): MarketStatus {
  if (market.closed) return "closed";
  return "active";
}

function parseOutcomes(raw: GammaMarket): Outcome[] {
  const names = JSON.parse(raw.outcomes) as string[];
  const prices = JSON.parse(raw.outcomePrices) as string[];
  const tokenIds = JSON.parse(raw.clobTokenIds) as string[];
  const marketId = makeMarketId(raw.conditionId);

  return names.map((name, i) => ({
    id: makeOutcomeId(tokenIds[i] ?? `${raw.conditionId}:${i}`),
    marketId,
    name,
    price: Number.parseFloat(prices[i] ?? "0"),
    shares: 0, // shares require CLOB order book data — deferred
  }));
}

function mapMarket(raw: GammaMarket): Market {
  const embedded = raw.events[0];
  return {
    id: makeMarketId(raw.conditionId),
    eventId: embedded ? makeEventId(embedded.id) : null,
    slug: raw.slug,
    title: raw.question,
    description: raw.description,
    category: marketCategory(embedded),
    status: mapStatus(raw),
    outcomes: parseOutcomes(raw),
    volumeUsd: raw.volumeNum,
    liquidityUsd: raw.liquidityNum,
    resolvesAt: parseGammaDate(raw.endDate),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

function mapEvent(raw: GammaEvent): PredictionEvent {
  return {
    id: makeEventId(raw.id),
    slug: raw.slug,
    title: raw.title,
    description: raw.description,
    category: mapCategory(raw.category),
    marketIds: raw.markets.map((m) => makeMarketId(m.conditionId)),
    createdAt: new Date(raw.createdAt),
  };
}

export class PolymarketAdapter implements MarketDataPort {
  async listMarkets(filter?: MarketFilter): Promise<Market[]> {
    const url = new URL(`${BASE_URL}/markets`);
    if (filter?.status === "active") url.searchParams.set("active", "true");
    if (filter?.status === "closed" || filter?.status === "resolved")
      url.searchParams.set("closed", "true");
    url.searchParams.set("limit", String(filter?.limit ?? 100));
    url.searchParams.set("offset", String(filter?.offset ?? 0));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gamma /markets ${res.status} ${res.statusText}`);
    const raw = (await res.json()) as GammaMarket[];

    let markets = raw.map(mapMarket);
    if (filter?.category !== undefined)
      markets = markets.filter((m) => m.category === filter.category);
    if (filter?.minVolumeUsd !== undefined) {
      const min = filter.minVolumeUsd;
      markets = markets.filter((m) => m.volumeUsd >= min);
    }
    return markets;
  }

  async getMarket(id: MarketId): Promise<Market | null> {
    const res = await fetch(`${BASE_URL}/markets/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Gamma /markets/${id} ${res.status} ${res.statusText}`);
    return mapMarket((await res.json()) as GammaMarket);
  }

  async listEvents(filter?: { category?: MarketCategory; limit?: number }): Promise<
    PredictionEvent[]
  > {
    const url = new URL(`${BASE_URL}/events`);
    url.searchParams.set("limit", String(filter?.limit ?? 100));

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gamma /events ${res.status} ${res.statusText}`);
    const raw = (await res.json()) as GammaEvent[];

    let events = raw.map(mapEvent);
    if (filter?.category !== undefined)
      events = events.filter((e) => e.category === filter.category);
    return events;
  }

  async getEvent(id: EventId): Promise<PredictionEvent | null> {
    const res = await fetch(`${BASE_URL}/events/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Gamma /events/${id} ${res.status} ${res.statusText}`);
    return mapEvent((await res.json()) as GammaEvent);
  }

  async getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new NotImplementedError("PolymarketAdapter.getPriceHistory");
  }

  async getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new NotImplementedError("PolymarketAdapter.getRecentTrades");
  }
}
