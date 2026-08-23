import { describe, expect, test } from "bun:test";
import { createPropertyExpression } from "@maplibre/maplibre-gl-style-spec";
import {
  AWARENESS_CLUSTER_COUNT_SIZE,
  AWARENESS_CLUSTER_COUNT_TEXT,
  AWARENESS_GLOW_OPACITY,
  AWARENESS_LABEL_TEXT,
  AWARENESS_ORB_OPACITY,
  AWARENESS_ORB_STROKE_OPACITY,
  clusterColor,
  clusterRadius,
  glowRadius,
  orbColor,
  orbRadius,
  selectionRadius,
} from "./constants.ts";

const NUMBER_SPEC = {
  type: "number",
  "property-type": "data-driven",
  expression: { interpolated: true, parameters: ["zoom", "feature"] },
};
const COLOR_SPEC = { ...NUMBER_SPEC, type: "color" };
const STRING_SPEC = {
  type: "string",
  "property-type": "data-driven",
  expression: { interpolated: false, parameters: ["zoom", "feature"] },
};

const PEAK = 65;
const RAMP = ["#2d4a9e", "#2f7fd0", "#22b3c4", "#4fe3c1", "#c2ffe8"];

const PAINT_PROPERTIES: Array<[string, unknown, unknown]> = [
  ["orbRadius", orbRadius(PEAK), NUMBER_SPEC],
  ["clusterRadius", clusterRadius(), NUMBER_SPEC],
  ["clusterColor", clusterColor(RAMP), COLOR_SPEC],
  ["glowRadius", glowRadius(PEAK), NUMBER_SPEC],
  ["selectionRadius", selectionRadius(PEAK), NUMBER_SPEC],
  ["clusterCountSize", AWARENESS_CLUSTER_COUNT_SIZE, NUMBER_SPEC],
  ["orbColor", orbColor(PEAK, RAMP), COLOR_SPEC],
  ["orbOpacity", AWARENESS_ORB_OPACITY, NUMBER_SPEC],
  ["orbStrokeOpacity", AWARENESS_ORB_STROKE_OPACITY, NUMBER_SPEC],
  ["glowOpacity", AWARENESS_GLOW_OPACITY, NUMBER_SPEC],
  ["labelText", AWARENESS_LABEL_TEXT, STRING_SPEC],
  ["clusterCountText", AWARENESS_CLUSTER_COUNT_TEXT, STRING_SPEC],
];

const A_PLACE = {
  properties: { place: "Khartoum", country: "Sudan", claimCount: 20, isCountryLevel: false },
};
const A_CLUSTER = {
  properties: { cluster: true, cluster_id: 3, point_count: 5, point_count_abbreviated: 5 },
};

describe("map paint expressions", () => {
  for (const [name, value, spec] of PAINT_PROPERTIES) {
    test(`${name} is a legal maplibre property expression, so its layer paints`, () => {
      const compiled = createPropertyExpression(value, spec as never);

      const errors = compiled.result === "success" ? [] : compiled.value.map((one) => one.message);

      expect(errors).toEqual([]);
    });
  }

  for (const [name, value, spec] of PAINT_PROPERTIES) {
    test(`${name} evaluates for a place and for a cluster without throwing`, () => {
      const compiled = createPropertyExpression(value, spec as never);
      if (compiled.result !== "success") throw new Error(`${name} did not compile`);

      const evaluateBoth = () => {
        compiled.value.evaluate({ zoom: 1.3 }, A_PLACE as never);
        compiled.value.evaluate({ zoom: 1.3 }, A_CLUSTER as never);
      };

      expect(evaluateBoth).not.toThrow();
    });
  }
});

describe("orb sizing", () => {
  function radiusAt(expression: unknown, claimCount: number, zoom: number): number {
    const compiled = createPropertyExpression(expression, NUMBER_SPEC as never);
    if (compiled.result !== "success") throw new Error("radius did not compile");
    return compiled.value.evaluate({ zoom }, { properties: { claimCount } } as never);
  }

  test("an orb is larger zoomed out than zoomed in, so the wide view stays readable", () => {
    const wide = radiusAt(orbRadius(PEAK), 20, 0);
    const close = radiusAt(orbRadius(PEAK), 20, 7);

    expect(wide).toBeGreaterThan(close);
  });

  test("a cluster is sized by how many places it holds, not by a claim count it never carries", () => {
    const compiled = createPropertyExpression(clusterRadius(), NUMBER_SPEC as never);
    if (compiled.result !== "success") throw new Error("clusterRadius did not compile");

    const small = compiled.value.evaluate({ zoom: 1.3 }, {
      properties: { point_count: 2 },
    } as never);
    const large = compiled.value.evaluate({ zoom: 1.3 }, {
      properties: { point_count: 20 },
    } as never);

    expect(large).toBeGreaterThan(small);
  });

  test("a cluster orb stays wide enough to hold its number", () => {
    const compiled = createPropertyExpression(clusterRadius(), NUMBER_SPEC as never);
    if (compiled.result !== "success") throw new Error("clusterRadius did not compile");

    const smallest = compiled.value.evaluate({ zoom: 1.3 }, {
      properties: { point_count: 2 },
    } as never);

    expect(smallest).toBeGreaterThan(14);
  });

  test("the quietest orb stays large enough to see", () => {
    expect(radiusAt(orbRadius(PEAK), 1, 1.3)).toBeGreaterThan(10);
  });
});
