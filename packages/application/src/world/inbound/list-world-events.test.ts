import { describe, expect, test } from "bun:test";
import type { SignalSource } from "@atlas/domain";
import { buildSignal } from "../../testing/signal-builder.ts";
import { recordingSignalStore } from "../../testing/signal-store.fake.ts";
import { ListWorldEventsUseCase } from "./list-world-events.ts";

interface SourceCase {
  name: string;
  input?: { source: SignalSource };
  expected: SignalSource;
}

describe("ListWorldEventsUseCase", () => {
  describe("store filter", () => {
    const sourceCases: SourceCase[] = [
      {
        name: "defaults to news-only — the map stays news-scoped until AT-064 decides otherwise",
        input: undefined,
        expected: "news",
      },
      { name: "honours an explicit source", input: { source: "market" }, expected: "market" },
    ];

    for (const { name, input, expected } of sourceCases) {
      test(name, async () => {
        const { store, listFilters } = recordingSignalStore();

        await new ListWorldEventsUseCase(store).execute(input);

        expect(listFilters[0]?.source).toBe(expected);
      });
    }

    test("reads a wider candidate window than it returns, so ranking has something to rank", async () => {
      const { store, listFilters } = recordingSignalStore();

      await new ListWorldEventsUseCase(store).execute({ limit: 3 });

      expect(listFilters[0]?.limit).toBeGreaterThan(3);
    });

    test("forwards topic, region and since untouched", async () => {
      const { store, listFilters } = recordingSignalStore();
      const since = new Date("2026-08-01T00:00:00.000Z");

      await new ListWorldEventsUseCase(store).execute({ topic: "economy", region: "asia", since });

      expect(listFilters[0]).toMatchObject({ topic: "economy", region: "asia", since });
    });
  });

  describe("ranking", () => {
    test("ranks by weight decayed against age, not by weight or recency alone", async () => {
      const candidates = [
        buildSignal({ ref: "old-heavy", hoursAgo: 48, weight: 3 }),
        buildSignal({ ref: "old-light", hoursAgo: 48, weight: 1 }),
        buildSignal({ ref: "fresh-light", hoursAgo: 0, weight: 1 }),
      ];
      const { store } = recordingSignalStore(candidates);

      const events = await new ListWorldEventsUseCase(store).execute();

      expect(events.map((event) => event.url)).toEqual(["fresh-light", "old-heavy", "old-light"]);
    });

    const limitCases = [
      { name: "applies the default limit", input: undefined, expectedCount: 12 },
      { name: "applies an explicit limit", input: { limit: 4 }, expectedCount: 4 },
      {
        name: "returns everything when the limit exceeds the candidates",
        input: { limit: 50 },
        expectedCount: 15,
      },
    ];

    for (const { name, input, expectedCount } of limitCases) {
      test(name, async () => {
        const candidates = Array.from({ length: 15 }, (_unused, index) =>
          buildSignal({ ref: `event-${index}`, hoursAgo: index }),
        );
        const { store } = recordingSignalStore(candidates);

        const events = await new ListWorldEventsUseCase(store).execute(input);

        expect(events).toHaveLength(expectedCount);
      });
    }
  });

  describe("projection", () => {
    test("maps a signal onto the wire shape, exposing ref as url and dropping the rest", async () => {
      const candidate = buildSignal({ ref: "https://example.test/a", weight: 7 });
      const { store } = recordingSignalStore([candidate]);

      const events = await new ListWorldEventsUseCase(store).execute();

      expect(events).toEqual([
        {
          id: candidate.id,
          title: candidate.title,
          url: "https://example.test/a",
          topic: "conflict",
          primaryRegion: "middle-east",
          source: "news",
          timestamp: candidate.timestamp,
          weight: 7,
        },
      ]);
    });
  });
});
