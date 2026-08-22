import { describe, expect, test } from "bun:test";
import { buildCountryAwareness } from "../../../../inquiry/testing/inquiry-builder.ts";
import { buildAwarenessPaint, canPaintDistribution } from "./awareness-points.ts";

const GDELT_NAMES_THE_BASEMAP_SPELLS_DIFFERENTLY = [
  "Bosnia-Herzegovina",
  "Central African Republic",
  "Czech Republic",
  "Democratic Republic of the Congo",
  "Dominican Republic",
  "Ivory Coast",
  "Macedonia",
  "Slovak Republic",
  "South Sudan",
  "United States",
];

const COUNTRIES_THE_BASEMAP_DROPS_AT_THIS_RESOLUTION = [
  "Bahrain",
  "Malta",
  "Mauritius",
  "Singapore",
];

describe("buildAwarenessPaint", () => {
  describe("resolving a country onto the basemap", () => {
    test("plots South Sudan, which led the measured Sudan payload under a name the basemap spells 'S. Sudan'", () => {
      const distribution = [buildCountryAwareness({ country: "South Sudan", awareness: 15.66 })];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features.map((feature) => feature.properties.country)).toEqual([
        "South Sudan",
      ]);
    });

    for (const country of GDELT_NAMES_THE_BASEMAP_SPELLS_DIFFERENTLY) {
      test(`plots ${country}, whose GDELT name never matches the basemap by itself`, () => {
        const distribution = [buildCountryAwareness({ country })];

        const paint = buildAwarenessPaint(distribution);

        expect(paint.points.features).toHaveLength(1);
        expect(paint.unmapped).toEqual([]);
      });
    }

    for (const country of COUNTRIES_THE_BASEMAP_DROPS_AT_THIS_RESOLUTION) {
      test(`plots ${country}, which the basemap carries no polygon for`, () => {
        const distribution = [buildCountryAwareness({ country })];

        const paint = buildAwarenessPaint(distribution);

        expect(paint.points.features).toHaveLength(1);
        expect(paint.unmapped).toEqual([]);
      });
    }

    test("reports a country it can place nowhere rather than dropping it from the answer", () => {
      const distribution = [
        buildCountryAwareness({ country: "Sudan" }),
        buildCountryAwareness({ country: "Monaco" }),
      ];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features.map((feature) => feature.properties.country)).toEqual(["Sudan"]);
      expect(paint.unmapped).toEqual(["Monaco"]);
    });
  });

  describe("what earns an orb", () => {
    test("excludes the artifact tier, so a single-article spike never paints as attention", () => {
      const distribution = [
        buildCountryAwareness({ country: "Sudan", awareness: 13.14 }),
        buildCountryAwareness({ country: "Sierra Leone", awareness: 1.39, confidence: "artifact" }),
      ];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features.map((feature) => feature.properties.country)).toEqual(["Sudan"]);
    });

    test("keeps the thin tier, which is dimmed on the map rather than denied", () => {
      const distribution = [
        buildCountryAwareness({ country: "Sudan", awareness: 13.14 }),
        buildCountryAwareness({ country: "Kenya", awareness: 2.01, confidence: "thin" }),
      ];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features.map((feature) => feature.properties.confidence)).toEqual([
        "measured",
        "thin",
      ]);
    });

    test("paints nothing when every measured country is an artifact", () => {
      const distribution = [buildCountryAwareness({ country: "Sudan", confidence: "artifact" })];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features).toEqual([]);
    });
  });

  describe("intensity", () => {
    test("gives the loudest country the full ramp", () => {
      const distribution = [
        buildCountryAwareness({ country: "Sudan", awareness: 13.14 }),
        buildCountryAwareness({ country: "Kenya", awareness: 2.01 }),
      ];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features[0]?.properties.intensity).toBe(1);
    });

    test("square-roots the ramp, so a country at a seventh of the peak still reads above silent", () => {
      const distribution = [
        buildCountryAwareness({ country: "Sudan", awareness: 14 }),
        buildCountryAwareness({ country: "Kenya", awareness: 2 }),
      ];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features[1]?.properties.intensity).toBeCloseTo(Math.sqrt(1 / 7), 5);
    });

    test("excludes artifacts from the peak, so a spike cannot flatten the real ranking", () => {
      const distribution = [
        buildCountryAwareness({ country: "Sudan", awareness: 13.14 }),
        buildCountryAwareness({ country: "Zimbabwe", awareness: 90, confidence: "artifact" }),
      ];

      const paint = buildAwarenessPaint(distribution);

      expect(paint.points.features[0]?.properties.intensity).toBe(1);
    });
  });
});

describe("canPaintDistribution", () => {
  test("offers the map to a run whose measured country the basemap can place", () => {
    const distribution = [buildCountryAwareness({ country: "Sudan" })];

    expect(canPaintDistribution(distribution)).toBe(true);
  });

  test("withholds the map from a run whose only country is an artifact the paint would drop", () => {
    const distribution = [buildCountryAwareness({ country: "Sudan", confidence: "artifact" })];

    expect(canPaintDistribution(distribution)).toBe(false);
  });

  test("withholds the map when every measured country falls off the basemap", () => {
    const distribution = [buildCountryAwareness({ country: "Atlantis" })];

    expect(canPaintDistribution(distribution)).toBe(false);
  });
});
