import type { GeoRegion } from "../../repositories/market-repository.ts";

// Maps Natural Earth UN SUBREGION values to the app's GeoRegion taxonomy.
// Region-level for v1; the same lookup is the single swap point for country-level later.
const SUBREGION_TO_REGION: Record<string, GeoRegion> = {
  "Northern America": "north-america",
  "Central America": "latin-america",
  Caribbean: "latin-america",
  "South America": "latin-america",
  "Northern Europe": "europe",
  "Western Europe": "europe",
  "Southern Europe": "europe",
  "Eastern Europe": "europe",
  "Western Asia": "middle-east",
  "Central Asia": "asia",
  "Eastern Asia": "asia",
  "South-Eastern Asia": "asia",
  "Southern Asia": "asia",
  "Northern Africa": "africa",
  "Eastern Africa": "africa",
  "Western Africa": "africa",
  "Middle Africa": "africa",
  "Southern Africa": "africa",
  "Australia and New Zealand": "oceania",
  Melanesia: "oceania",
  Micronesia: "oceania",
  Polynesia: "oceania",
};

export function regionForSubregion(subregion: string | undefined): GeoRegion | null {
  if (!subregion) return null;
  return SUBREGION_TO_REGION[subregion] ?? null;
}

// Inverse lookup: the subregions that make up each mappable region (excludes "global",
// which is the aggregate bucket and has no country polygons). Used to build the MapLibre
// fill expression and the selected-region outline filter.
export const REGION_SUBREGIONS: Record<Exclude<GeoRegion, "global">, string[]> = {
  "north-america": [],
  "latin-america": [],
  europe: [],
  "middle-east": [],
  africa: [],
  asia: [],
  oceania: [],
};

for (const [subregion, region] of Object.entries(SUBREGION_TO_REGION)) {
  if (region !== "global") REGION_SUBREGIONS[region].push(subregion);
}

export const FILL_REGIONS = Object.keys(REGION_SUBREGIONS) as Array<Exclude<GeoRegion, "global">>;
