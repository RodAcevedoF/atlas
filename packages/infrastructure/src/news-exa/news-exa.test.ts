import { afterEach, describe, expect, test } from "bun:test";
import type { ExaResult, ExaSearchRequest } from "./exa-types.ts";
import { ExaNewsAdapter } from "./index.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubExa(results: ExaResult[]) {
  const requested: RequestInit[] = [];
  globalThis.fetch = ((_input: unknown, init: RequestInit) => {
    requested.push(init);
    return Promise.resolve(new Response(JSON.stringify({ results }), { status: 200 }));
  }) as unknown as typeof fetch;
  return requested;
}

function sentRequest(requested: RequestInit[], index = 0): ExaSearchRequest {
  return JSON.parse(String(requested[index]?.body)) as ExaSearchRequest;
}

function result(url: string, overrides: Partial<ExaResult> = {}): ExaResult {
  return {
    id: url,
    url,
    title: `Headline ${url}`,
    publishedDate: "2026-08-15T00:00:00.000Z",
    ...overrides,
  };
}

function resultPool(count: number, prefix: string): ExaResult[] {
  return Array.from({ length: count }, (_value, index) => result(`${prefix}${index}`));
}

describe("ExaNewsAdapter", () => {
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
        stubExa([result("https://example.test/story"), result(otherRef)]);

        const signals = await new ExaNewsAdapter("key").fetchSignals();

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
        stubExa([result("https://example.test/story"), result(otherRef)]);

        const signals = await new ExaNewsAdapter("key").fetchSignals();

        expect(signals).toHaveLength(2);
      });
    }
  });

  describe("limit budget", () => {
    test("asks Exa for exactly the caller's limit", async () => {
      const requested = stubExa([]);

      await new ExaNewsAdapter("key").fetchSignals({ limit: 75 });

      expect(sentRequest(requested).numResults).toBe(75);
    });

    test("never asks Exa for more than a page of results", async () => {
      const requested = stubExa([]);

      await new ExaNewsAdapter("key").fetchSignals({ limit: 500 });

      expect(sentRequest(requested).numResults).toBe(100);
    });

    test("caps what it returns at the caller's limit even if Exa over-delivers", async () => {
      stubExa(resultPool(40, "https://example.test/n"));

      const signals = await new ExaNewsAdapter("key").fetchSignals({ limit: 25 });

      expect(signals).toHaveLength(25);
    });
  });

  describe("deadline", () => {
    test("gives the whole search, retries included, a bounded budget", async () => {
      const requested = stubExa([]);

      await new ExaNewsAdapter("key").fetchSignals();

      const signal = requested[0]?.signal;
      expect(signal).toBeInstanceOf(AbortSignal);
      expect(signal?.aborted).toBe(false);
    });
  });

  describe("signal mapping", () => {
    const droppedCases = [
      { name: "no title to classify", broken: result("https://example.test/a", { title: null }) },
      {
        name: "no published date",
        broken: result("https://example.test/a", { publishedDate: undefined }),
      },
      {
        name: "an unparseable published date",
        broken: result("https://example.test/a", { publishedDate: "sometime" }),
      },
    ];

    for (const { name, broken } of droppedCases) {
      test(`drops a result with ${name}`, async () => {
        stubExa([broken, result("https://example.test/b")]);

        const signals = await new ExaNewsAdapter("key").fetchSignals();

        expect(signals.map((entry) => entry.ref)).toEqual(["https://example.test/b"]);
      });
    }

    test("keeps the article url as the signal's ref and timestamp from its published date", async () => {
      stubExa([result("https://example.test/a", { publishedDate: "2026-08-15T09:30:00.000Z" })]);

      const signals = await new ExaNewsAdapter("key").fetchSignals();

      expect(signals[0]?.ref).toBe("https://example.test/a");
      expect(signals[0]?.timestamp.toISOString()).toBe("2026-08-15T09:30:00.000Z");
    });
  });
});
