import type {
  AwarenessConfidence,
  CountryAwarenessRecord,
} from "@/features/inquiry/repositories/inquiry-repository.ts";
import { COUNTRY_CENTROIDS } from "./country-centroids.ts";

const BASEMAP_NAMES: Record<string, string> = {
  "Bosnia-Herzegovina": "Bosnia and Herz.",
  "Central African Republic": "Central African Rep.",
  "Czech Republic": "Czechia",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Dominican Republic": "Dominican Rep.",
  "Ivory Coast": "Côte d'Ivoire",
  Macedonia: "North Macedonia",
  "Slovak Republic": "Slovakia",
  "South Sudan": "S. Sudan",
  "United States": "United States of America",
};

const OFF_BASEMAP_CENTROIDS: Record<string, [number, number]> = {
  Bahrain: [50.55, 26.07],
  Malta: [14.4, 35.9],
  Mauritius: [57.55, -20.28],
  Singapore: [103.82, 1.35],
};

export interface AwarenessPointProperties {
  country: string;
  awareness: number;
  confidence: AwarenessConfidence;
  intensity: number;
}

export type AwarenessFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  AwarenessPointProperties
>;

export interface AwarenessPaint {
  points: AwarenessFeatureCollection;
  /** Measured countries the basemap carries no shape for, so no orb can honestly stand for them. */
  unmapped: string[];
}

const EMPTY_PAINT: AwarenessPaint = {
  points: { type: "FeatureCollection", features: [] },
  unmapped: [],
};

function centroidFor(country: string): [number, number] | undefined {
  const name = BASEMAP_NAMES[country] ?? country;
  return COUNTRY_CENTROIDS[name] ?? OFF_BASEMAP_CENTROIDS[name];
}

function isPlottableCountry(country: string): boolean {
  return centroidFor(country) !== undefined;
}

function measuredCountries(distribution: CountryAwarenessRecord[]): CountryAwarenessRecord[] {
  return distribution.filter((country) => country.confidence !== "artifact");
}

export function hasPlottableCountry(countries: string[]): boolean {
  return countries.some(isPlottableCountry);
}

export function canPaintDistribution(distribution: CountryAwarenessRecord[]): boolean {
  return measuredCountries(distribution).some((country) => isPlottableCountry(country.country));
}

function intensityOf(awareness: number, peak: number): number {
  return peak > 0 ? Math.sqrt(awareness / peak) : 0;
}

export function buildAwarenessPaint(distribution: CountryAwarenessRecord[]): AwarenessPaint {
  const ranked = measuredCountries(distribution);
  if (ranked.length === 0) return EMPTY_PAINT;

  const peak = ranked.reduce((max, country) => Math.max(max, country.awareness), 0);
  const features: GeoJSON.Feature<GeoJSON.Point, AwarenessPointProperties>[] = [];
  const unmapped: string[] = [];

  for (const country of ranked) {
    const centroid = centroidFor(country.country);
    if (!centroid) {
      unmapped.push(country.country);
      continue;
    }
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [centroid[0], centroid[1]] },
      properties: {
        country: country.country,
        awareness: country.awareness,
        confidence: country.confidence,
        intensity: intensityOf(country.awareness, peak),
      },
    });
  }

  return { points: { type: "FeatureCollection", features }, unmapped };
}
