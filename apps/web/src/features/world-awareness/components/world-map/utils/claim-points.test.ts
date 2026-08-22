import { describe, expect, test } from "bun:test";
import { buildInquiryPlace } from "../../../../inquiry/testing/inquiry-builder.ts";
import { buildClaimPoints } from "./claim-points.ts";

describe("buildClaimPoints", () => {
  test("a place becomes a point at the coordinates the server resolved", () => {
    const points = buildClaimPoints([
      buildInquiryPlace({ place: "Khartoum", latitude: 15.5, longitude: 32.56 }),
    ]);

    expect(points.features).toHaveLength(1);
    expect(points.features[0]?.geometry.coordinates).toEqual([32.56, 15.5]);
    expect(points.features[0]?.properties.place).toBe("Khartoum");
  });

  test("the loudest place reaches full intensity and the rest scale under it", () => {
    const points = buildClaimPoints([
      buildInquiryPlace({ place: "Sudan", claimCount: 100 }),
      buildInquiryPlace({ place: "Khartoum", claimCount: 25 }),
    ]);

    expect(points.features[0]?.properties.intensity).toBe(1);
    expect(points.features[1]?.properties.intensity).toBe(0.5);
  });

  test("a place on the equator plots rather than being read as missing", () => {
    const points = buildClaimPoints([buildInquiryPlace({ latitude: 0, longitude: 0 })]);

    expect(points.features[0]?.geometry.coordinates).toEqual([0, 0]);
  });

  test("no places paints nothing rather than dividing by a zero peak", () => {
    const points = buildClaimPoints([]);

    expect(points.features).toEqual([]);
  });

  test("a run whose places all carry no claims still yields finite intensities", () => {
    const points = buildClaimPoints([buildInquiryPlace({ claimCount: 0 })]);

    expect(points.features[0]?.properties.intensity).toBe(0);
  });
});
