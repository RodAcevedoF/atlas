import type { GeoJSONSource, LngLat } from "maplibre-gl";
import type { MapRef } from "react-map-gl/maplibre";
import { AWARENESS_SOURCE } from "../constants.ts";

export function expandCluster(map: MapRef, clusterId: number, center: LngLat): void {
  const source = map.getSource(AWARENESS_SOURCE) as GeoJSONSource | undefined;
  if (!source) return;

  source
    .getClusterExpansionZoom(clusterId)
    .then((zoom) => map.easeTo({ center, zoom }))
    .catch((error) => console.error("cluster expansion zoom failed", error));
}
