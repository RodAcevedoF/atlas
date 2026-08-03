import { afterEach, describe, expect, mock, test } from "bun:test";
import { fetchWithRetry } from "./http-retry.ts";

const realFetch = globalThis.fetch;
const noWait = () => Promise.resolve();

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("fetchWithRetry request forwarding", () => {
  test("resends the same init (auth headers and body) on every attempt", async () => {
    const seenInits: (RequestInit | undefined)[] = [];
    const statuses = [429, 200];
    let call = 0;
    const fetchStub = mock((_input: unknown, init?: RequestInit) => {
      seenInits.push(init);
      return Promise.resolve(new Response("body", { status: statuses[call++] }));
    });
    globalThis.fetch = fetchStub as unknown as typeof fetch;

    const init: RequestInit = {
      method: "POST",
      headers: { "x-api-key": "secret" },
      body: JSON.stringify({ query: "atlas" }),
    };

    await fetchWithRetry("https://example.test", init, { maxRetries: 2, sleep: noWait });

    expect(seenInits).toHaveLength(2);
    expect(seenInits[0]).toBe(init);
    expect(seenInits[1]).toBe(init);
  });

  test("retries a network error and then succeeds", async () => {
    let call = 0;
    const fetchStub = mock(() => {
      call += 1;
      if (call === 1) return Promise.reject(new TypeError("network down"));
      return Promise.resolve(new Response("body", { status: 200 }));
    });
    globalThis.fetch = fetchStub as unknown as typeof fetch;

    const response = await fetchWithRetry("https://example.test", undefined, {
      maxRetries: 2,
      sleep: noWait,
    });

    expect(response.status).toBe(200);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });
});

describe("fetchWithRetry Retry-After handling", () => {
  const cases = [
    { name: "numeric seconds", header: "2", expectedDelay: 2_000 },
    { name: "zero seconds", header: "0", expectedDelay: 0 },
  ];

  for (const { name, header, expectedDelay } of cases) {
    test(`waits the ${name} advertised by Retry-After`, async () => {
      const delays: number[] = [];
      const sleep = mock((ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });
      const fetchStub = mock(() =>
        Promise.resolve(new Response("body", { status: 429, headers: { "retry-after": header } })),
      );
      globalThis.fetch = fetchStub as unknown as typeof fetch;

      await fetchWithRetry("https://example.test", undefined, { maxRetries: 1, sleep });

      expect(delays).toEqual([expectedDelay]);
    });
  }

  test("caps a large Retry-After at maxDelayMs", async () => {
    const delays: number[] = [];
    const sleep = mock((ms: number) => {
      delays.push(ms);
      return Promise.resolve();
    });
    const fetchStub = mock(() =>
      Promise.resolve(new Response("body", { status: 429, headers: { "retry-after": "120" } })),
    );
    globalThis.fetch = fetchStub as unknown as typeof fetch;

    await fetchWithRetry("https://example.test", undefined, {
      maxRetries: 1,
      maxDelayMs: 5_000,
      sleep,
    });

    expect(delays).toEqual([5_000]);
  });
});
