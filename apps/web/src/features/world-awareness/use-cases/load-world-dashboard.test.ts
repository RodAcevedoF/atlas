import { describe, expect, test } from "bun:test";
import { buildRegionTopics, buildWorldEvent } from "../testing/world-builder.ts";
import { inMemoryWorldRepository } from "../testing/world-repository.fake.ts";
import { makeLoadWorldDashboard } from "./load-world-dashboard.ts";

describe("loadWorldDashboard", () => {
  describe("input routing", () => {
    test("hands the topic filter to the world-events read, so a crossed wire shows in the data", async () => {
      const worldRepository = inMemoryWorldRepository({
        worldEvents: [
          buildWorldEvent({ id: "war", topic: "conflict" }),
          buildWorldEvent({ id: "trade", topic: "economy" }),
        ],
      });

      const dashboard = await makeLoadWorldDashboard({ worldRepository })({
        worldEvents: { topic: "conflict" },
      });

      expect(dashboard.worldEvents.map((event) => event.id)).toEqual(["war"]);
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
        const worldRepository = inMemoryWorldRepository({ worldTopics });

        const dashboard = await makeLoadWorldDashboard({ worldRepository })();

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
      const worldRepository = inMemoryWorldRepository({ worldEvents });

      const dashboard = await makeLoadWorldDashboard({ worldRepository })();

      expect(dashboard.worldEvents).toEqual(worldEvents);
    });
  });
});
