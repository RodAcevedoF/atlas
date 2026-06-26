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
import { mapCategory } from "./category.ts";
import { fetchGammaJson } from "./gamma-client.ts";
import type { GammaEvent, GammaMarket, GammaMarketEmbeddedEvent } from "./gamma-types.ts";

// Polymarket data sources:
//   Gamma API  — https://gamma-api.polymarket.com  (markets, events, metadata)
//   CLOB API   — https://clob.polymarket.com        (orderbook, trades, prices)

function parseGammaDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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

  return names.map((name, index) => ({
    id: makeOutcomeId(tokenIds[index] ?? `${raw.conditionId}:${index}`),
    marketId,
    name,
    price: Number.parseFloat(prices[index] ?? "0"),
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
    primaryRegion: "global",
    regions: ["global"],
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
    tags: raw.tags.map((tag) => tag.label),
    primaryRegion: "global",
    regions: ["global"],
    marketIds: raw.markets.map((market) => makeMarketId(market.conditionId)),
    createdAt: new Date(raw.createdAt),
  };
}

export class PolymarketAdapter implements MarketDataPort {
  async listMarkets(filter?: MarketFilter): Promise<Market[]> {
    const raw =
      (await fetchGammaJson<GammaMarket[]>({
        path: "/markets",
        searchParams: {
          active: filter?.status === "active" ? "true" : undefined,
          closed: filter?.status === "closed" || filter?.status === "resolved" ? "true" : undefined,
          limit: filter?.limit ?? 100,
          offset: filter?.offset ?? 0,
        },
        errorLabel: "Gamma /markets",
      })) ?? [];

    let markets = raw.map(mapMarket);
    if (filter?.category !== undefined)
      markets = markets.filter((market) => market.category === filter.category);
    if (filter?.minVolumeUsd !== undefined) {
      const minVolumeUsd = filter.minVolumeUsd;
      markets = markets.filter((market) => market.volumeUsd >= minVolumeUsd);
    }
    return markets;
  }

  async getMarket(id: MarketId): Promise<Market | null> {
    const raw = await fetchGammaJson<GammaMarket>({
      path: `/markets/${encodeURIComponent(id)}`,
      allow404: true,
      errorLabel: `Gamma /markets/${id}`,
    });
    return raw ? mapMarket(raw) : null;
  }

  async listEvents(filter?: {
    category?: MarketCategory;
    limit?: number;
  }): Promise<PredictionEvent[]> {
    const raw =
      (await fetchGammaJson<GammaEvent[]>({
        path: "/events",
        searchParams: { limit: filter?.limit ?? 100 },
        errorLabel: "Gamma /events",
      })) ?? [];

    let events = raw.map(mapEvent);
    if (filter?.category !== undefined)
      events = events.filter((event) => event.category === filter.category);
    return events;
  }

  async getEvent(id: EventId): Promise<PredictionEvent | null> {
    const raw = await fetchGammaJson<GammaEvent>({
      path: `/events/${encodeURIComponent(id)}`,
      allow404: true,
      errorLabel: `Gamma /events/${id}`,
    });
    return raw ? mapEvent(raw) : null;
  }

  async getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new NotImplementedError("PolymarketAdapter.getPriceHistory");
  }

  async getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new NotImplementedError("PolymarketAdapter.getRecentTrades");
  }
}
