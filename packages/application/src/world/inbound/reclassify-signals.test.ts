import { describe, expect, test } from "bun:test";
import type { Signal } from "@atlas/domain";
import { buildSignal } from "../../testing/signal-builder.ts";
import { inMemorySignalStore } from "../../testing/signal-store.fake.ts";
import { ReclassifySignalsUseCase } from "./reclassify-signals.ts";

function staleCorpus(): Signal[] {
  return [
    buildSignal({
      ref: "https://example.test/ceasefire",
      title: "Ukraine ceasefire holds",
      topic: "technology",
      sentiment: 0,
      regions: ["europe"],
      primaryRegion: "europe",
    }),
    buildSignal({
      ref: "https://example.test/weather",
      title: "Warm afternoon in the valley",
      topic: "conflict",
      sentiment: -0.4,
      regions: ["north-america"],
      primaryRegion: "north-america",
    }),
    buildSignal({
      ref: "https://example.test/election",
      title: "Presidential election results certified in France",
      topic: "politics",
      sentiment: 0,
      regions: ["europe"],
      primaryRegion: "europe",
    }),
  ];
}

describe("ReclassifySignalsUseCase", () => {
  test("rewrites stored topic and sentiment from the stored title", async () => {
    const { store, signals } = inMemorySignalStore(staleCorpus());

    await new ReclassifySignalsUseCase(store).execute();

    const ceasefire = signals().find((signal) => signal.title === "Ukraine ceasefire holds");
    expect(ceasefire?.topic).toBe("conflict");
    expect(ceasefire?.sentiment).toBe(1);
  });

  test("reports the `other` share before and after, which is the point of the migration", async () => {
    const { store } = inMemorySignalStore(staleCorpus());

    const result = await new ReclassifySignalsUseCase(store).execute();

    expect(result.scanned).toBe(3);
    expect(result.changed).toBe(2);
    expect(result.otherShareBefore).toBe(0);
    expect(result.otherShareAfter).toBeCloseTo(1 / 3, 10);
  });

  test("leaves regions untouched — the diagnostics only report, they never write", async () => {
    const { store, signals } = inMemorySignalStore(staleCorpus());

    const result = await new ReclassifySignalsUseCase(store).execute();

    const weather = signals().find((signal) => signal.title === "Warm afternoon in the valley");
    expect(weather?.regions).toEqual(["north-america"]);
    expect(weather?.primaryRegion).toBe("north-america");
    expect(result.regions).toEqual({ divergent: 1, wouldNarrowToGlobal: 1 });
  });

  test("diagnoses a signal with a stored country against both its inputs, not the title alone", async () => {
    const { store } = inMemorySignalStore([
      buildSignal({
        ref: "https://example.test/valley",
        title: "Warm afternoon in the valley",
        sourceCountry: "France",
        regions: ["europe"],
        primaryRegion: "europe",
      }),
    ]);

    const result = await new ReclassifySignalsUseCase(store).execute();

    expect(result.regions).toEqual({ divergent: 0, wouldNarrowToGlobal: 0 });
  });

  test("never touches market signals, whose topic comes from the market category", async () => {
    const market = buildSignal({
      ref: "ai-chip-war",
      source: "market",
      title: "Will the AI chip war escalate?",
      topic: "business-finance",
      sentiment: 0,
    });
    const { store, signals } = inMemorySignalStore([...staleCorpus(), market]);

    const result = await new ReclassifySignalsUseCase(store).execute();

    const stored = signals().find((signal) => signal.id === market.id);
    expect(result.scanned).toBe(3);
    expect(stored?.topic).toBe("business-finance");
    expect(stored?.sentiment).toBe(0);
  });

  test("a dry run reports the same numbers but writes nothing", async () => {
    const { store, signals } = inMemorySignalStore(staleCorpus());

    const result = await new ReclassifySignalsUseCase(store).execute({ dryRun: true });

    expect(result.changed).toBe(2);
    expect(result.otherShareAfter).toBeCloseTo(1 / 3, 10);
    expect(signals().map((signal) => signal.topic)).toEqual(["technology", "conflict", "politics"]);
  });
});
