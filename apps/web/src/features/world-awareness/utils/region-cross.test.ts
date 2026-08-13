import { describe, expect, test } from "bun:test";
import type { MarketRecord, WorldEventRecord } from "../repositories/market-repository.ts";
import { buildMarket, buildWorldEvent } from "../testing/market-builder.ts";
import type { CrossStance } from "./region-cross.ts";
import { deriveRegionCross, eventCoverageKey, marketCoverageKeys } from "./region-cross.ts";

describe("deriveRegionCross", () => {
  describe("the attention stream", () => {
    test("keeps only news from the region, dropping market-sourced signals", () => {
      const events = [
        buildWorldEvent({ id: "europe-news", primaryRegion: "europe", source: "news" }),
        buildWorldEvent({ id: "europe-market", primaryRegion: "europe", source: "market" }),
        buildWorldEvent({ id: "asia-news", primaryRegion: "asia", source: "news" }),
      ];

      const cross = deriveRegionCross("europe", "", [], events);

      expect(cross.news.map((event) => event.id)).toEqual(["europe-news"]);
    });

    test("ranks by weight, breaking ties on the more recent headline", () => {
      const events = [
        buildWorldEvent({ id: "light", weight: 1, timestamp: "2026-08-03T00:00:00.000Z" }),
        buildWorldEvent({ id: "heavy-stale", weight: 5, timestamp: "2026-08-01T00:00:00.000Z" }),
        buildWorldEvent({ id: "heavy-fresh", weight: 5, timestamp: "2026-08-02T00:00:00.000Z" }),
      ];

      const cross = deriveRegionCross("europe", "", [], events);

      expect(cross.news.map((event) => event.id)).toEqual(["heavy-fresh", "heavy-stale", "light"]);
    });

    test("shows at most three headlines, so the panel stays glanceable", () => {
      const events = Array.from({ length: 6 }, (_unused, index) =>
        buildWorldEvent({ id: `event-${index}`, weight: index }),
      );

      const cross = deriveRegionCross("europe", "", [], events);

      expect(cross.news.map((event) => event.id)).toEqual(["event-5", "event-4", "event-3"]);
    });
  });

  describe("the expectation stream", () => {
    test("keeps only markets from the region, ranked by volume", () => {
      const markets = [
        buildMarket({ id: "small", primaryRegion: "europe", volumeUsd: 10 }),
        buildMarket({ id: "big", primaryRegion: "europe", volumeUsd: 90 }),
        buildMarket({ id: "elsewhere", primaryRegion: "asia", volumeUsd: 500 }),
      ];

      const cross = deriveRegionCross("europe", "", markets, []);

      expect(cross.markets.map((market) => market.id)).toEqual(["big", "small"]);
    });

    test("shows at most three markets, the same cap the headlines get", () => {
      const markets = Array.from({ length: 5 }, (_unused, index) =>
        buildMarket({ id: `market-${index}`, primaryRegion: "europe", volumeUsd: index * 10 }),
      );

      const cross = deriveRegionCross("europe", "", markets, []);

      expect(cross.markets.map((market) => market.id)).toEqual([
        "market-4",
        "market-3",
        "market-2",
      ]);
    });
  });

  describe("topic scoping", () => {
    test("matches markets on the topic their category maps to, not on the category name", () => {
      const markets = [
        buildMarket({ id: "crypto", category: "crypto", primaryRegion: "europe" }),
        buildMarket({ id: "sports", category: "sports", primaryRegion: "europe" }),
      ];
      const events = [
        buildWorldEvent({ id: "finance-news", topic: "business-finance" }),
        buildWorldEvent({ id: "sports-news", topic: "sports" }),
      ];

      const cross = deriveRegionCross("europe", "business-finance", markets, events);

      expect(cross.markets.map((market) => market.id)).toEqual(["crypto"]);
      expect(cross.news.map((event) => event.id)).toEqual(["finance-news"]);
    });

    test("an empty topic means every topic, not none", () => {
      const markets = [buildMarket({ id: "crypto", category: "crypto", primaryRegion: "europe" })];
      const events = [buildWorldEvent({ id: "sports-news", topic: "sports" })];

      const cross = deriveRegionCross("europe", "", markets, events);

      expect(cross.markets).toHaveLength(1);
      expect(cross.news).toHaveLength(1);
    });
  });

  describe("stance", () => {
    const europeMarket = buildMarket({ id: "market", primaryRegion: "europe" });
    const europeNews = buildWorldEvent({ id: "news", primaryRegion: "europe" });

    const stanceCases: Array<{
      name: string;
      markets: MarketRecord[];
      events: WorldEventRecord[];
      stance: CrossStance;
    }> = [
      { name: "both streams speak", markets: [europeMarket], events: [europeNews], stance: "both" },
      {
        name: "news without a market is attention nobody is pricing",
        markets: [],
        events: [europeNews],
        stance: "attention-only",
      },
      {
        name: "a market without news is expectation nobody is reporting",
        markets: [europeMarket],
        events: [],
        stance: "expectation-only",
      },
      { name: "neither stream speaks", markets: [], events: [], stance: "quiet" },
    ];

    for (const { name, markets, events, stance } of stanceCases) {
      test(name, () => {
        const cross = deriveRegionCross("europe", "", markets, events);

        expect(cross.stance).toBe(stance);
      });
    }
  });
});

describe("coverage keys", () => {
  test("a market corroborates a headline when both sit in the same region and topic", () => {
    const markets = [buildMarket({ id: "crypto", category: "crypto", primaryRegion: "europe" })];

    const keys = marketCoverageKeys(markets);

    expect(keys.has(eventCoverageKey("europe", "business-finance"))).toBe(true);
    expect(keys.has(eventCoverageKey("europe", "sports"))).toBe(false);
    expect(keys.has(eventCoverageKey("asia", "business-finance"))).toBe(false);
  });
});
