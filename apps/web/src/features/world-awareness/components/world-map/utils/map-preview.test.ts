import { describe, expect, test } from "bun:test";
import { mapPreviewReducer, readMapPreview, visibleMapPreview } from "./map-preview.ts";

describe("readMapPreview", () => {
  test("an orb exposes its place, country, and claim count before selection", () => {
    const preview = readMapPreview({ place: "Khartoum", country: "Sudan", claimCount: 3 });

    expect(preview).toEqual({
      kind: "orb",
      place: "Khartoum",
      country: "Sudan",
      claimCount: 3,
    });
  });

  test("a cluster exposes both the number of places and the summed claims", () => {
    const preview = readMapPreview({
      cluster: true,
      cluster_id: 12,
      point_count: 8,
      claimCount: 21,
    });

    expect(preview).toEqual({ kind: "cluster", placeCount: 8, claimCount: 21 });
  });

  const invalidOrbs = [
    ["clustered properties", { cluster_id: 12, point_count: 8, claimCount: 21 }],
    ["a blank place", { place: "  ", claimCount: 3 }],
    ["a missing count", { place: "Khartoum" }],
    ["zero claims", { place: "Khartoum", claimCount: 0 }],
    ["a fractional count", { place: "Khartoum", claimCount: 1.5 }],
    ["an infinite count", { place: "Khartoum", claimCount: Number.POSITIVE_INFINITY }],
    ["a string count", { place: "Khartoum", claimCount: "3" }],
  ] as const;

  for (const [name, properties] of invalidOrbs) {
    test(`${name} cannot produce an orb preview`, () => {
      expect(readMapPreview(properties)).toBeNull();
    });
  }
});

describe("mapPreviewReducer", () => {
  const orb = {
    preview: { kind: "orb" as const, place: "Khartoum", country: "Sudan", claimCount: 3 },
    x: 100,
    y: 80,
    dataKey: null,
  };

  test("pointer movement anchors a preview at the feature", () => {
    const preview = mapPreviewReducer(null, {
      type: "hover",
      properties: { place: "Khartoum", country: "Sudan", claimCount: 3 },
      point: { x: 100, y: 80 },
      dataKey: null,
    });

    expect(preview).toEqual(orb);
  });

  test("an empty map hit clears the previous preview", () => {
    const preview = mapPreviewReducer(orb, {
      type: "hover",
      properties: undefined,
      point: { x: 140, y: 90 },
      dataKey: null,
    });

    expect(preview).toBeNull();
  });

  for (const reason of ["leave", "move"] as const) {
    test(`${reason} replacement clears the previous preview`, () => {
      expect(mapPreviewReducer(orb, { type: "clear", reason })).toBeNull();
    });
  }

  test("a data replacement hides a preview produced for the previous run", () => {
    const previousData = {};
    const nextData = {};
    const previousPreview = { ...orb, dataKey: previousData };

    expect(visibleMapPreview(previousPreview, nextData)).toBeNull();
  });
});
