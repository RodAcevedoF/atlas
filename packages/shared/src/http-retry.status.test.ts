import { afterEach, describe, expect, mock, test } from "bun:test";
import { fetchWithRetry } from "./http-retry.ts";

const realFetch = globalThis.fetch;
const noWait = () => Promise.resolve();

afterEach(() => {
  globalThis.fetch = realFetch;
});

function stubFetchStatus(status: number) {
  const fetchStub = mock(() => Promise.resolve(new Response("body", { status })));
  globalThis.fetch = fetchStub as unknown as typeof fetch;
  return fetchStub;
}

describe("fetchWithRetry status handling", () => {
  const retryableCases = [
    { status: 429 },
    { status: 500 },
    { status: 502 },
    { status: 503 },
    { status: 504 },
  ];

  for (const { status } of retryableCases) {
    test(`retries then returns the final ${status} response`, async () => {
      const fetchStub = stubFetchStatus(status);

      const response = await fetchWithRetry("https://example.test", undefined, {
        maxRetries: 2,
        sleep: noWait,
      });

      expect(response.status).toBe(status);
      expect(fetchStub).toHaveBeenCalledTimes(3);
    });
  }

  const passthroughCases = [{ status: 200 }, { status: 201 }, { status: 400 }, { status: 404 }];

  for (const { status } of passthroughCases) {
    test(`returns a ${status} response without retrying`, async () => {
      const fetchStub = stubFetchStatus(status);

      const response = await fetchWithRetry("https://example.test", undefined, {
        maxRetries: 2,
        sleep: noWait,
      });

      expect(response.status).toBe(status);
      expect(fetchStub).toHaveBeenCalledTimes(1);
    });
  }

  test("stops retrying as soon as a success arrives", async () => {
    const statuses = [429, 503, 200];
    let call = 0;
    const fetchStub = mock(() =>
      Promise.resolve(new Response("body", { status: statuses[call++] })),
    );
    globalThis.fetch = fetchStub as unknown as typeof fetch;

    const response = await fetchWithRetry("https://example.test", undefined, {
      maxRetries: 5,
      sleep: noWait,
    });

    expect(response.status).toBe(200);
    expect(fetchStub).toHaveBeenCalledTimes(3);
  });

  test("honors a custom retryable status set", async () => {
    const fetchStub = stubFetchStatus(418);

    const response = await fetchWithRetry("https://example.test", undefined, {
      maxRetries: 2,
      retryableStatuses: new Set([418]),
      sleep: noWait,
    });

    expect(response.status).toBe(418);
    expect(fetchStub).toHaveBeenCalledTimes(3);
  });
});
