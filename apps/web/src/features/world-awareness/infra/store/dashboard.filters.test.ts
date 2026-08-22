import { describe, expect, test } from "bun:test";
import { INITIAL_TOPIC, toLoadWorldDashboardInput } from "./dashboard.filters.ts";

describe("toLoadWorldDashboardInput", () => {
  test("a cleared topic leaves both world reads unscoped", () => {
    const input = toLoadWorldDashboardInput("");

    expect([input.worldTopics?.topic, input.worldEvents?.topic]).toEqual([undefined, undefined]);
  });

  test("scopes both world reads to the chosen topic, keeping the map and the rail in step", () => {
    const input = toLoadWorldDashboardInput("conflict");

    expect([input.worldTopics?.topic, input.worldEvents?.topic]).toEqual(["conflict", "conflict"]);
  });

  test("asks for far more world events than the API's own default of 12", () => {
    const input = toLoadWorldDashboardInput(INITIAL_TOPIC);

    expect(input.worldEvents?.limit).toBe(60);
  });

  test("bounds both reads, so no topic selection can pull an unbounded page", () => {
    const input = toLoadWorldDashboardInput(INITIAL_TOPIC);

    expect([input.worldTopics?.limit, input.worldEvents?.limit]).toEqual([8, 60]);
  });
});

describe("INITIAL_TOPIC", () => {
  test("starts unscoped, so the map opens on the whole world", () => {
    expect(INITIAL_TOPIC).toBe("");
  });
});
