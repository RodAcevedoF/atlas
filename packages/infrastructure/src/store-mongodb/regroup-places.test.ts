import { describe, expect, test } from "bun:test";
import type { InquiryClaim, InquiryPlace } from "@atlas/domain";
import { regroupPlacesOntoCoordinates } from "./regroup-places.ts";

function claim(text: string): InquiryClaim {
  return {
    text,
    confidence: 0.8,
    sourceUrl: "https://example.test/article",
    sourceTitle: null,
    publishedDate: null,
    sourceImageUrl: null,
  };
}

function place(
  name: string,
  latitude: number,
  longitude: number,
  claims: string[],
  country: string | null = "United States",
): InquiryPlace {
  return {
    place: name,
    country,
    latitude,
    longitude,
    claimCount: claims.length,
    claims: claims.map(claim),
  };
}

describe("regroupPlacesOntoCoordinates", () => {
  test("names the normaliser put on one point become a single place", () => {
    const stored = [
      place("Ross Lake area, near British Columbia and Washington border", 48.7, -121.2, ["a"]),
      place("Ross Lake", 48.7, -121.2, ["b"]),
      place("Ross Lake Campsite", 48.7, -121.2, ["c"]),
    ];

    const regrouped = regroupPlacesOntoCoordinates(stored);

    expect(regrouped).toHaveLength(1);
    expect(regrouped[0].place).toBe("Ross Lake");
    expect(regrouped[0].claims.map((entry) => entry.text)).toEqual(["a", "b", "c"]);
    expect(regrouped[0].claimCount).toBe(3);
  });

  test("two places on their own coordinates are left as they are", () => {
    const stored = [
      place("Tripoli", 34.4, 35.8, ["a"], "Lebanon"),
      place("Tripoli", 32.9, 13.2, ["b"], "Libya"),
    ];

    const regrouped = regroupPlacesOntoCoordinates(stored);

    expect(regrouped.map((entry) => entry.country)).toEqual(["Lebanon", "Libya"]);
  });

  test("the merged place keeps the coordinate its claims were already on", () => {
    const stored = [
      place("Pecos Wilderness area", 36.0, -105.5, ["a"]),
      place("Pecos Wilderness", 36.0, -105.5, ["b"]),
    ];

    const [merged] = regroupPlacesOntoCoordinates(stored);

    expect([merged.latitude, merged.longitude]).toEqual([36.0, -105.5]);
  });

  test("places come back loudest first so the map paints them in that order", () => {
    const stored = [
      place("Fossil", 44.95, -120.05, ["a"]),
      place("Umatilla County", 45.8, -118.5, ["b", "c"]),
      place("Mill Creek Watershed, Umatilla County", 45.8, -118.5, ["d"]),
    ];

    const regrouped = regroupPlacesOntoCoordinates(stored);

    expect(regrouped.map((entry) => [entry.place, entry.claimCount])).toEqual([
      ["Umatilla County", 3],
      ["Fossil", 1],
    ]);
  });

  test("a minor feature cannot label an orb the claims are not about", () => {
    const stored = [
      place("Monte Rittmann", 37.75, 15.0, ["collapse"], "Italy"),
      place("Voragine Crater", 37.75, 15.0, ["a", "b", "c", "d", "e"], "Italy"),
    ];

    const regrouped = regroupPlacesOntoCoordinates(stored);

    expect(regrouped.map((entry) => entry.place)).toEqual(["Voragine Crater"]);
  });

  test("a merged point keeps a country its label does not carry", () => {
    const stored = [
      place("Voragine Crater", 37.75, 15.0, ["a", "b", "c"], null),
      place("Mount Etna", 37.75, 15.0, ["d"], "Italy"),
    ];

    const regrouped = regroupPlacesOntoCoordinates(stored);

    expect(regrouped.map((entry) => [entry.place, entry.country])).toEqual([
      ["Voragine Crater", "Italy"],
    ]);
  });

  test("names of equal length pick the same label every run", () => {
    const stored = [
      place("Central and southern Arkansas", 34.0, -92.5, ["a"]),
      place("Central and Southern Arkansas", 34.0, -92.5, ["b"]),
    ];

    const regrouped = regroupPlacesOntoCoordinates(stored);

    expect(regrouped.map((entry) => entry.place)).toEqual(["Central and Southern Arkansas"]);
  });
});
