import type { InquiryPlaceRecord } from "@/features/inquiry";

export interface ClaimPointProperties {
  place: string;
  country: string | null;
  claimCount: number;
  intensity: number;
}

export type ClaimFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, ClaimPointProperties>;

const EMPTY_POINTS: ClaimFeatureCollection = { type: "FeatureCollection", features: [] };

function intensityOf(claimCount: number, peak: number): number {
  return peak > 0 ? Math.sqrt(claimCount / peak) : 0;
}

export function buildClaimPoints(places: InquiryPlaceRecord[]): ClaimFeatureCollection {
  if (places.length === 0) return EMPTY_POINTS;

  const peak = places.reduce((max, place) => Math.max(max, place.claimCount), 0);

  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [place.longitude, place.latitude] },
      properties: {
        place: place.place,
        country: place.country,
        claimCount: place.claimCount,
        intensity: intensityOf(place.claimCount, peak),
      },
    })),
  };
}
