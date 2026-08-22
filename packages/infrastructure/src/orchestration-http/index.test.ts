import { describe, expect, test } from "bun:test";
import { GraphUnavailableError } from "@atlas/application";
import { HttpOrchestration } from "./index.ts";

function respondingWith(status: number, body: unknown = {}): typeof fetch {
  return (() =>
    Promise.resolve(new Response(JSON.stringify(body), { status }))) as unknown as typeof fetch;
}

function refusing(reason: string): typeof fetch {
  return (() => Promise.reject(new TypeError(reason))) as unknown as typeof fetch;
}

async function rejection(fetchImpl: typeof fetch): Promise<unknown> {
  const orchestration = new HttpOrchestration("http://engine.test", fetchImpl);
  try {
    await orchestration.run({ graphName: "inquiry", input: { question: "q", window: "1w" } });
  } catch (error) {
    return error;
  }
  throw new Error("expected run to reject, but it resolved");
}

describe("HttpOrchestration", () => {
  describe("run", () => {
    const retryableCases = [
      { name: "the engine crashed", status: 500 },
      { name: "a gateway is between us", status: 502 },
      { name: "the engine is restarting", status: 503 },
    ];

    for (const { name, status } of retryableCases) {
      test(`treats ${name} as an outage the run can survive`, async () => {
        const error = await rejection(respondingWith(status));

        expect(error).toBeInstanceOf(GraphUnavailableError);
      });
    }

    test("treats an engine it never reached as an outage the run can survive", async () => {
      const error = await rejection(refusing("connect ECONNREFUSED"));

      expect(error).toBeInstanceOf(GraphUnavailableError);
    });

    const permanentCases = [
      { name: "the request shape was refused", status: 422 },
      { name: "the request was malformed", status: 400 },
      { name: "the graph does not exist", status: 404 },
    ];

    for (const { name, status } of permanentCases) {
      test(`does not offer a retry when ${name}`, async () => {
        const error = await rejection(respondingWith(status));

        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(GraphUnavailableError);
      });
    }

    test("returns the engine's body when the run succeeds", async () => {
      const orchestration = new HttpOrchestration(
        "http://engine.test",
        respondingWith(200, { status: "succeeded", places: [] }),
      );

      const body = await orchestration.run({ graphName: "inquiry", input: {} });

      expect(body).toEqual({ status: "succeeded", places: [] });
    });
  });
});
