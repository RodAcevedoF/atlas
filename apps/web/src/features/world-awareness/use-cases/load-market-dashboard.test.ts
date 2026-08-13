import { describe, expect, test } from "bun:test";
import { buildMarket, buildRegionTopics, buildWorldEvent } from "../testing/market-builder.ts";
import { inMemoryMarketRepository } from "../testing/market-repository.fake.ts";
import { makeLoadMarketDashboard } from "./load-market-dashboard.ts";

describe("loadMarketDashboard", () => {
  describe("market totals", () => {
    test("counts only active markets, but totals volume and liquidity across every status", async () => {
      const marketRepository = inMemoryMarketRepository({
        markets: [
          buildMarket({ id: "open", status: "active", volumeUsd: 100, liquidityUsd: 10 }),
          buildMarket({ id: "shut", status: "closed", volumeUsd: 50, liquidityUsd: 5 }),
        ],
      });

      const dashboard = await makeLoadMarketDashboard({ marketRepository })();

      expect(dashboard.activeMarketCount).toBe(1);
      expect(dashboard.totalVolumeUsd).toBe(150);
      expect(dashboard.totalLiquidityUsd).toBe(15);
    });
  });

  describe("input routing", () => {
    test("hands each filter slice to the call it belongs to, so a crossed wire shows in the data", async () => {
      const marketRepository = inMemoryMarketRepository({
        markets: [
          buildMarket({ id: "open", status: "active" }),
          buildMarket({ id: "shut", status: "closed" }),
        ],
        worldEvents: [
          buildWorldEvent({ id: "war", topic: "conflict" }),
          buildWorldEvent({ id: "trade", topic: "economy" }),
        ],
      });

      const dashboard = await makeLoadMarketDashboard({ marketRepository })({
        markets: { status: "active" },
        worldEvents: { topic: "conflict" },
      });

      expect(dashboard.markets.map((market) => market.id)).toEqual(["open"]);
      expect(dashboard.worldEvents.map((event) => event.id)).toEqual(["war"]);
    });
  });

  describe("category summary", () => {
    test("collapses markets of one category into a single row carrying the summed volume", async () => {
      const marketRepository = inMemoryMarketRepository({
        markets: [
          buildMarket({ id: "crypto-a", category: "crypto", volumeUsd: 30 }),
          buildMarket({ id: "crypto-b", category: "crypto", volumeUsd: 20 }),
        ],
      });

      const dashboard = await makeLoadMarketDashboard({ marketRepository })();

      expect(dashboard.categorySummary).toEqual([{ category: "crypto", count: 2, volumeUsd: 50 }]);
    });

    test("ranks the categories by volume, not by how many markets each holds", async () => {
      const marketRepository = inMemoryMarketRepository({
        markets: [
          buildMarket({ id: "sports-a", category: "sports", volumeUsd: 10 }),
          buildMarket({ id: "sports-b", category: "sports", volumeUsd: 10 }),
          buildMarket({ id: "politics-a", category: "politics", volumeUsd: 90 }),
        ],
      });

      const dashboard = await makeLoadMarketDashboard({ marketRepository })();

      expect(dashboard.categorySummary.map((row) => row.category)).toEqual(["politics", "sports"]);
    });
  });

  describe("world counts", () => {
    const worldCases = [
      {
        name: "counts a topic once even when several regions are active in it",
        worldTopics: [
          buildRegionTopics({ region: "europe", topics: [{ topic: "economy", signalCount: 2 }] }),
          buildRegionTopics({ region: "asia", topics: [{ topic: "economy", signalCount: 3 }] }),
        ],
        expected: { worldSignals: 5, activeTopics: 1, regionsInFocus: 2 },
      },
      {
        name: "leaves out topics and regions that carry no signal at all",
        worldTopics: [
          buildRegionTopics({
            region: "europe",
            topics: [
              { topic: "economy", signalCount: 4 },
              { topic: "sports", signalCount: 0 },
            ],
          }),
          buildRegionTopics({ region: "africa", topics: [{ topic: "politics", signalCount: 0 }] }),
        ],
        expected: { worldSignals: 4, activeTopics: 1, regionsInFocus: 1 },
      },
      {
        name: "reports an empty world when no region breakdown comes back",
        worldTopics: [],
        expected: { worldSignals: 0, activeTopics: 0, regionsInFocus: 0 },
      },
    ];

    for (const { name, worldTopics, expected } of worldCases) {
      test(name, async () => {
        const marketRepository = inMemoryMarketRepository({ worldTopics });

        const dashboard = await makeLoadMarketDashboard({ marketRepository })();

        expect({
          worldSignals: dashboard.worldSignals,
          activeTopics: dashboard.activeTopics,
          regionsInFocus: dashboard.regionsInFocus,
        }).toEqual(expected);
      });
    }
  });

  describe("world events", () => {
    test("passes the events through untouched, so the map ranks them itself", async () => {
      const worldEvents = [
        buildWorldEvent({ id: "quiet", weight: 1 }),
        buildWorldEvent({ id: "loud", weight: 9 }),
      ];
      const marketRepository = inMemoryMarketRepository({ worldEvents });

      const dashboard = await makeLoadMarketDashboard({ marketRepository })();

      expect(dashboard.worldEvents).toEqual(worldEvents);
    });
  });
});
