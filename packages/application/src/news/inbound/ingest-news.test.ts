import { describe, expect, test } from "bun:test";
import type { Signal } from "@atlas/domain";
import { buildSignal } from "../../testing/signal-builder.ts";
import { recordingSignalStore } from "../../testing/signal-store.fake.ts";
import type { SignalSourceFilter, SignalSourcePort } from "../outbound/signal-source.ts";
import { IngestNewsUseCase } from "./ingest-news.ts";

function recordingSource(signals: Signal[] = []) {
  const filters: (SignalSourceFilter | undefined)[] = [];
  const source: SignalSourcePort = {
    fetchSignals(filter) {
      filters.push(filter);
      return Promise.resolve(signals);
    },
  };
  return { source, filters };
}

describe("IngestNewsUseCase", () => {
  describe("fetch filter", () => {
    const limitCases = [
      { name: "falls back to the default limit", input: undefined, expectedLimit: 75 },
      { name: "treats no input as an empty input", input: {}, expectedLimit: 75 },
      { name: "forwards an explicit limit", input: { limit: 10 }, expectedLimit: 10 },
    ];

    for (const { name, input, expectedLimit } of limitCases) {
      test(name, async () => {
        const { source, filters } = recordingSource();
        const { store } = recordingSignalStore();

        await new IngestNewsUseCase(source, store).execute(input);

        expect(filters).toEqual([{ limit: expectedLimit }]);
      });
    }

    const emptyQueries = [undefined, ""];

    for (const query of emptyQueries) {
      test(`omits an empty query (${JSON.stringify(query)}) so the source keeps its own default`, async () => {
        const { source, filters } = recordingSource();
        const { store } = recordingSignalStore();

        await new IngestNewsUseCase(source, store).execute({ query });

        expect(filters[0]).not.toHaveProperty("query");
      });
    }

    test("forwards a non-empty query", async () => {
      const { source, filters } = recordingSource();
      const { store } = recordingSignalStore();

      await new IngestNewsUseCase(source, store).execute({ query: "sanctions" });

      expect(filters).toEqual([{ query: "sanctions", limit: 75 }]);
    });
  });

  describe("persistence", () => {
    test("upserts the fetched signals unchanged, in one call", async () => {
      const signals = [
        buildSignal({ ref: "https://example.test/a" }),
        buildSignal({ ref: "https://example.test/b" }),
      ];
      const { source } = recordingSource(signals);
      const { store, upserted } = recordingSignalStore();

      const result = await new IngestNewsUseCase(source, store).execute();

      expect(upserted).toEqual([signals]);
      expect(result).toEqual({ upserted: 2 });
    });

    test("still upserts (with an empty batch) when the source returns nothing", async () => {
      const { source } = recordingSource();
      const { store, upserted } = recordingSignalStore();

      const result = await new IngestNewsUseCase(source, store).execute();

      expect(upserted).toEqual([[]]);
      expect(result).toEqual({ upserted: 0 });
    });

    test("propagates a store failure instead of reporting a successful ingest", async () => {
      const { source } = recordingSource([buildSignal({ ref: "https://example.test/a" })]);
      const { store } = recordingSignalStore([], {
        upsertSignals: () => Promise.reject(new Error("mongo down")),
      });

      await expect(new IngestNewsUseCase(source, store).execute()).rejects.toThrow("mongo down");
    });
  });
});
