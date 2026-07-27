import type { GeoRegion } from "../../../repositories/market-repository.ts";

// Approximate [lng, lat] anchor per region for pin placement. Coordinates are NOT geocoded:
// GDELT DOC 2.0 carries no per-article geo, so a pin sits at its region centroid plus a
// deterministic jitter (see pins.ts). "global" is the aggregate bucket with no location and is
// intentionally absent — those events are not placeable and are skipped from the pin layer.
const REGION_CENTROIDS: Partial<Record<GeoRegion, [number, number]>> = {
  "north-america": [-100, 45],
  "latin-america": [-62, -12],
  europe: [15, 50],
  "middle-east": [45, 30],
  africa: [20, 3],
  asia: [95, 40],
  oceania: [140, -25],
};

export function centroidFor(region: GeoRegion): [number, number] | null {
  return REGION_CENTROIDS[region] ?? null;
}
