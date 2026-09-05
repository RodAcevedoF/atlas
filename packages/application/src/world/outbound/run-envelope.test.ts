import { describe, expect, test } from "bun:test";
import { asRunEnvelope, isTerminalRunEnvelope } from "./run-envelope.ts";

function wireEnvelope(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    runId: "run-1",
    attempt: 1,
    sequence: 1,
    type: "map_ready",
    occurredAt: "2026-09-06T12:00:00+00:00",
    durationMs: 120,
    data: { places: [] },
    ...overrides,
  };
}

describe("asRunEnvelope", () => {
  test("a valid envelope is accepted with its timestamp parsed", () => {
    const envelope = asRunEnvelope(wireEnvelope());

    expect(envelope).not.toBeNull();
    expect(envelope?.type).toBe("map_ready");
    expect(envelope?.occurredAt).toEqual(new Date("2026-09-06T12:00:00+00:00"));
    expect(envelope?.data).toEqual({ places: [] });
  });

  test("a terminal failure with a known class is accepted", () => {
    const envelope = asRunEnvelope(
      wireEnvelope({ type: "run_failed", data: { failureClass: "transport", result: null } }),
    );

    expect(envelope?.type).toBe("run_failed");
    expect(envelope ? isTerminalRunEnvelope(envelope) : null).toBe(true);
  });

  test("a milestone is not terminal", () => {
    const envelope = asRunEnvelope(wireEnvelope());

    expect(envelope ? isTerminalRunEnvelope(envelope) : null).toBe(false);
  });

  const rejections: [string, unknown][] = [
    ["a non-object frame", "event: graph"],
    ["a foreign schema version", wireEnvelope({ schemaVersion: 2 })],
    ["an empty run id", wireEnvelope({ runId: "" })],
    ["a zero attempt", wireEnvelope({ attempt: 0 })],
    ["a fractional sequence", wireEnvelope({ sequence: 1.5 })],
    ["an unknown event type", wireEnvelope({ type: "tokens" })],
    ["an unreadable timestamp", wireEnvelope({ occurredAt: "yesterday-ish" })],
    ["a negative duration", wireEnvelope({ durationMs: -1 })],
    ["a fractional duration", wireEnvelope({ durationMs: 0.5 })],
    ["an array payload", wireEnvelope({ data: [] })],
    [
      "a terminal failure with a raw provider string as its class",
      wireEnvelope({ type: "run_failed", data: { failureClass: "HTTP 429 from exa" } }),
    ],
  ];

  for (const [name, wire] of rejections) {
    test(`${name} is rejected`, () => {
      expect(asRunEnvelope(wire)).toBeNull();
    });
  }
});
