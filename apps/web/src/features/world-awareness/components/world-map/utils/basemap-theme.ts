import type { Map as MapLibreMap } from "maplibre-gl";
import { BASEMAP_LAND_LAYERS, BASEMAP_WATER_LAYERS } from "../constants.ts";
import { mapLandHex, mapWaterHex } from "./theme-colors.ts";

const PAINT_KEY_BY_TYPE = {
  background: "background-color",
  fill: "fill-color",
  line: "line-color",
} as const;

function paintLayer(map: MapLibreMap, layerId: string, color: string): void {
  const layer = map.getLayer(layerId);
  if (!layer) return;
  const paintKey = PAINT_KEY_BY_TYPE[layer.type as keyof typeof PAINT_KEY_BY_TYPE];
  if (!paintKey) return;
  map.setPaintProperty(layerId, paintKey, color);
}

export function applyBasemapTheme(map: MapLibreMap): void {
  const land = mapLandHex();
  const water = mapWaterHex();
  for (const layerId of BASEMAP_LAND_LAYERS) paintLayer(map, layerId, land);
  for (const layerId of BASEMAP_WATER_LAYERS) paintLayer(map, layerId, water);
}
