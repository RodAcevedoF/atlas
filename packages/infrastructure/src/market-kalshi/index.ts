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
import { fetchKalshiJson } from "./kalshi-client.ts";
import type {
  KalshiEvent,
  KalshiEventResponse,
  KalshiEventsResponse,
  KalshiMarket,
  KalshiMarketResponse,
} from "./kalshi-types.ts";

const STATUS_MAP: Record<string, MarketStatus> = {
  closed: "closed",
  settled: "resolved",
  finalized: "resolved",
  determined: "resolved",
};

const STATUS_PARAM: Record<NonNullable<MarketFilter["status"]>, string> = {
  active: "open",
  closed: "closed",
  resolved: "settled",
};

function parseKalshiDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value: string | undefined): number {
  if (value === undefined) return 0;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function fetchKalshiEvents(limit: number, status?: string): Promise<KalshiEventsResponse | null> {
  return fetchKalshiJson<KalshiEventsResponse>({
    path: "/events",
    searchParams: { limit, with_nested_markets: "true", status },
    errorLabel: "Kalshi /events",
  });
}

function mapStatus(market: KalshiMarket): MarketStatus {
  return STATUS_MAP[market.status] ?? "active";
}

function yesProbability(market: KalshiMarket): number {
  const last = parseNumber(market.last_price_dollars);
  if (last > 0) return last;
  const bid = parseNumber(market.yes_bid_dollars);
  const ask = parseNumber(market.yes_ask_dollars);
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  return bid || ask;
}

function parseOutcomes(market: KalshiMarket): Outcome[] {
  const marketId = makeMarketId(market.ticker);
  const yes = yesProbability(market);
  return [
    { id: makeOutcomeId(`${market.ticker}:yes`), marketId, name: "Yes", price: yes, shares: 0 },
    { id: makeOutcomeId(`${market.ticker}:no`), marketId, name: "No", price: 1 - yes, shares: 0 },
  ];
}

function mapMarket(raw: KalshiMarket, observedAt: Date, event?: KalshiEvent): Market {
  const eventTicker = event?.event_ticker ?? raw.event_ticker;
  return {
    id: makeMarketId(raw.ticker),
    eventId: eventTicker ? makeEventId(eventTicker) : null,
    slug: raw.ticker.toLowerCase(),
    title: raw.title,
    description: raw.rules_primary || raw.yes_sub_title || "",
    category: mapCategory(event?.category),
    primaryRegion: "global",
    regions: ["global"],
    status: mapStatus(raw),
    outcomes: parseOutcomes(raw),
    volumeUsd: parseNumber(raw.volume_fp), // contracts; $1 notional each
    liquidityUsd: parseNumber(raw.liquidity_dollars), // already USD
    resolvesAt: parseKalshiDate(raw.close_time),
    createdAt: parseKalshiDate(raw.open_time) ?? observedAt,
    updatedAt: parseKalshiDate(raw.updated_time) ?? observedAt,
  };
}

function mapEvent(raw: KalshiEvent, observedAt: Date): PredictionEvent {
  return {
    id: makeEventId(raw.event_ticker),
    slug: raw.event_ticker.toLowerCase(),
    title: raw.title,
    description: raw.sub_title ?? "",
    category: mapCategory(raw.category),
    tags: raw.series_ticker ? [raw.series_ticker] : [],
    primaryRegion: "global",
    regions: ["global"],
    marketIds: (raw.markets ?? []).map((market) => makeMarketId(market.ticker)),
    createdAt: observedAt,
  };
}

export class KalshiAdapter implements MarketDataPort {
  async listMarkets(filter?: MarketFilter): Promise<Market[]> {
    const limit = filter?.limit ?? 100;
    const status = filter?.status ? STATUS_PARAM[filter.status] : "open";
    const response = await fetchKalshiEvents(limit, status);

    const observedAt = new Date();
    let markets = (response?.events ?? []).flatMap((event) =>
      (event.markets ?? []).map((market) => mapMarket(market, observedAt, event)),
    );
    if (filter?.category !== undefined)
      markets = markets.filter((market) => market.category === filter.category);
    if (filter?.minVolumeUsd !== undefined) {
      const minVolumeUsd = filter.minVolumeUsd;
      markets = markets.filter((market) => market.volumeUsd >= minVolumeUsd);
    }
    return markets.slice(0, limit);
  }

  async getMarket(id: MarketId): Promise<Market | null> {
    const response = await fetchKalshiJson<KalshiMarketResponse>({
      path: `/markets/${encodeURIComponent(id)}`,
      allow404: true,
      errorLabel: `Kalshi /markets/${id}`,
    });
    return response ? mapMarket(response.market, new Date()) : null;
  }

  async listEvents(filter?: {
    category?: MarketCategory;
    limit?: number;
  }): Promise<PredictionEvent[]> {
    const response = await fetchKalshiEvents(filter?.limit ?? 100);

    const observedAt = new Date();
    let events = (response?.events ?? []).map((event) => mapEvent(event, observedAt));
    if (filter?.category !== undefined)
      events = events.filter((event) => event.category === filter.category);
    return events;
  }

  async getEvent(id: EventId): Promise<PredictionEvent | null> {
    const response = await fetchKalshiJson<KalshiEventResponse>({
      path: `/events/${encodeURIComponent(id)}`,
      searchParams: { with_nested_markets: "true" },
      allow404: true,
      errorLabel: `Kalshi /events/${id}`,
    });
    return response ? mapEvent(response.event, new Date()) : null;
  }

  async getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new NotImplementedError("KalshiAdapter.getPriceHistory");
  }

  async getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new NotImplementedError("KalshiAdapter.getRecentTrades");
  }
}
