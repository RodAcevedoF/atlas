import { describe, expect, test } from "bun:test";
import { isPaintableRun } from "./paintable-run.ts";

describe("isPaintableRun", () => {
  const cases = [
    { name: "a run that placed a claim can be shown on the map", placeCount: 1, can: true },
    { name: "a run that placed nothing cannot", placeCount: 0, can: false },
  ];

  for (const { name, placeCount, can } of cases) {
    test(name, () => {
      expect(isPaintableRun(placeCount)).toBe(can);
    });
  }
});
