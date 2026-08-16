import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { type FanOutTask, failOverAcrossSources, fanOutToSources } from "./fan-out.ts";

function answering<T>(source: string, value: T, delayMs = 0): FanOutTask<T> {
  return {
    source,
    run: async () => {
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      return value;
    },
  };
}

function failing<T>(source: string, reason: Error): FanOutTask<T> {
  return {
    source,
    run: () => Promise.reject(reason),
  };
}

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

describe("fanOutToSources", () => {
  describe("healthy sources", () => {
    test("returns every source's value, in task order", async () => {
      const values = await fanOutToSources("test", [
        answering("first", "a"),
        answering("second", "b"),
      ]);

      expect(values).toEqual(["a", "b"]);
    });

    test("keeps task order even when a later source answers first", async () => {
      const values = await fanOutToSources("test", [
        answering("slow", "a", 30),
        answering("fast", "b"),
      ]);

      expect(values).toEqual(["a", "b"]);
    });

    test("says nothing when every source answers", async () => {
      await fanOutToSources("test", [answering("first", "a"), answering("second", "b")]);

      expect(warnings).toEqual([]);
    });
  });

  describe("partial failure", () => {
    const failoverCases = [
      {
        name: "the first source",
        tasks: () => [failing("first", new Error("boom")), answering("second", "b")],
      },
      {
        name: "the last source",
        tasks: () => [answering("first", "a"), failing("second", new Error("boom"))],
      },
    ];

    for (const { name, tasks } of failoverCases) {
      test(`drops ${name} and keeps the rest`, async () => {
        const values = await fanOutToSources("test", tasks());

        expect(values).toHaveLength(1);
      });
    }

    test("drops a source that throws before it returns a promise", async () => {
      const throwing: FanOutTask<string> = {
        source: "misconfigured",
        run: () => {
          throw new Error("no api key");
        },
      };

      const values = await fanOutToSources("test", [throwing, answering("second", "b")]);

      expect(values).toEqual(["b"]);
    });

    test("logs the failing source under the caller's label", async () => {
      await fanOutToSources("markets", [
        failing("Polymarket", new Error("gamma 429")),
        answering("Kalshi", "b"),
      ]);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("[markets] Polymarket failed");
      expect(warnings[0]).toContain("gamma 429");
    });
  });

  describe("deadline", () => {
    test("drops a source that misses the deadline", async () => {
      const values = await fanOutToSources(
        "test",
        [answering("slow", "a", 200), answering("fast", "b")],
        10,
      );

      expect(values).toEqual(["b"]);
    });

    test("reports the missed deadline as a failure", async () => {
      await fanOutToSources("test", [answering("slow", "a", 200), answering("fast", "b")], 10);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("slow did not answer within 10ms");
    });

    test("keeps a source that answers inside the deadline", async () => {
      const values = await fanOutToSources("test", [answering("prompt", "a", 5)], 200);

      expect(values).toEqual(["a"]);
      expect(warnings).toEqual([]);
    });
  });

  describe("total failure", () => {
    test("throws rather than returning an empty result", async () => {
      const fanOut = fanOutToSources("test", [
        failing("first", new Error("boom")),
        failing("second", new Error("bang")),
      ]);

      await expect(fanOut).rejects.toThrow("[test] every source failed: first, second");
    });

    test("carries every underlying reason", async () => {
      const error = await fanOutToSources("test", [
        failing("first", new Error("boom")),
        failing("second", new Error("bang")),
      ]).catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors.map((reason) => String(reason))).toEqual([
        "Error: boom",
        "Error: bang",
      ]);
    });

    test("throws when every source misses the deadline", async () => {
      const fanOut = fanOutToSources(
        "test",
        [answering("slow", "a", 200), answering("slower", "b", 200)],
        10,
      );

      await expect(fanOut).rejects.toThrow("[test] every source failed");
    });
  });
});

describe("failOverAcrossSources", () => {
  describe("order", () => {
    test("returns the first source's value and never reaches the rest", async () => {
      const value = await failOverAcrossSources("test", [
        answering("first", "a"),
        failing("second", new Error("must not be reached")),
      ]);

      expect(value).toBe("a");
      expect(warnings).toEqual([]);
    });

    test("moves to the next source only once the earlier one failed", async () => {
      const value = await failOverAcrossSources("test", [
        failing("first", new Error("boom")),
        answering("second", "b"),
      ]);

      expect(value).toBe("b");
    });

    test("stops at the first source that answers, however many follow", async () => {
      const value = await failOverAcrossSources("test", [
        failing("first", new Error("boom")),
        answering("second", "b"),
        answering("third", "c"),
      ]);

      expect(value).toBe("b");
    });

    test("logs each source it had to give up on", async () => {
      await failOverAcrossSources("test", [
        failing("first", new Error("boom")),
        answering("second", "b"),
      ]);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("first");
      expect(warnings[0]).toContain("boom");
    });
  });

  describe("deadlines", () => {
    test("gives up on a stalled source and falls through to the next", async () => {
      const value = await failOverAcrossSources(
        "test",
        [answering("slow", "a", 200), answering("fast", "b")],
        10,
      );

      expect(value).toBe("b");
    });

    test("reports a timed-out source by name", async () => {
      await failOverAcrossSources(
        "test",
        [answering("slow", "a", 200), answering("fast", "b")],
        10,
      );

      expect(warnings[0]).toContain("slow did not answer within 10ms");
    });

    test("caps the whole attempt with the budget rather than letting deadlines add up", async () => {
      const startedAt = Date.now();

      const failOver = failOverAcrossSources(
        "test",
        [answering("slow", "a", 500), answering("slower", "b", 500)],
        60,
        80,
      );

      await expect(failOver).rejects.toThrow("[test] every source failed");
      expect(Date.now() - startedAt).toBeLessThan(120);
    });

    test("leaves the first source its full deadline and squeezes the later one", async () => {
      const value = await failOverAcrossSources(
        "test",
        [answering("slow", "a", 500), answering("second", "b", 5)],
        60,
        80,
      );

      expect(value).toBe("b");
    });
  });

  describe("total failure", () => {
    test("throws rather than returning nothing", async () => {
      const failOver = failOverAcrossSources("test", [
        failing("first", new Error("boom")),
        failing("second", new Error("bang")),
      ]);

      await expect(failOver).rejects.toThrow("[test] every source failed: first, second");
    });

    test("carries every underlying reason", async () => {
      const error = await failOverAcrossSources("test", [
        failing("first", new Error("boom")),
        failing("second", new Error("bang")),
      ]).catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(AggregateError);
      expect((error as AggregateError).errors.map((reason) => String(reason))).toEqual([
        "Error: boom",
        "Error: bang",
      ]);
    });
  });
});
