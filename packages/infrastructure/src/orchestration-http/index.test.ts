import { describe, expect, test } from "bun:test";
import type { GraphEvent, InquiryRunEnvelope } from "@atlas/application";
import { GraphUnavailableError, GraphUnreadableError } from "@atlas/application";
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

  describe("stream", () => {
    function envelopeWire(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return {
        schemaVersion: 1,
        runId: "run-1",
        attempt: 1,
        sequence: 1,
        type: "map_ready",
        occurredAt: "2026-09-06T12:00:00+00:00",
        durationMs: 10,
        data: {},
        ...overrides,
      };
    }

    function terminalWire(sequence: number): Record<string, unknown> {
      return envelopeWire({
        sequence,
        type: "run_complete",
        data: { result: { status: "succeeded" } },
      });
    }

    function sseFrame(payload: unknown): string {
      return `event: graph\ndata: ${JSON.stringify(payload)}\n\n`;
    }

    function streamingWith(chunks: string[], dropAfter = false): typeof fetch {
      return (() => {
        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(chunk));
            }
            if (dropAfter) {
              controller.error(new Error("connection reset"));
              return;
            }
            controller.close();
          },
        });
        return Promise.resolve(new Response(body, { status: 200 }));
      }) as unknown as typeof fetch;
    }

    async function collected(
      fetchImpl: typeof fetch,
    ): Promise<(GraphEvent | InquiryRunEnvelope)[]> {
      const orchestration = new HttpOrchestration("http://engine.test", fetchImpl);
      const events: (GraphEvent | InquiryRunEnvelope)[] = [];
      const stream = orchestration.stream({
        graphName: "inquiry",
        input: { question: "q", window: "1w" },
        runId: "run-1",
        attempt: 1,
      });
      for await (const event of stream) {
        events.push(event);
      }
      return events;
    }

    async function streamRejection(fetchImpl: typeof fetch): Promise<unknown> {
      try {
        await collected(fetchImpl);
      } catch (error) {
        return error;
      }
      throw new Error("expected the stream to reject, but it completed");
    }

    test("frames split across arbitrary chunk boundaries parse once complete", async () => {
      const wire = sseFrame(envelopeWire()) + sseFrame(terminalWire(2));
      const cut = sseFrame(envelopeWire()).length - 7;

      const events = await collected(streamingWith([wire.slice(0, cut), wire.slice(cut)]));

      expect(events.map((event) => ("type" in event ? event.type : null))).toEqual([
        "map_ready",
        "run_complete",
      ]);
    });

    test("a frame that is not JSON is unreadable, not an outage", async () => {
      const error = await streamRejection(streamingWith(["event: graph\ndata: {broken\n\n"]));

      expect(error).toBeInstanceOf(GraphUnreadableError);
    });

    test("an envelope that fails validation is unreadable", async () => {
      const error = await streamRejection(streamingWith([sseFrame(envelopeWire({ attempt: 0 }))]));

      expect(error).toBeInstanceOf(GraphUnreadableError);
    });

    test("a sequence regression is unreadable", async () => {
      const error = await streamRejection(
        streamingWith([
          sseFrame(envelopeWire({ sequence: 2 })),
          sseFrame(envelopeWire({ sequence: 2 })),
        ]),
      );

      expect(error).toBeInstanceOf(GraphUnreadableError);
    });

    test("a stream that ends without a terminal event is an outage, and a torn tail is discarded", async () => {
      const error = await streamRejection(
        streamingWith([sseFrame(envelopeWire()), 'event: graph\ndata: {"schemaVe']),
      );

      expect(error).toBeInstanceOf(GraphUnavailableError);
    });

    test("a connection dropped mid-stream is an outage the run can survive", async () => {
      const error = await streamRejection(streamingWith([sseFrame(envelopeWire())], true));

      expect(error).toBeInstanceOf(GraphUnavailableError);
    });

    test("an engine it never reached is an outage the run can survive", async () => {
      const error = await streamRejection(refusing("connect ECONNREFUSED"));

      expect(error).toBeInstanceOf(GraphUnavailableError);
    });

    test("an engine that crashed on arrival is an outage the run can survive", async () => {
      const error = await streamRejection(respondingWith(503));

      expect(error).toBeInstanceOf(GraphUnavailableError);
    });

    test("iteration stops at the terminal envelope and ignores trailing garbage", async () => {
      const events = await collected(
        streamingWith([sseFrame(terminalWire(1)), "event: graph\ndata: {broken\n\n"]),
      );

      expect(events).toHaveLength(1);
      expect("type" in events[0] && events[0].type).toBe("run_complete");
    });

    test("a legacy graph still streams its events unchanged", async () => {
      const legacy = {
        runId: "run-1",
        node: "attachment-interpretation",
        type: "run:complete",
        data: { summary: "s" },
        timestamp: "2026-09-06T12:00:00+00:00",
      };

      const events = await collected(streamingWith([sseFrame(legacy)]));

      expect(events).toHaveLength(1);
      expect("node" in events[0] && events[0].node).toBe("attachment-interpretation");
    });

    test("the connection is cancelled once the terminal envelope arrives", async () => {
      let cancelled = false;
      const stillOpen = (() => {
        const encoder = new TextEncoder();
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(sseFrame(terminalWire(1))));
          },
          cancel() {
            cancelled = true;
          },
        });
        return Promise.resolve(new Response(body, { status: 200 }));
      }) as unknown as typeof fetch;

      await collected(stillOpen);

      expect(cancelled).toBe(true);
    });

    test("the request tells the engine which attempt is streaming", async () => {
      let sent: unknown = null;
      const capturing = ((_url: unknown, init: { body: string }) => {
        sent = JSON.parse(init.body);
        return Promise.resolve(new Response(sseFrame(terminalWire(1)), { status: 200 }));
      }) as unknown as typeof fetch;

      await collected(capturing);

      expect(sent).toEqual({
        input: { question: "q", window: "1w" },
        runId: "run-1",
        attempt: 1,
      });
    });
  });
});
