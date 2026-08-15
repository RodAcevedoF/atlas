import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type {
  EventFilter,
  MarketDataPort,
  MarketFilter,
  PriceHistoryRange,
} from "@atlas/application";
import type {
  EventId,
  Market,
  MarketCategory,
  MarketId,
  PredictionEvent,
  PriceTick,
  Trade,
} from "@atlas/domain";
import { makeEventId, makeMarketId } from "@atlas/domain";
import { CompositeMarketDataAdapter } from "./index.ts";

const CREATED_AT = new Date("2026-08-01T00:00:00.000Z");
const RESOLVES_AT = new Date("2026-09-01T00:00:00.000Z");

function market(ticker: string, category: MarketCategory = "politics"): Market {
  return {
    id: makeMarketId(ticker),
    eventId: null,
    slug: ticker,
    title: `Market ${ticker}`,
    description: "",
    category,
    primaryRegion: "global",
    regions: [],
    status: "active",
    outcomes: [],
    volumeUsd: 1_000,
    liquidityUsd: 500,
    resolvesAt: RESOLVES_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

function event(ticker: string, category: MarketCategory = "politics"): PredictionEvent {
  return {
    id: makeEventId(ticker),
    slug: ticker,
    title: `Event ${ticker}`,
    description: "",
    category,
    tags: [],
    primaryRegion: "global",
    regions: [],
    marketIds: [],
    createdAt: CREATED_AT,
  };
}

function marketPool(count: number, prefix: string): Market[] {
  return Array.from({ length: count }, (_value, index) => market(`${prefix}${index}`));
}

function eventPool(count: number, prefix: string): PredictionEvent[] {
  return Array.from({ length: count }, (_value, index) => event(`${prefix}${index}`));
}

interface FakeVenueContents {
  markets?: Market[];
  events?: PredictionEvent[];
}

class FakeVenue implements MarketDataPort {
  constructor(
    private readonly contents: FakeVenueContents | Error,
    private readonly delayMs = 0,
  ) {}

  async listMarkets(filter?: MarketFilter): Promise<Market[]> {
    const available = (await this.available()).markets ?? [];
    const matched = filter?.category
      ? available.filter((entry) => entry.category === filter.category)
      : available;
    return filter?.limit ? matched.slice(0, filter.limit) : matched;
  }

  async listEvents(filter?: EventFilter): Promise<PredictionEvent[]> {
    const available = (await this.available()).events ?? [];
    const matched = filter?.category
      ? available.filter((entry) => entry.category === filter.category)
      : available;
    return filter?.limit ? matched.slice(0, filter.limit) : matched;
  }

  async getMarket(id: MarketId): Promise<Market | null> {
    const available = (await this.available()).markets ?? [];
    return available.find((entry) => entry.id === id) ?? null;
  }

  async getEvent(id: EventId): Promise<PredictionEvent | null> {
    const available = (await this.available()).events ?? [];
    return available.find((entry) => entry.id === id) ?? null;
  }

  getPriceHistory(_marketId: MarketId, _range: PriceHistoryRange): Promise<PriceTick[]> {
    throw new Error("FakeVenue.getPriceHistory is outside the path under test");
  }

  getRecentTrades(_marketId: MarketId, _limit?: number): Promise<Trade[]> {
    throw new Error("FakeVenue.getRecentTrades is outside the path under test");
  }

  private async available(): Promise<FakeVenueContents> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    if (this.contents instanceof Error) throw this.contents;
    return this.contents;
  }
}

class PolymarketVenue extends FakeVenue {}
class KalshiVenue extends FakeVenue {}

const realWarn = console.warn;
let warnings: string[] = [];

beforeEach(() => {
  warnings = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
});

afterEach(() => {
  console.warn = realWarn;
});

describe("CompositeMarketDataAdapter", () => {
  describe("merging", () => {
    test("returns the markets from every venue", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ markets: [market("poly-a")] }),
        new KalshiVenue({ markets: [market("kalshi-a")] }),
      ]);

      const markets = await composite.listMarkets();

      expect(markets.map((entry) => entry.id)).toEqual([
        makeMarketId("poly-a"),
        makeMarketId("kalshi-a"),
      ]);
    });

    test("returns the events from every venue", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ events: [event("poly-a")] }),
        new KalshiVenue({ events: [event("kalshi-a")] }),
      ]);

      const events = await composite.listEvents();

      expect(events.map((entry) => entry.id)).toEqual([
        makeEventId("poly-a"),
        makeEventId("kalshi-a"),
      ]);
    });

    test("narrows every venue with the caller's category", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({
          markets: [market("poly-politics"), market("poly-sports", "sports")],
        }),
        new KalshiVenue({ markets: [market("kalshi-sports", "sports")] }),
      ]);

      const markets = await composite.listMarkets({ category: "sports" });

      expect(markets.map((entry) => entry.id)).toEqual([
        makeMarketId("poly-sports"),
        makeMarketId("kalshi-sports"),
      ]);
    });
  });

  describe("limit budget", () => {
    test("treats the market limit as a total, not a per-venue allowance", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ markets: marketPool(100, "poly-") }),
        new KalshiVenue({ markets: marketPool(100, "kalshi-") }),
      ]);

      const markets = await composite.listMarkets({ limit: 100 });

      expect(markets).toHaveLength(100);
    });

    test("treats the event limit as a total too", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ events: eventPool(100, "poly-") }),
        new KalshiVenue({ events: eventPool(100, "kalshi-") }),
      ]);

      const events = await composite.listEvents({ limit: 100 });

      expect(events).toHaveLength(100);
    });

    test("never hands back more than the caller asked for", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ markets: marketPool(100, "poly-") }),
        new KalshiVenue({ markets: marketPool(100, "kalshi-") }),
      ]);

      const markets = await composite.listMarkets({ limit: 75 });

      expect(markets).toHaveLength(75);
    });

    test("under-fills rather than re-asking the healthy venue when one is down", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue({ markets: marketPool(100, "kalshi-") }),
      ]);

      const markets = await composite.listMarkets({ limit: 100 });

      expect(markets).toHaveLength(50);
    });

    test("gives a lone venue the whole limit", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ markets: marketPool(100, "poly-") }),
      ]);

      const markets = await composite.listMarkets({ limit: 75 });

      expect(markets).toHaveLength(75);
    });

    test("leaves an absent limit to each venue", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue({ markets: marketPool(3, "poly-") }),
        new KalshiVenue({ markets: marketPool(2, "kalshi-") }),
      ]);

      const markets = await composite.listMarkets();

      expect(markets).toHaveLength(5);
    });
  });

  describe("failover", () => {
    const listCases = [
      { name: "the first venue", failFirst: true },
      { name: "the second venue", failFirst: false },
    ];

    for (const { name, failFirst } of listCases) {
      test(`still lists markets when ${name} is down`, async () => {
        const healthy = { markets: [market("healthy")] };
        const outage = new Error("gamma 429");
        const composite = new CompositeMarketDataAdapter([
          new PolymarketVenue(failFirst ? outage : healthy),
          new KalshiVenue(failFirst ? healthy : outage),
        ]);

        const markets = await composite.listMarkets();

        expect(markets.map((entry) => entry.id)).toEqual([makeMarketId("healthy")]);
      });
    }

    test("still finds a market held by the surviving venue", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue({ markets: [market("kalshi-a")] }),
      ]);

      const found = await composite.getMarket(makeMarketId("kalshi-a"));

      expect(found?.id).toBe(makeMarketId("kalshi-a"));
    });

    test("still finds an event held by the surviving venue", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue({ events: [event("kalshi-a")] }),
      ]);

      const found = await composite.getEvent(makeEventId("kalshi-a"));

      expect(found?.id).toBe(makeEventId("kalshi-a"));
    });

    test("reports null when the surviving venue simply does not hold it", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue({ markets: [market("kalshi-a")] }),
      ]);

      const found = await composite.getMarket(makeMarketId("missing"));

      expect(found).toBeNull();
    });

    test("logs the failing venue under the method that failed", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue({ markets: [market("kalshi-a")] }),
      ]);

      await composite.listMarkets();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("[market-composite.listMarkets] PolymarketVenue failed");
      expect(warnings[0]).toContain("gamma 429");
    });
  });

  describe("slow venues", () => {
    test("does not wait past the deadline for a stalled venue", async () => {
      const composite = new CompositeMarketDataAdapter(
        [
          new PolymarketVenue({ markets: [market("poly-a")] }, 200),
          new KalshiVenue({ markets: [market("kalshi-a")] }),
        ],
        10,
      );

      const markets = await composite.listMarkets();

      expect(markets.map((entry) => entry.id)).toEqual([makeMarketId("kalshi-a")]);
    });
  });

  describe("total failure", () => {
    test("throws when every venue is down rather than reporting no markets", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue(new Error("kalshi 503")),
      ]);

      await expect(composite.listMarkets()).rejects.toThrow(
        "[market-composite.listMarkets] every source failed: PolymarketVenue, KalshiVenue",
      );
    });

    test("throws rather than reporting a market as missing when every venue is down", async () => {
      const composite = new CompositeMarketDataAdapter([
        new PolymarketVenue(new Error("gamma 429")),
        new KalshiVenue(new Error("kalshi 503")),
      ]);

      await expect(composite.getMarket(makeMarketId("poly-a"))).rejects.toThrow(
        "[market-composite.getMarket] every source failed",
      );
    });
  });
});
