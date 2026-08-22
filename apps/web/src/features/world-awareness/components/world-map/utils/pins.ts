import type { Topic, WorldEventRecord } from "../../../repositories/world-repository.ts";
import { centroidFor } from "./region-centroids.ts";
import { topicHex } from "./theme-colors.ts";

// A pin's location is its region centroid nudged by a deterministic offset seeded from the
// signal id, so pins in the same region spread out (and stay put across re-renders) without
// implying real geocoding. Clustering collapses the resulting blobs at low zoom.
const JITTER_LNG = 9;
const JITTER_LAT = 5.5;

interface PinProperties {
  id: string;
  color: string;
  topic: Topic;
}

export type PinFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, PinProperties>;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function jitterOffsets(id: string): [number, number] {
  const hash = hashString(id);
  const offsetLng = ((hash & 0xffff) / 0xffff) * 2 - 1;
  const offsetLat = (((hash >>> 16) & 0xffff) / 0xffff) * 2 - 1;
  return [offsetLng, offsetLat];
}

export function buildPinFeatures(events: WorldEventRecord[]): PinFeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.Point, PinProperties>[] = [];
  for (const event of events) {
    const centroid = centroidFor(event.primaryRegion);
    if (!centroid) continue;
    const [offsetLng, offsetLat] = jitterOffsets(event.id);
    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [centroid[0] + offsetLng * JITTER_LNG, centroid[1] + offsetLat * JITTER_LAT],
      },
      properties: { id: event.id, color: topicHex(event.topic), topic: event.topic },
    });
  }
  return { type: "FeatureCollection", features };
}
