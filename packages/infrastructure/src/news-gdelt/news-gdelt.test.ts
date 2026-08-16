import { afterEach, describe, expect, test } from "bun:test";
import { makeSignalId } from "@atlas/domain";
import type { GdeltArticle } from "./gdelt-types.ts";
import { GdeltNewsAdapter } from "./index.ts";

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Stubs global fetch (the adapter reaches GDELT through `fetchWithRetry`) and captures the URLs. */
function stubGdelt(articles: GdeltArticle[]) {
  return stubResponse(() => new Response(JSON.stringify({ articles }), { status: 200 }));
}

function stubResponse(build: () => Response) {
  const requested: URL[] = [];
  globalThis.fetch = ((input: unknown) => {
    requested.push(new URL(String(input)));
    return Promise.resolve(build());
  }) as unknown as typeof fetch;
  return requested;
}

function article(overrides: Partial<GdeltArticle> = {}): GdeltArticle {
  return {
    url: "https://example.test/a",
    title: "Election results announced",
    seendate: "20260810T120000Z",
    language: "English",
    sourcecountry: "France",
    ...overrides,
  };
}

describe("GdeltNewsAdapter", () => {
  describe("query building", () => {
    test("restricts the default query to English sources", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals();

      expect(requested[0]?.searchParams.get("query")).toEndWith(" sourcelang:english");
    });

    test("appends the language restriction to a caller's query", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals({ query: "sanctions" });

      expect(requested[0]?.searchParams.get("query")).toBe("sanctions sourcelang:english");
    });

    test("leaves a query that already pins a source language alone", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals({ query: "protest sourcelang:spanish" });

      expect(requested[0]?.searchParams.get("query")).toBe("protest sourcelang:spanish");
    });

    test("sends the fixed ArtList/json/DateDesc parameters", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals();

      expect(requested[0]?.searchParams.get("mode")).toBe("ArtList");
      expect(requested[0]?.searchParams.get("format")).toBe("json");
      expect(requested[0]?.searchParams.get("sort")).toBe("DateDesc");
    });

    const limitCases = [
      { name: "no limit", limit: undefined, expected: "75" },
      { name: "zero", limit: 0, expected: "75" },
      { name: "a negative limit", limit: -5, expected: "75" },
      { name: "a limit inside the cap", limit: 10, expected: "10" },
      { name: "a limit above the cap", limit: 999, expected: "250" },
    ];

    for (const { name, limit, expected } of limitCases) {
      test(`clamps ${name} to maxrecords=${expected}`, async () => {
        const requested = stubGdelt([]);

        await new GdeltNewsAdapter().fetchSignals(limit === undefined ? undefined : { limit });

        expect(requested[0]?.searchParams.get("maxrecords")).toBe(expected);
      });
    }
  });

  describe("time window", () => {
    test("asks for the last day when no window is given", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals();

      expect(requested[0]?.searchParams.get("timespan")).toBe("1d");
      expect(requested[0]?.searchParams.has("startdatetime")).toBe(false);
    });

    test("closes an open-ended window 24h after its start", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals({ from: new Date("2026-08-09T00:00:00.000Z") });

      expect(requested[0]?.searchParams.get("startdatetime")).toBe("20260809000000");
      expect(requested[0]?.searchParams.get("enddatetime")).toBe("20260810000000");
      expect(requested[0]?.searchParams.has("timespan")).toBe(false);
    });

    test("uses an explicit end when one is given", async () => {
      const requested = stubGdelt([]);

      await new GdeltNewsAdapter().fetchSignals({
        from: new Date("2026-08-09T00:00:00.000Z"),
        to: new Date("2026-08-09T06:30:00.000Z"),
      });

      expect(requested[0]?.searchParams.get("enddatetime")).toBe("20260809063000");
    });
  });

  describe("signal mapping", () => {
    test("maps an article onto a news signal", async () => {
      stubGdelt([article()]);

      const [signal] = await new GdeltNewsAdapter().fetchSignals();

      expect(signal).toEqual({
        id: makeSignalId("news:https://example.test/a"),
        source: "news",
        topic: "politics",
        primaryRegion: "europe",
        regions: ["europe"],
        sourceCountry: "France",
        weight: 1,
        sentiment: 0,
        title: "Election results announced",
        ref: "https://example.test/a",
        timestamp: new Date("2026-08-10T12:00:00.000Z"),
        createdAt: new Date("2026-08-10T12:00:00.000Z"),
      });
    });

    test("falls back to the global region when nothing in the text places it", async () => {
      stubGdelt([article({ title: "Quarterly earnings beat", sourcecountry: undefined })]);

      const [signal] = await new GdeltNewsAdapter().fetchSignals();

      expect(signal?.primaryRegion).toBe("global");
      expect(signal?.regions).toEqual(["global"]);
    });

    const sourceCountryCases = [
      {
        name: "keeps the provider country unmapped, so a later classifier can re-derive regions",
        sourcecountry: "France",
        expected: "France",
      },
      {
        name: "records no country rather than inventing one when GDELT omits it",
        sourcecountry: undefined,
        expected: null,
      },
    ];

    for (const { name, sourcecountry, expected } of sourceCountryCases) {
      test(name, async () => {
        stubGdelt([article({ sourcecountry })]);

        const [signal] = await new GdeltNewsAdapter().fetchSignals();

        expect(signal?.sourceCountry).toBe(expected);
      });
    }

    const dropCases = [
      { name: "an article with no url", overrides: { url: "" } },
      { name: "an article with no title", overrides: { title: "" } },
      { name: "a non-English article", overrides: { language: "Spanish" } },
      { name: "an unparseable seendate", overrides: { seendate: "2026-08-10" } },
      { name: "a missing seendate", overrides: { seendate: "" } },
    ];

    for (const { name, overrides } of dropCases) {
      test(`drops ${name}`, async () => {
        stubGdelt([article(overrides)]);

        const signals = await new GdeltNewsAdapter().fetchSignals();

        expect(signals).toEqual([]);
      });
    }

    const keptLanguages = ["English", "eng", "en", " EN ", undefined];

    for (const language of keptLanguages) {
      test(`keeps an article tagged ${JSON.stringify(language)}`, async () => {
        stubGdelt([article({ language })]);

        const signals = await new GdeltNewsAdapter().fetchSignals();

        expect(signals).toHaveLength(1);
      });
    }

    test("keeps the good articles in a mixed batch", async () => {
      stubGdelt([
        article({ url: "https://example.test/a" }),
        article({ url: "", title: "no url" }),
        article({ url: "https://example.test/b", language: "German" }),
        article({ url: "https://example.test/c" }),
      ]);

      const signals = await new GdeltNewsAdapter().fetchSignals();

      expect(signals.map((signal) => signal.ref)).toEqual([
        "https://example.test/a",
        "https://example.test/c",
      ]);
    });

    test("returns nothing when GDELT omits the articles field", async () => {
      stubResponse(() => new Response("{}", { status: 200 }));

      const signals = await new GdeltNewsAdapter().fetchSignals();

      expect(signals).toEqual([]);
    });
  });

  describe("failure surfacing", () => {
    test("throws on a rate-limited response instead of reporting an empty ingest", async () => {
      const requested = stubResponse(
        () =>
          new Response("You have exceeded the maximum request rate", {
            status: 429,
            headers: { "retry-after": "0" },
          }),
      );

      await expect(new GdeltNewsAdapter().fetchSignals()).rejects.toThrow("GDELT DOC 429");
      expect(requested).toHaveLength(4);
    });

    test("throws on a non-JSON body rather than parsing it", async () => {
      stubResponse(() => new Response("Rate limit exceeded", { status: 200 }));

      await expect(new GdeltNewsAdapter().fetchSignals()).rejects.toThrow(
        "non-JSON response: Rate limit exceeded",
      );
    });
  });
});
