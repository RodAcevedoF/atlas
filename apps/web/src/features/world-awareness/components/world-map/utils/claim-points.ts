import type { InquiryPlaceRecord } from "@/features/inquiry";

export interface ClaimPointProperties {
  place: string;
  country: string | null;
  claimCount: number;
  isCountryLevel: boolean;
}

export type ClaimFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, ClaimPointProperties>;

const EMPTY_POINTS: ClaimFeatureCollection = { type: "FeatureCollection", features: [] };

function isWholeCountry(place: InquiryPlaceRecord): boolean {
  if (!place.country) return false;
  return place.place.trim().toLowerCase() === place.country.trim().toLowerCase();
}

export function peakClaimCount(points: ClaimFeatureCollection): number {
  return points.features.reduce((max, feature) => Math.max(max, feature.properties.claimCount), 0);
}

export function buildClaimPoints(places: InquiryPlaceRecord[]): ClaimFeatureCollection {
  if (places.length === 0) return EMPTY_POINTS;

  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.longitude, place.latitude] },
      properties: {
        place: place.place,
        country: place.country,
        claimCount: place.claimCount,
        isCountryLevel: isWholeCountry(place),
      },
    })),
  };
}
