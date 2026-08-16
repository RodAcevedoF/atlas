import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { SignalSourceFilter, SignalSourcePort } from "@atlas/application";
import type { Signal } from "@atlas/domain";
import { makeSignalId } from "@atlas/domain";
import { CompositeSignalSourceAdapter } from "./index.ts";

const TIMESTAMP = new Date("2026-08-15T00:00:00.000Z");

function signal(ref: string, overrides: Partial<Signal> = {}): Signal {
  return {
    id: makeSignalId(`news:${ref}`),
    source: "news",
    topic: "conflict",
    primaryRegion: "global",
    regions: ["global"],
    sourceCountry: null,
    weight: 1,
    sentiment: 0,
    title: `Headline ${ref}`,
    ref,
    timestamp: TIMESTAMP,
    createdAt: TIMESTAMP,
    ...overrides,
  };
}

function signalPool(count: number, prefix: string): Signal[] {
  return Array.from({ length: count }, (_value, index) => signal(`${prefix}${index}`));
}

function matching(signals: Signal[], filter?: SignalSourceFilter): Signal[] {
  const query = filter?.query?.toLowerCase();
  const matched = query
    ? signals.filter((entry) => entry.title.toLowerCase().includes(query))
    : signals;
  return filter?.limit ? matched.slice(0, filter.limit) : matched;
}

class FakeNewsSource implements SignalSourcePort {
  constructor(
    private readonly available: Signal[] | Error,
    private readonly delayMs = 0,
  ) {}

  async fetchSignals(filter?: SignalSourceFilter): Promise<Signal[]> {
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    if (this.available instanceof Error) throw this.available;
    return matching(this.available, filter);
  }
}

class PrimaryNewsSource extends FakeNewsSource {}
class BackupNewsSource extends FakeNewsSource {}

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

