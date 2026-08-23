import { describe, expect, test } from "bun:test";
import { buildInquiryPlace } from "../../../../inquiry/testing/inquiry-builder.ts";
import { buildClaimPoints, peakClaimCount } from "./claim-points.ts";

describe("buildClaimPoints", () => {
  test("a place becomes a point at the coordinates the server resolved", () => {
    const points = buildClaimPoints([
      buildInquiryPlace({ place: "Khartoum", latitude: 15.5, longitude: 32.56 }),
    ]);

    expect(points.features).toHaveLength(1);
    expect(points.features[0]?.geometry.coordinates).toEqual([32.56, 15.5]);
    expect(points.features[0]?.properties.place).toBe("Khartoum");
  });

  test("a place carries its claim count so cluster and orb sizing share one rule", () => {
    const points = buildClaimPoints([buildInquiryPlace({ claimCount: 25 })]);

    expect(points.features[0]?.properties.claimCount).toBe(25);
  });

  test("a place on the equator plots rather than being read as missing", () => {
    const points = buildClaimPoints([buildInquiryPlace({ latitude: 0, longitude: 0 })]);

    expect(points.features[0]?.geometry.coordinates).toEqual([0, 0]);
  });

  test("no places paints nothing rather than dividing by a zero peak", () => {
    const points = buildClaimPoints([]);

    expect(points.features).toEqual([]);
  });
});

describe("peakClaimCount", () => {
  test("the loudest place sets the peak the intensity ramp normalises against", () => {
    const points = buildClaimPoints([
      buildInquiryPlace({ place: "Sudan", claimCount: 100 }),
      buildInquiryPlace({ place: "Khartoum", claimCount: 25 }),
    ]);

    expect(peakClaimCount(points)).toBe(100);
  });

  test("a run whose places all carry no claims peaks at zero rather than NaN", () => {
    const points = buildClaimPoints([buildInquiryPlace({ claimCount: 0 })]);

    expect(peakClaimCount(points)).toBe(0);
  });

  test("no places peaks at zero", () => {
    expect(peakClaimCount(buildClaimPoints([]))).toBe(0);
  });
});

describe("place granularity", () => {
  test("a place that is its own country carries no precise location", () => {
    const points = buildClaimPoints([buildInquiryPlace({ place: "Brazil", country: "Brazil" })]);

    expect(points.features[0]?.properties.isCountryLevel).toBe(true);
  });

  test("a place inside a country is a precise location", () => {
    const points = buildClaimPoints([buildInquiryPlace({ place: "Khartoum", country: "Sudan" })]);

    expect(points.features[0]?.properties.isCountryLevel).toBe(false);
  });

  test("casing and padding differences do not hide a whole-country place", () => {
    const points = buildClaimPoints([
      buildInquiryPlace({ place: "united states ", country: "United States" }),
    ]);

    expect(points.features[0]?.properties.isCountryLevel).toBe(true);
  });

  test("a place no country could be resolved for is not read as a whole country", () => {
    const points = buildClaimPoints([
      buildInquiryPlace({ place: "Mediterranean Sea", country: null }),
    ]);

    expect(points.features[0]?.properties.isCountryLevel).toBe(false);
  });
});