describe("CompositeSignalSourceAdapter", () => {
  describe("source selection", () => {
    test("leaves the backup untouched while the primary is answering", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource([signal("https://example.test/a")]),
        new BackupNewsSource([signal("https://example.test/b")]),
      ]);

      const signals = await composite.fetchSignals();

      expect(signals.map((entry) => entry.ref)).toEqual(["https://example.test/a"]);
    });

    test("does not blend a healthy primary with a healthy backup", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(signalPool(3, "https://primary.test/n")),
        new BackupNewsSource(signalPool(3, "https://backup.test/n")),
      ]);

      const signals = await composite.fetchSignals();

      expect(signals).toHaveLength(3);
      expect(signals.every((entry) => entry.ref.startsWith("https://primary.test/"))).toBe(true);
    });
  });

  describe("duplicate detection", () => {
    const sameArticleCases = [
      { name: "a differing scheme", otherRef: "http://example.test/story" },
      { name: "a www prefix", otherRef: "https://www.example.test/story" },
      { name: "a trailing slash", otherRef: "https://example.test/story/" },
      { name: "an amp suffix", otherRef: "https://example.test/story/amp" },
      { name: "a utm campaign", otherRef: "https://example.test/story?utm_source=twitter" },
      { name: "a facebook click id", otherRef: "https://example.test/story?fbclid=abc123" },
      { name: "a fragment", otherRef: "https://example.test/story#comments" },
    ];

    for (const { name, otherRef } of sameArticleCases) {
      test(`treats ${name} as the same article`, async () => {
        const composite = new CompositeSignalSourceAdapter([
          new PrimaryNewsSource([signal("https://example.test/story"), signal(otherRef)]),
        ]);

        const signals = await composite.fetchSignals();

        expect(signals.map((entry) => entry.ref)).toEqual(["https://example.test/story"]);
      });
    }

    const distinctArticleCases = [
      { name: "a different path", otherRef: "https://example.test/other" },
      { name: "a different host", otherRef: "https://other.test/story" },
      { name: "a meaningful query param", otherRef: "https://example.test/story?id=42" },
    ];

    for (const { name, otherRef } of distinctArticleCases) {
      test(`keeps ${name} as its own article`, async () => {
        const composite = new CompositeSignalSourceAdapter([
          new PrimaryNewsSource([signal("https://example.test/story"), signal(otherRef)]),
        ]);

        const signals = await composite.fetchSignals();

        expect(signals).toHaveLength(2);
      });
    }

    test("falls back to the raw ref when it is not a parseable url", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource([signal("not a url"), signal("not a url")]),
      ]);

      const signals = await composite.fetchSignals();

      expect(signals).toHaveLength(1);
    });
  });

  describe("limit budget", () => {
    test("spends the caller's whole limit on the source that answers", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(signalPool(100, "https://primary.test/n")),
        new BackupNewsSource(signalPool(100, "https://backup.test/n")),
      ]);

      const signals = await composite.fetchSignals({ limit: 75 });

      expect(signals).toHaveLength(75);
      expect(signals.every((entry) => entry.ref.startsWith("https://primary.test/"))).toBe(true);
    });

    test("fills the whole limit from the backup rather than under-filling", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("gdelt 503")),
        new BackupNewsSource(signalPool(100, "https://backup.test/n")),
      ]);

      const signals = await composite.fetchSignals({ limit: 100 });

      expect(signals).toHaveLength(100);
    });

    test("gives a lone source the whole limit", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(signalPool(100, "https://primary.test/n")),
      ]);

      const signals = await composite.fetchSignals({ limit: 75 });

      expect(signals).toHaveLength(75);
    });

    test("leaves an absent limit to the answering source's own default", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(signalPool(3, "https://primary.test/n")),
        new BackupNewsSource(signalPool(2, "https://backup.test/n")),
      ]);

      const signals = await composite.fetchSignals();

      expect(signals).toHaveLength(3);
    });

    test("narrows the answering source with the caller's query", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource([
          signal("https://primary.test/a", { title: "Sanctions widen" }),
          signal("https://primary.test/b", { title: "Election results" }),
        ]),
      ]);

      const signals = await composite.fetchSignals({ query: "sanctions" });

      expect(signals.map((entry) => entry.ref)).toEqual(["https://primary.test/a"]);
    });

    test("carries the caller's query to the backup after the primary fails", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("GDELT DOC 429")),
        new BackupNewsSource([
          signal("https://backup.test/a", { title: "New sanctions package" }),
          signal("https://backup.test/b", { title: "Election results" }),
        ]),
      ]);

      const signals = await composite.fetchSignals({ query: "sanctions" });

      expect(signals.map((entry) => entry.ref)).toEqual(["https://backup.test/a"]);
    });
  });

  describe("failover", () => {
    test("reaches the backup once the primary has failed", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("GDELT DOC 429")),
        new BackupNewsSource([signal("https://example.test/ok")]),
      ]);

      const signals = await composite.fetchSignals();

      expect(signals.map((entry) => entry.ref)).toEqual(["https://example.test/ok"]);
    });

    test("stops at the first source that answers, however many follow", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("GDELT DOC 429")),
        new BackupNewsSource([signal("https://second.test/ok")]),
        new BackupNewsSource([signal("https://third.test/ok")]),
      ]);

      const signals = await composite.fetchSignals();

      expect(signals.map((entry) => entry.ref)).toEqual(["https://second.test/ok"]);
    });

    test("logs the failing source rather than swallowing it", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("GDELT DOC 429")),
        new BackupNewsSource([signal("https://example.test/ok")]),
      ]);

      await composite.fetchSignals();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("PrimaryNewsSource");
      expect(warnings[0]).toContain("GDELT DOC 429");
    });
  });

  describe("slow sources", () => {
    test("does not wait past the deadline for a stalled source", async () => {
      const composite = new CompositeSignalSourceAdapter(
        [
          new PrimaryNewsSource([signal("https://example.test/slow")], 200),
          new BackupNewsSource([signal("https://example.test/fast")]),
        ],
        10,
      );

      const signals = await composite.fetchSignals();

      expect(signals.map((entry) => entry.ref)).toEqual(["https://example.test/fast"]);
    });

    test("reports a timed-out source as a failure", async () => {
      const composite = new CompositeSignalSourceAdapter(
        [
          new PrimaryNewsSource([signal("https://example.test/slow")], 200),
          new BackupNewsSource([signal("https://example.test/fast")]),
        ],
        10,
      );

      await composite.fetchSignals();

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("PrimaryNewsSource did not answer within 10ms");
    });

    test("throws when every source is too slow", async () => {
      const composite = new CompositeSignalSourceAdapter(
        [
          new PrimaryNewsSource([signal("https://example.test/a")], 200),
          new BackupNewsSource([signal("https://example.test/b")], 200),
        ],
        10,
      );

      await expect(composite.fetchSignals()).rejects.toThrow(
        "[news-composite] every source failed",
      );
    });

    test("still returns a source that answers inside the deadline", async () => {
      const composite = new CompositeSignalSourceAdapter(
        [new PrimaryNewsSource([signal("https://example.test/a")], 5)],
        200,
      );

      const signals = await composite.fetchSignals();

      expect(signals.map((entry) => entry.ref)).toEqual(["https://example.test/a"]);
      expect(warnings).toEqual([]);
    });
  });

  describe("total failure", () => {
    test("throws instead of reporting an empty ingest when every source fails", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("GDELT DOC 429")),
        new BackupNewsSource(new Error("Exa search 401 Unauthorized")),
      ]);

      await expect(composite.fetchSignals()).rejects.toThrow(
        "[news-composite] every source failed: PrimaryNewsSource, BackupNewsSource",
      );
    });

    test("carries every underlying reason on the thrown error", async () => {
      const composite = new CompositeSignalSourceAdapter([
        new PrimaryNewsSource(new Error("GDELT DOC 429")),
        new BackupNewsSource(new Error("Exa search 401 Unauthorized")),
      ]);

      const error = await composite.fetchSignals().catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors.map((reason) => String(reason))).toEqual([
        "Error: GDELT DOC 429",
        "Error: Exa search 401 Unauthorized",
      ]);
    });
  });
});
